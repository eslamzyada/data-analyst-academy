// Browser tests: the learner's view. Starts the app on a throw-away progress database, drives a
// real headless Edge/Chrome, refreshes and restarts in the middle of work, and checks that
// nothing is lost and that every activity ends with a clear next step.
// Run: npm run test:ui
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/browser.js';
const { loadContent, content } = await import('../server/content/index.js');

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadContent(path.join(APP, 'data'));   // model answers, to play the learner who gets it right
const PORT = 7798;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-ui-data-'));
const only = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server = null;
let serverOut = '';
function startServer() {
  server = spawn(process.execPath, ['server/index.js'], { cwd: APP, env: { ...process.env, PORT: String(PORT), ACADEMY_DATA: tmp, ACADEMY_REQUIRE_TEST_DATA: '1', ACADEMY_TEST_FAULTS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { serverOut += d; });
  server.stderr.on('data', (d) => { serverOut += d; });
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return true; } catch { /* not yet */ }
    await sleep(150);
  }
  return false;
}
async function stopServer() {
  if (!server) return;
  const p = server;
  server = null;
  const exited = new Promise((r) => p.once('exit', r));
  p.kill('SIGTERM');
  await Promise.race([exited, sleep(4000)]);
}
async function restartServer() { await stopServer(); startServer(); return waitUp(); }
const api = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && extra ? `  -> ${String(extra).slice(0, 400)}` : ''}`);
}

// ---------------------------------------------------------------- page probes
const inputValue = (b, sel) => b.evaluate(`document.querySelector(${JSON.stringify(sel)})?.value ?? null`);
const waitSaved = (b) => b.waitFor(`/Saved/.test(document.querySelector('.saveflag')?.textContent || '')`, { label: 'the Saved indicator', timeout: 6000 });
const quizProgress = (b) => b.evaluate(`(document.body.innerText.match(/Question (\\d+) of (\\d+)/) || [])[1] || null`);
const quizPrompt = (b) => b.evaluate(`document.querySelector('.main .item .prompt')?.textContent?.trim().slice(0, 80) || null`);

/** Answer whatever question is on screen (first option / a typed value), without checking it. */
async function pickSomething(b) {
  return b.evaluate(`(() => {
    const card = document.querySelector('.main .item') || document.querySelector('.item');
    const opt = card.querySelector('button.option:not([disabled])');
    if (opt) { opt.click(); return 'option:' + opt.textContent.trim().slice(0, 30); }
    return card.querySelector('input[type=text]:not([disabled])') ? 'input' : 'other';
  })()`);
}

const scenarios = {
  // ------------------------------------------------------------ task: refresh, leave, return, restart
  async task(b) {
    const url = `${BASE}/#/task/bp-xl-basics-p3`;
    await b.goto(url);
    await b.waitFor(`!!document.querySelector('.formula-bar input')`, { label: 'formula bar' });
    check('task: the formula box starts empty, so typing "=" as in Excel gives one "=", not two', (await inputValue(b, '.formula-bar input')) === '', await inputValue(b, '.formula-bar input'));
    await b.type('.formula-bar input', '=C2/');
    check('task: typed formula starts with exactly one "="', (await inputValue(b, '.formula-bar input')) === '=C2/', await inputValue(b, '.formula-bar input'));
    await waitSaved(b);
    check('task: typing shows the Saved indicator', true);
    await b.reload();
    await b.waitFor(`document.querySelector('.formula-bar input')?.value === '=C2/'`, { label: 'restored formula', timeout: 5000 }).catch(() => {});
    check('task: answer is back after a refresh', (await inputValue(b, '.formula-bar input')) === '=C2/', await inputValue(b, '.formula-bar input'));
    check('task: the page says the work was put back', /saved and put back/i.test(await b.text()));

    await b.route('#/practice');
    await b.waitFor(`/Practice tasks/.test(document.body.innerText)`, { label: 'practice page' });
    await b.route('#/task/bp-xl-basics-p3');
    await b.waitFor(`document.querySelector('.formula-bar input')?.value === '=C2/'`, { label: 'restored after return', timeout: 5000 }).catch(() => {});
    check('task: answer is still there after leaving and coming back', (await inputValue(b, '.formula-bar input')) === '=C2/', await inputValue(b, '.formula-bar input'));

    // typing and refreshing at once: the save must not depend on the debounce finishing
    await b.type('.formula-bar input', 'D2');
    await b.reload();
    await b.waitFor(`document.querySelector('.formula-bar input')?.value === '=C2/D2'`, { label: 'answer saved on the way out', timeout: 5000 }).catch(() => {});
    check('task: an answer typed just before a refresh is kept', (await inputValue(b, '.formula-bar input')) === '=C2/D2', await inputValue(b, '.formula-bar input'));

    // a hint that was opened stays open
    await b.click('Hint');
    await b.waitFor(`/Hint/.test(document.querySelector('.helptext')?.textContent || '')`, { label: 'hint shown' });
    await waitSaved(b).catch(() => {});
    check('app restarts', await restartServer(), serverOut.slice(-400));
    await b.reload();
    await b.waitFor(`document.querySelector('.formula-bar input')?.value === '=C2/D2'`, { label: 'answer after restart', timeout: 6000 }).catch(() => {});
    check('task: answer survives an app restart', (await inputValue(b, '.formula-bar input')) === '=C2/D2', await inputValue(b, '.formula-bar input'));
    check('task: the opened hint survives an app restart', await b.evaluate(`!!document.querySelector('.helptext')`));

    // finish it: completed, a result, and a way forward on the same screen
    await b.click(/^Check/);
    await b.waitFor(`/Completed/.test(document.querySelector('.donebar')?.textContent || '')`, { label: 'completed bar', timeout: 6000 }).catch(() => {});
    const bar = await b.evaluate(`document.querySelector('.donebar')?.innerText || ''`);
    check('task: shows Completed after a correct answer', /Completed/.test(bar), bar);
    check('task: offers the next step right there', /Next|Continue/.test(bar), bar);
    check('task: offers to try again or review', /Try again|Review/.test(bar), bar);
    await b.reload();
    await b.waitFor(`!!document.querySelector('.donebar')`, { label: 'completed after refresh', timeout: 5000 }).catch(() => {});
    check('task: still shows Completed after a refresh', /Completed/.test(await b.evaluate(`document.querySelector('.donebar')?.innerText || ''`)));
    const before = await b.evaluate('location.hash');
    await b.click(/^(Next|Continue)/, { within: '.donebar' });
    await b.waitFor(`location.hash !== ${JSON.stringify(before)}`, { label: 'navigated to next', timeout: 4000 }).catch(() => {});
    check('task: the next-step button leads somewhere new', (await b.evaluate('location.hash')) !== before, await b.evaluate('location.hash'));
  },

  // ------------------------------------------------------------ a save that fails while leaving a task
  // The app is away (a restart) while the learner types and then leaves the task: the last save on
  // the way out fails too. Once the app is back, that draft must still reach it, and the page must
  // not keep saying it could not save (found by the Codex review: the draft used to wait, unsent,
  // until the tab was closed, and coming back showed the older copy).
  async savefail(b) {
    const url = `${BASE}/#/task/xl-basics-p1`;
    const box = '.formula-bar input';
    await b.goto(url);
    await b.waitFor(`!!document.querySelector('.formula-bar input')`, { label: 'formula bar' });
    await b.type(box, '=C2');
    await waitSaved(b);
    await stopServer();
    await b.type(box, '*2');
    await sleep(1500); // the debounced save tries and fails
    check('saving: while the app is away, the page says it could not save yet', /couldn't save/i.test(await b.evaluate(`document.querySelector('.saveflag')?.textContent || ''`)));
    await b.route('#/practice'); // leaving: the last save on the way out fails as well
    await sleep(800);
    startServer();
    check('app comes back', await waitUp(), serverOut.slice(-400));
    await sleep(4000); // time enough for a retry
    const saved = await api('GET', '/api/state/item%3Axl-basics-p1');
    check('saving: the draft typed while the app was away reaches it once it is back', JSON.stringify(saved.state || {}).includes('=C2*2'), JSON.stringify(saved).slice(0, 200));
    check('saving: the page no longer says it could not save', !/couldn't save/i.test(await b.evaluate(`document.querySelector('.saveflag')?.textContent || ''`)), await b.evaluate(`document.querySelector('.saveflag')?.textContent || ''`));
    await b.route('#/task/xl-basics-p1');
    await b.waitFor(`document.querySelector('.formula-bar input')?.value === '=C2*2'`, { label: 'the newer draft', timeout: 6000 }).catch(() => {});
    check('saving: coming back to the task shows the newer draft', (await inputValue(b, box)) === '=C2*2', await inputValue(b, box));
  },

  // ------------------------------------------------------------ an incorrect answer is not a dead end
  // ------------------------------------------------------------ formula grading: learner mistakes vs app problems
  async formula(b) {
    const answered = async () => (await api('GET', '/api/progress')).stats.answered;
    const box = '.formula-bar input';
    const feedback = () => b.evaluate(`(() => { const f = document.querySelector('.feedback'); return f ? { outcome: f.dataset.outcome, head: f.querySelector('h4')?.innerText || '', text: f.innerText, techOpen: !!f.querySelector('details.tech-details[open]'), hasTech: !!f.querySelector('details.tech-details') } : null; })()`);
    const waitFeedback = (label) => b.waitFor(`!!document.querySelector('.feedback')`, { label, timeout: 8000 });
    const checkNow = async () => { await b.click(/^(Check|Check again|Try checking again)$/); };
    await b.goto(`${BASE}/#/task/xl-basics-p2`);
    await b.waitFor(`!!document.querySelector('${box}')`, { label: 'formula task' });
    const n0 = await answered();

    // 1-4: a valid formula, typed the Excel way
    await b.type(box, '=B2/$B$7');
    check('formula: the box holds what was typed, with one "="', (await inputValue(b, box)) === '=B2/$B$7', await inputValue(b, box));
    await checkNow(); await waitFeedback('first check');
    let fb = await feedback();
    check('formula: a valid formula is marked correct', fb && fb.outcome === 'CORRECT' && /Correct/.test(fb.head), JSON.stringify(fb));

    // 5-6: an equivalent formula (only the row of B7 locked) is accepted too
    await b.click('Try again');
    await b.type(box, '=B2/B$7', { replace: true });
    await checkNow(); await waitFeedback('equivalent');
    fb = await feedback();
    check('formula: an equivalent valid formula is accepted', fb && fb.outcome === 'CORRECT', JSON.stringify(fb));

    // 7-8: a malformed formula is the learner's mistake, and is not dressed up as an app failure
    await b.click('Try again');
    await b.type(box, '=B2/*$B$7', { replace: true });
    await checkNow(); await waitFeedback('malformed');
    fb = await feedback();
    check('formula: a malformed formula says Excel can\'t read it, and why', fb && fb.outcome === 'INCORRECT' && /Excel can't read this formula/.test(fb.head) && /two operators/.test(fb.text), JSON.stringify(fb));
    check('formula: ...and never says the app could not check it', fb && !/couldn't check|problem on our side/i.test(fb.text), fb && fb.text);
    const n1 = await answered();

    // 9-11: the parser fails on a valid formula: "couldn't check", not counted
    // (the equivalent formula, not the model answer: that one is still recognised by its text when the calculator fails)
    await api('POST', '/api/test/faults', { formula: 'parse' });
    await b.type(box, '=B2/B$7', { replace: true });
    await checkNow(); await b.waitFor(`document.querySelector('.feedback')?.dataset.outcome === 'NOT_EVALUABLE'`, { label: 'parser fault', timeout: 8000 }).catch(() => {});
    fb = await feedback();
    check('formula: the parser failing on a valid formula shows "We couldn\'t check this formula automatically"', fb && fb.outcome === 'NOT_EVALUABLE' && /couldn't check this formula automatically/i.test(fb.head), JSON.stringify(fb));
    check('formula: the engine\'s own words are behind "Technical details", closed', fb && fb.hasTech && !fb.techOpen && !/Parsing error/.test(fb.text.replace(/Technical details[\s\S]*$/, '')), JSON.stringify(fb));
    await api('POST', '/api/test/faults', { formula: 'cache' });
    await checkNow(); await b.waitFor(`document.querySelector('.feedback')?.dataset.outcome === 'EVALUATION_ERROR'`, { label: 'cache fault', timeout: 8000 }).catch(() => {});
    fb = await feedback();
    check('formula: an AST-cache failure shows "We couldn\'t check this right now", nothing marked wrong', fb && fb.outcome === 'EVALUATION_ERROR' && /couldn't check this right now/i.test(fb.head) && /nothing has been marked wrong/i.test(fb.text) && !/AST|cache/.test(fb.head + fb.text.replace(/Technical details[\s\S]*$/, '')), JSON.stringify(fb));
    check('formula: answers the app could not check are not counted as attempts', (await answered()) === n1, `${n1} -> ${await answered()}`);

    // 12: once the app works again, the same answer is checked normally and progress is consistent
    await api('POST', '/api/test/faults', { formula: 'ok' });
    await checkNow(); await b.waitFor(`document.querySelector('.feedback')?.dataset.outcome === 'CORRECT'`, { label: 'recovered', timeout: 8000 }).catch(() => {});
    fb = await feedback();
    check('formula: after the fault clears, checking again gives the real verdict', fb && fb.outcome === 'CORRECT', JSON.stringify(fb));
    check('formula: progress counted exactly the four real checks (3 right, 1 malformed)', (await answered()) === n0 + 4, `${n0} -> ${await answered()}`);
    await waitSaved(b).catch(() => {});
    await sleep(600);
    await b.reload();
    await b.waitFor(`!!document.querySelector('.donebar') || !!document.querySelector('.feedback')`, { label: 'after refresh', timeout: 6000 }).catch(() => {});
    check('formula: after a refresh the task shows as completed', /Completed/.test(await b.text()), (await b.text()).slice(0, 300));
  },

  async wrong(b) {
    await b.goto(`${BASE}/#/task/bp-xl-basics-p4`);
    await b.waitFor(`!!document.querySelector('.formula-bar input')`, { label: 'formula bar' });
    await b.type('.formula-bar input', 'C2');
    await b.click(/^Check/);
    await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'feedback' });
    const t = await b.text();
    check('wrong answer: says it is not right', /Not quite/.test(t));
    check('wrong answer: offers to check again', /Check again/.test(t));
    check('wrong answer: offers a way to move on without going back', /Move on|Skip|Next/.test(t), t.slice(-300));
    await b.reload();
    await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'feedback after refresh', timeout: 5000 }).catch(() => {});
    check('wrong answer: result is still shown after a refresh', /Not quite/.test(await b.text()));
  },

  // ------------------------------------------------------------ quiz: refresh mid-question, finish, retry
  async quiz(b) {
    await b.goto(`${BASE}/#/quiz/topic/xl-basics`);
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'quiz loaded' });
    const firstPrompt = await quizPrompt(b);
    // a selection made but not yet checked
    let picked = await pickSomething(b);
    let typed = null;
    if (picked === 'input') { await b.type('.main .item input[type=text]', '42'); picked = 'typed'; typed = await inputValue(b, '.main .item input[type=text]'); }
    await sleep(900);
    await b.reload();
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'quiz after refresh' });
    check('quiz: the same quiz comes back after a refresh', (await quizPrompt(b)) === firstPrompt, `${firstPrompt} / ${await quizPrompt(b)}`);
    const kept = picked === 'typed'
      ? (await inputValue(b, '.main .item input[type=text]')) === typed && /42/.test(typed)
      : await b.evaluate(`!!document.querySelector('.main .item button.option.sel')`);
    check('quiz: an unchecked selection survives a refresh', kept, `${picked} ${typed ?? ''} -> ${await inputValue(b, '.main .item input[type=text]')}`);

    // answer every question, refreshing after the second
    for (let q = 1; q <= 12; q++) {
      if (await b.evaluate(`/See my score/.test(document.body.innerText)`)) break;
      if (await b.evaluate(`!![...document.querySelectorAll('button')].find(x => /^Next question/.test(x.textContent.trim()))`)) await b.click(/^Next question/);
      if (!(await b.evaluate(`!!document.querySelector('.main .item button.option.sel, .main .item button.option.right, .main .item button.option.wrong')`))) {
        const p = await pickSomething(b);
        if (p === 'input') await b.type('.main .item input[type=text]', '1');
      }
      if (await b.evaluate(`!![...document.querySelectorAll('button')].find(x => /^Check/.test(x.textContent.trim()) && !x.disabled)`)) {
        await b.click(/^Check/);
        await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'quiz feedback' });
      }
      if (q === 2) {
        const at = await quizProgress(b);
        await b.reload();
        await b.waitFor(`/Question \\d+ of/.test(document.body.innerText)`, { label: 'quiz after 2nd refresh' });
        check('quiz: the current question survives a refresh', (await quizProgress(b)) === at, `${at} -> ${await quizProgress(b)}`);
        check('quiz: an answered question stays answered after a refresh', await b.evaluate(`!!document.querySelector('.main .item .feedback')`));
      }
      if (q === 3) {
        const at = await quizProgress(b);
        check('quiz: app restarts in the middle of the quiz', await restartServer(), serverOut.slice(-400));
        await b.reload();
        await b.waitFor(`/Question \\d+ of/.test(document.body.innerText)`, { label: 'quiz after restart' });
        check('quiz: after an app restart the quiz is on the same question', (await quizProgress(b)) === at, `${at} -> ${await quizProgress(b)}`);
        check('quiz: after an app restart the answered question is still answered', await b.evaluate(`!!document.querySelector('.main .item .feedback')`));
      }
    }
    await b.click(/^See my score/);
    await b.waitFor(`/Quiz finished/i.test(document.body.innerText)`, { label: 'result screen' });
    const score = await b.evaluate(`document.querySelector('.big-number')?.textContent`);
    check('quiz: finishing shows a score', /%/.test(score || ''), score);
    const resultText = await b.text();
    check('quiz: result offers review, another quiz and a way to continue', /Review/.test(resultText) && /Try another quiz/.test(resultText) && /(Continue|Back to|Next|Practise first|Re-read the lesson)/.test(resultText), resultText.slice(0, 400));
    await b.reload();
    await b.waitFor(`/Quiz finished/i.test(document.body.innerText)`, { label: 'result after refresh', timeout: 5000 }).catch(() => {});
    check('quiz: a finished quiz stays finished after a refresh', /Quiz finished/i.test(await b.text()));
    check('quiz: the score is the same after a refresh', (await b.evaluate(`document.querySelector('.big-number')?.textContent`)) === score);

    await b.click(/Review (my )?answers|Review this quiz/);
    await b.waitFor(`/Your answer/i.test(document.body.innerText)`, { label: 'review screen', timeout: 5000 }).catch(() => {});
    const review = await b.text();
    check('quiz: review shows each question with your answer and the right one', /Your answer/i.test(review) && /Correct answer|Right answer/i.test(review), review.slice(0, 300));

    await b.goto(`${BASE}/#/quiz/topic/xl-basics`);
    await b.waitFor(`/Quiz finished/i.test(document.body.innerText)`, { label: 'result again' });
    await b.click('Try another quiz');
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'fresh quiz' });
    const firstOfNew = await quizPrompt(b);
    check('quiz: another attempt starts a new quiz', firstOfNew !== null);
    const sessions = await api('GET', '/api/quiz-sessions?key=topic:xl-basics');
    const [latest, previous] = sessions.sessions || [];
    const overlap = latest && previous ? latest.itemIds.filter((x) => previous.itemIds.includes(x)).length : -1;
    check('quiz: the new attempt is a different selection', overlap >= 0 && overlap <= 2, JSON.stringify({ overlap, latest: latest?.itemIds, previous: previous?.itemIds }));
    check('quiz: the finished attempt is stored with its score', previous && previous.finishedAt && typeof previous.score === 'number', JSON.stringify(previous));
  },

  // ------------------------------------------------------------ an unchecked formula inside a quiz
  async quizdraft(b) {
    let s = null;
    for (let i = 0; i < 30; i++) {
      s = (await api('POST', '/api/quiz-sessions', { key: 'topic:xl-basics', n: 6 })).session;
      if (s.items.some((x) => x.type === 'formula')) break;
    }
    const k = s.items.findIndex((x) => x.type === 'formula');
    check('quiz draft: a quiz with a formula question was drawn', k >= 0);
    await b.goto(`${BASE}/#/quiz/topic/xl-basics`);
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'quiz loaded' });
    await b.evaluate(`document.querySelectorAll('.quizpip')[${k}].click()`);
    await b.waitFor(`!!document.querySelector('.main .item .formula-bar input')`, { label: 'formula question' });
    await b.type('.main .item .formula-bar input', 'B2*C2');
    const typed = await inputValue(b, '.main .item .formula-bar input');
    await sleep(900);
    await b.reload();
    await b.waitFor(`!!document.querySelector('.main .item .formula-bar input')`, { label: 'formula question after refresh', timeout: 6000 }).catch(() => {});
    check('quiz: the question you moved to is still open after a refresh', (await quizProgress(b)) === String(k + 1), `${k + 1} vs ${await quizProgress(b)}`);
    check('quiz: a formula typed but not checked survives a refresh', /B2\*C2/.test(typed) && (await inputValue(b, '.main .item .formula-bar input')) === typed,
      `${typed} -> ${await inputValue(b, '.main .item .formula-bar input')}`);
  },

  // ------------------------------------------------------------ the quiz inside today's plan
  async today(b) {
    await b.goto(`${BASE}/#/today`);
    await b.waitFor(`/Today's plan/.test(document.body.innerText)`, { label: 'today page' });
    await b.evaluate(`document.querySelector('.card[data-step=quiz] .step button')?.click()`);
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'today quiz' });
    let picked = await pickSomething(b);
    if (picked === 'input') await b.type('.main .item input[type=text]', '7');
    await b.click(/^Check/);
    await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'today quiz feedback' });
    // the checked answer's place is saved in the background: let it land before refreshing, as the other scenarios do
    await sleep(900);
    await b.reload();
    await b.waitFor(`/Today's plan/.test(document.body.innerText)`, { label: 'today after refresh' });
    const open = await b.evaluate(`/Question \\d+ of/.test(document.body.innerText)`);
    if (!open) await b.evaluate(`document.querySelector('.card[data-step=quiz] .step button')?.click()`);
    await b.waitFor(`/Question \\d+ of/.test(document.body.innerText)`, { label: 'today quiz after refresh', timeout: 5000 }).catch(() => {});
    check('today: the plan quiz keeps its answered question after a refresh', await b.evaluate(`!!document.querySelector('.main .feedback')`));
  },

  // ------------------------------------------------------------ SQL Lab and the placement check
  async scratch(b) {
    await b.goto(`${BASE}/#/sql`);
    await b.waitFor(`!!document.querySelector('.cm-content')`, { label: 'sql editor' });
    await b.evaluate(`(() => { const el = document.querySelector('.cm-content'); el.focus(); document.execCommand('selectAll'); return true; })()`);
    await b.type('.cm-content', 'SELECT store_name FROM stores -- my draft');
    await sleep(1500);
    await b.reload();
    await b.waitFor(`/my draft/.test(document.querySelector('.cm-content')?.textContent || '')`, { label: 'sql draft back', timeout: 5000 }).catch(() => {});
    check('sql lab: an unrun query survives a refresh', /my draft/.test(await b.evaluate(`document.querySelector('.cm-content')?.textContent || ''`)));
  },

  // ------------------------------------------------------------ project step drafts
  async project(b) {
    await b.goto(`${BASE}/#/projects/cap-returns`);
    await b.waitFor(`!!document.querySelector('#step-s1 input')`, { label: 'project step' });
    await b.type('#step-s1 input', '10.3');
    await waitSaved(b);
    await b.reload();
    await b.waitFor(`document.querySelector('#step-s1 input')?.value === '10.3'`, { label: 'project draft back', timeout: 5000 }).catch(() => {});
    check('project: a step draft survives a refresh', (await inputValue(b, '#step-s1 input')) === '10.3');
    await b.evaluate(`(() => { const i = document.querySelectorAll('#step-s1 input')[1]; i.focus(); return true; })()`);
    await b.type('#step-s1 input:nth-of-type(1)', '');
    await b.evaluate(`document.querySelectorAll('#step-s1 input')[1].focus()`);
    await b.type('#step-s1 .row:nth-child(2) input', '5.2');
    await b.click(/^Check/, { within: '#step-s1' });
    await b.waitFor(`/Completed/.test(document.querySelector('#step-s1')?.innerText || '')`, { label: 'step completed', timeout: 5000 }).catch(() => {});
    const s1 = await b.evaluate(`document.querySelector('#step-s1')?.innerText || ''`);
    check('project: a checked step says Completed and names the next step', /Completed/.test(s1) && /Next/.test(s1), s1.slice(-200));
  },

  // ------------------------------------------------------------ quick practice keeps its place
  async quick(b) {
    await b.goto(`${BASE}/#/quick`);
    await b.waitFor(`!!document.querySelector('.main .item .prompt')`, { label: 'quick question' });
    const prompt = await quizPrompt(b);
    let picked = await pickSomething(b);
    let typed = null;
    if (picked === 'input') { await b.type('.main .item input[type=text]', '42'); picked = 'typed'; typed = await inputValue(b, '.main .item input[type=text]'); }
    await sleep(900);
    await b.reload();
    await b.waitFor(`!!document.querySelector('.main .item .prompt')`, { label: 'quick after refresh' });
    check('quick practice: the same question comes back after a refresh', (await quizPrompt(b)) === prompt, `${prompt} / ${await quizPrompt(b)}`);
    const kept = picked === 'typed'
      ? (await inputValue(b, '.main .item input[type=text]')) === typed && /42/.test(typed)
      : picked === 'other' ? true : await b.evaluate(`!!document.querySelector('.main .item button.option.sel')`);
    check('quick practice: an unchecked answer survives a refresh', kept, picked);
    if (await b.evaluate(`!![...document.querySelectorAll('.main .item button')].find(x => /^Check/.test(x.textContent.trim()) && !x.disabled)`)) {
      await b.click(/^Check/);
      await b.waitFor(`/Another one/.test(document.body.innerText)`, { label: 'quick answered' });
      const score = await b.evaluate(`document.querySelector('.kpi .v')?.textContent`);
      await b.reload();
      await b.waitFor(`/Another one/.test(document.body.innerText)`, { label: 'quick answered after refresh', timeout: 5000 }).catch(() => {});
      check('quick practice: the checked answer and the session score survive a refresh',
        /Another one/.test(await b.text()) && (await b.evaluate(`document.querySelector('.kpi .v')?.textContent`)) === score, score);
      await b.click('Another one');
      await b.waitFor(`!/Another one/.test(document.body.innerText) && !!document.querySelector('.main .item .prompt')`, { label: 'next quick question' });
      check('quick practice: "Another one" moves on to a new question', true);
    }
  },

  // ------------------------------------------------------------ lesson: complete, then continue
  async lesson(b) {
    await b.goto(`${BASE}/#/topic/xl-logic?tab=learn`);
    await b.waitFor(`/IF, AND, OR/.test(document.body.innerText)`, { label: 'lesson page' });
    await b.click(/Mark (this )?lesson (as )?complete|I've read this lesson/);
    await b.waitFor(`/Lesson completed/i.test(document.body.innerText)`, { label: 'lesson completed', timeout: 5000 }).catch(() => {});
    const t = await b.text();
    check('lesson: shows it is completed', /Lesson completed/i.test(t), t.slice(0, 300));
    check('lesson: offers the next step', /Continue|Next/.test(t));
    await b.reload();
    await b.waitFor(`/Lesson completed/i.test(document.body.innerText)`, { label: 'lesson completed after refresh', timeout: 5000 }).catch(() => {});
    check('lesson: still completed after a refresh', /Lesson completed/i.test(await b.text()));
  },

  // ------------------------------------------------------------ Real Analyst: a tool choice, its verdict, a draft kept
  async analyst(b) {
    await b.goto(`${BASE}/#/analyst`);
    await b.waitFor(`/Real Analyst/.test(document.body.innerText) && /Work requests/.test(document.body.innerText)`, { label: 'real analyst list' });
    check('analyst: the list shows work requests, cross-tool challenges and assessments', /Work requests/.test(await b.text()) && /Cross-tool challenges/.test(await b.text()) && /Mixed assessments/.test(await b.text()));
    await b.goto(`${BASE}/#/analyst/tc-budget-whatif`);
    await b.waitFor(`!!document.querySelector('#part-tools textarea')`, { label: 'first part' });
    check('analyst: a task opens with only its first part', await b.evaluate(`document.querySelectorAll('[id^=part-]').length === 1`));
    await b.click('Excel', { within: '#part-tools' });
    await b.type('#part-tools textarea', 'A few inputs changed live in the meeting, so the CFO can see it clearly.');
    await waitSaved(b);
    await b.reload();
    await b.waitFor(`/live in the meeting/.test(document.querySelector('#part-tools textarea')?.value || '')`, { label: 'draft back', timeout: 5000 }).catch(() => {});
    check('analyst: a draft survives a refresh', /live in the meeting/.test(await inputValue(b, '#part-tools textarea')));
    await b.click(/^Check/, { within: '#part-tools' });
    await b.waitFor(`/Best fit/.test(document.querySelector('#part-tools')?.innerText || '')`, { label: 'tool verdict', timeout: 5000 }).catch(() => {});
    const verdict = await b.evaluate(`document.querySelector('#part-tools')?.innerText || ''`);
    check('analyst: the check shows every tool rated, with the best fit', /Best fit/.test(verdict) && /Scalability/.test(verdict) && /Business need/.test(verdict), verdict.slice(0, 300));
    check('analyst: the next part opens after the check', await b.evaluate(`!!document.querySelector('#part-decide')`));
    await b.reload();
    await b.waitFor(`!!document.querySelector('#part-decide')`, { label: 'still open after refresh', timeout: 5000 }).catch(() => {});
    check('analyst: the verdict and the open part survive a refresh', await b.evaluate(`/Best fit/.test(document.querySelector('#part-tools')?.innerText || '') && !!document.querySelector('#part-decide')`));
  },

  // ------------------------------------------------------------ SQL Lab, as a first-time SQL learner
  async sqllab(b) {
    const editorText = () => b.evaluate(`document.querySelector('.cm-content')?.innerText || ''`);
    const setEditor = (text) => b.evaluate(`(() => { const el = document.querySelector('.cm-content'); el.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, ${JSON.stringify(text)}); return true; })()`);
    const runQuery = async () => { await b.click('Run query'); await sleep(600); };
    const header = () => b.evaluate(`document.querySelector('.db-header')?.innerText || ''`);
    // a first visit: no draft saved by an earlier scenario (on the server or in this browser)
    await api('DELETE', '/api/state/session:sqllab');
    await b.goto(`${BASE}/#/`);
    await b.evaluate(`(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('sqllab:')) localStorage.removeItem(k); return true; })()`);
    await b.goto(`${BASE}/#/sql`);
    await b.waitFor(`!!document.querySelector('.db-header') && !!document.querySelector('.cm-content')`, { label: 'SQL Lab', timeout: 10000 });
    const h = await header();
    check('sqllab: the database is named at the top', /DATABASE/i.test(h) && /Cedarline Outdoor Supply/.test(h), h.slice(0, 200));
    check('sqllab: its status is shown (Connected)', /Connected/.test(h), h.slice(0, 200));
    check('sqllab: the SQL dialect is shown (SQLite)', /SQL dialect:\s*SQLite 3\.\d+/.test(h), h.slice(0, 300));
    check('sqllab: it says how to write a query here (no database name needed)', /no database name/i.test(h), h.slice(0, 300));
    const tables = await b.evaluate(`[...document.querySelectorAll('.db-header .chip')].map((c) => c.textContent)`);
    check('sqllab: the tables are listed', ['customers', 'orders', 'products'].every((t) => tables.includes(t)), JSON.stringify(tables));
    await b.click('View schema');
    await b.waitFor(`!!document.querySelector('.drawer') && /orders/.test(document.querySelector('.drawer').innerText)`, { label: 'schema drawer' });
    await b.evaluate(`[...document.querySelectorAll('.drawer b.mono')].find((x) => x.textContent === 'orders').click()`);
    await sleep(200);
    const drawer = await b.evaluate(`document.querySelector('.drawer').innerText`);
    check('sqllab: the schema shows a table\'s columns with their types and connections', /order_id/.test(drawer) && /customer_id/.test(drawer) && /integer|text|real/i.test(drawer) && /Connects to/.test(drawer), drawer.slice(0, 400));
    await b.evaluate(`document.querySelector('.drawer-bg')?.click()`);
    check('sqllab: a first visit starts with an explained example, not a blank editor', /SELECT \*/.test(await editorText()) && /first 10 rows/.test(await b.text()), await editorText());
    await runQuery();
    const rows = await b.evaluate(`document.querySelectorAll('.main table.data tbody tr').length`);
    check('sqllab: running the example shows rows', rows === 10, String(rows));

    await setEditor('SELECT * FROM orders2');
    await runQuery();
    await b.waitFor(`!!document.querySelector('.sql-error-card')`, { label: 'friendly error', timeout: 6000 }).catch(() => {});
    const err = await b.evaluate(`(() => { const e = document.querySelector('.sql-error-card'); return e ? { kind: e.dataset.kind, text: e.innerText, chips: e.querySelectorAll('.chip').length } : null; })()`);
    check('sqllab: an unknown table gives a friendly error naming it, with the real tables and the likely one', err && err.kind === 'unknown-table' && /orders2/.test(err.text) && /Did you mean/.test(err.text) && err.chips >= 5, JSON.stringify(err));
    check('sqllab: ...with an example and a way back to the editor', err && /Example/.test(err.text) && /Back to the editor/.test(err.text), err && err.text);
    await b.click('Back to the editor');
    await setEditor('SELECT customer_id, full_name FROM customers ORDER BY customer_id LIMIT 5;');
    await runQuery();
    const rows2 = await b.evaluate(`document.querySelectorAll('.main table.data tbody tr').length`);
    check('sqllab: after the error, a correct query runs normally', rows2 === 5 && !(await b.evaluate(`!!document.querySelector('.sql-error-card')`)), String(rows2));

    // the crash that blanked the whole Academy: a binary value in a result
    await setEditor('SELECT randomblob(4) AS b');
    await runQuery();
    const blob = await b.evaluate(`({ root: document.getElementById('root').innerHTML.length, cell: document.querySelector('.main table.data tbody td')?.textContent || '' })`);
    check('sqllab: a binary value in a result is shown as a label and the Academy stays on screen', blob.root > 1000 && /binary data, 4 bytes/.test(blob.cell), JSON.stringify(blob));
    await setEditor('SELECT * FROM orders WHERE 1 = 0');
    await runQuery();
    check('sqllab: a query with no rows says so plainly', /No rows matched/.test(await b.text()));

    // the rest of the Academy still works, and the query is still there on return
    await b.route('#/');
    await b.waitFor(`/Your skills/.test(document.body.innerText)`, { label: 'home after SQL Lab', timeout: 8000 }).catch(() => {});
    check('sqllab: the rest of the Academy keeps working', /Your skills/.test(await b.text()));
    await b.route('#/sql');
    await b.waitFor(`/WHERE 1 = 0/.test(document.querySelector('.cm-content')?.innerText || '')`, { label: 'query kept', timeout: 6000 }).catch(() => {});
    check('sqllab: the query is still there after leaving and coming back', /WHERE 1 = 0/.test(await editorText()), await editorText());

    // an unknown database name in the link never breaks the page
    await b.goto(`${BASE}/#/sql?db=no-such-db`);
    await b.waitFor(`!!document.querySelector('.db-header')`, { label: 'fallback database', timeout: 8000 }).catch(() => {});
    check('sqllab: a link to an unknown database falls back to a real one, with a note', /There is no practice database called "no-such-db"/.test(await b.text()) && /Cedarline/.test(await header()), (await b.text()).slice(0, 300));
    await setEditor('SELECT COUNT(*) AS n FROM customers');
    await runQuery();
    check('sqllab: ...and queries really run against that database', (await b.evaluate(`document.querySelectorAll('.main table.data tbody tr').length`)) === 1 && !(await b.evaluate(`!!document.querySelector('.sql-error-card')`)), await b.text());

    // the practice database becomes unavailable: the problem stays in the result area
    await api('POST', '/api/test/sql-faults', { sql: 'missing' });
    await setEditor('SELECT * FROM customers LIMIT 3');
    await runQuery();
    const down = await b.evaluate(`document.querySelector('.sql-error-card')?.dataset.kind || ''`);
    check('sqllab: an unavailable practice database is reported as such, not as the learner\'s mistake', down === 'unavailable' && /unavailable/i.test(await b.text()) && /not with your query/.test(await b.text()), down);
    await api('POST', '/api/test/sql-faults', { sql: 'ok' });

    // an SQL task says which database it uses
    await b.goto(`${BASE}/#/task/sql-joins-p1`);
    await b.waitFor(`!!document.querySelector('.sql-task-context .chip')`, { label: 'SQL task context', timeout: 8000 }).catch(() => {});
    const ctx = await b.evaluate(`document.querySelector('.sql-task-context')?.innerText || ''`);
    check('sqllab: an SQL task names its database, the dialect and its tables', /Cedarline Outdoor Supply/.test(ctx) && /SQLite/.test(ctx) && /orders/.test(ctx), ctx.slice(0, 200));
  },

  // ------------------------------------------------------------ one page failing never blanks the Academy
  async pageerror(b) {
    await api('POST', '/api/test/break-api', { path: '/api/home' });
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Something went wrong on this page/.test(document.body.innerText)`, { label: 'page error message', timeout: 8000 }).catch(() => {});
    const t = await b.text('body');
    check('pageerror: a page that receives nonsense shows a friendly message', /Something went wrong on this page/.test(t) && /progress are safe/.test(t), t.slice(0, 300));
    check('pageerror: the menu is still there', await b.evaluate(`!!document.querySelector('.sidebar nav a[href="#/learn"]')`));
    await api('POST', '/api/test/break-api', { path: '/api/home', on: false });
    await b.click('Learn', { within: '.sidebar' });
    await b.waitFor(`/Excel/i.test(document.querySelector('.main')?.innerText || '') && !/Something went wrong/.test(document.body.innerText)`, { label: 'learn after error', timeout: 8000 }).catch(() => {});
    check('pageerror: moving to another page works normally again', !/Something went wrong/.test(await b.text('body')) && /Excel/i.test(await b.text()));
  },

  // ------------------------------------------------------------ the placement check (runs last: it resets progress)
  async placement(b) {
    await api('POST', '/api/reset', { confirm: 'RESET' });
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Let's start/.test(document.body.innerText)`, { label: 'welcome screen' });
    const welcome = await b.text('body');
    check('placement: the welcome says it is not a test, and that never-used tools are skipped', /This is not a test/.test(welcome) && /never used/i.test(welcome), welcome.slice(0, 300));
    await b.click("Let's start");
    await b.waitFor(`/How much have you used these tools/.test(document.body.innerText)`, { label: 'tools question' });
    // all four choices in one go, as fast as a script can click (quick clicks once kept only the last)
    await b.evaluate(`(() => {
      const pick = (tool, label) => [...document.querySelectorAll('[data-tool="' + tool + '"] button')].find((x) => x.textContent === label).click();
      pick('excel', 'A little'); pick('sql', 'Never used it'); pick('pq', 'Never used it'); pick('pbi', 'Never used it');
      return true;
    })()`);
    await sleep(300);
    const chosen = await b.evaluate(`[...document.querySelectorAll('[data-tool] button.on')].map((x) => x.closest('[data-tool]').dataset.tool + '=' + x.textContent)`);
    check('placement: quick choices for several tools are all kept', chosen.length === 4 && chosen.includes('excel=A little') && chosen.includes('pbi=Never used it'), JSON.stringify(chosen));
    await b.click(/^Next: a few questions/);
    await b.waitFor(`/Question 1/.test(document.body.innerText) && !!document.querySelector('.item button.option')`, { label: 'assessment question 1' });
    check('placement: it starts with the basics', /Excel: the basics/.test(await b.text('body')), (await b.text('body')).slice(0, 200));
    check('placement: tools marked "never used" are shown as skipped', /SQL · skipped/.test(await b.text('body')) && /Power BI · skipped/.test(await b.text('body')));
    await pickSomething(b);
    await b.click(/^Next/);
    await b.waitFor(`/Question 2/.test(document.body.innerText) && !!document.querySelector('.item button.option')`, { label: 'assessment question 2' });
    await pickSomething(b);
    await sleep(900);
    await b.reload();
    await b.waitFor(`/Question \\d/.test(document.body.innerText) && !!document.querySelector('.item button.option')`, { label: 'assessment after refresh', timeout: 6000 }).catch(() => {});
    check('placement: a refresh comes back to the same question', /Question 2/.test(await b.text('body')), (await b.text('body')).slice(0, 200));
    check('placement: the chosen answer survives a refresh', await b.evaluate(`!!document.querySelector('.item button.option.sel')`));
    await b.click('Back');
    await b.waitFor(`/Question 1/.test(document.body.innerText)`, { label: 'back to question 1' });
    check('placement: earlier answers are kept too', await b.evaluate(`!!document.querySelector('.item button.option.sel')`));
  },

  // ------------------------------------------------------------ a brand-new learner, from the first screen to the second session
  // (runs after the placement check: both start from a reset)
  async newlearner(b) {
    const idkClick = `(() => { const o = [...document.querySelectorAll('.item button.option')].find((x) => /haven't learned this yet/.test(x.textContent)); if (!o) return false; o.click(); return true; })()`;
    // 1-2: open the Academy for the first time (leave the previous page first, so nothing it still
    // saves on the way out lands after the reset)
    await b.goto('about:blank');
    await sleep(800);
    await api('POST', '/api/reset', { confirm: 'RESET' });
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Welcome/.test(document.body.innerText) && /Let's start/.test(document.body.innerText)`, { label: 'welcome' });
    check('journey: a brand-new learner sees the welcome first', true);
    await b.click("Let's start");
    await b.waitFor(`/How much have you used these tools/.test(document.body.innerText)`, { label: 'tools' });
    for (const t of ['excel', 'sql', 'pq', 'pbi']) await b.click('Never used it', { within: `[data-tool="${t}"]` });
    await b.click(/^Next: a few questions/);
    // 3: the diagnostic: a complete beginner answers "I haven't learned this yet"
    let asked = 0;
    for (let i = 0; i < 12; i++) {
      await b.waitFor(`/Here's where you start/.test(document.body.innerText) || !!document.querySelector('.item button.option')`, { label: 'next diagnostic step', timeout: 8000 });
      if (await b.evaluate(`/Here's where you start/.test(document.body.innerText)`)) break;
      asked++;
      await b.evaluate(idkClick);
      await b.click(/^Next/);
      await sleep(250);
    }
    check('journey: for a complete beginner the diagnostic is short: 3 basic questions, nothing advanced', asked === 3, String(asked));
    // 4: a personal starting point, in plain words
    const road = await b.text('body');
    check('journey: the starting point is personal and plain (Excel from its first lesson, Power BI from zero)', /first Excel lesson/.test(road) && /What Power BI is/.test(road), road.slice(0, 500));
    // 5: the first lesson
    await b.click('Start my first lesson');
    await b.waitFor(`/Formulas & cell references/.test(document.body.innerText) && /Mark (this )?lesson (as )?complete/.test(document.body.innerText)`, { label: 'first lesson', timeout: 8000 });
    check('journey: the first lesson is the first Excel topic', /Formulas & cell references/.test(await b.text()));
    await b.click(/Mark (this )?lesson (as )?complete/);
    await b.waitFor(`/Lesson completed/i.test(document.body.innerText)`, { label: 'lesson completed', timeout: 6000 }).catch(() => {});
    check('journey: the lesson is marked completed and offers the next step', /Lesson completed/i.test(await b.text()) && /Continue|Next/.test(await b.text()));
    // 6-9: the first practice task: a wrong answer, then the right one
    const plan = await api('GET', '/api/today');
    const practiceId = plan.steps.find((s) => s.key === 'practice')?.itemId;
    const planChallenge = plan.steps.find((s) => s.key === 'challenge');
    check('journey: the first plan has no Analyst Thinking challenge (only, once the lesson is read, this topic\'s own)',
      !planChallenge || (content.items[planChallenge.itemId]?.skill === 'excel' && content.items[planChallenge.itemId]?.topicId === plan.topicId), JSON.stringify(plan.steps.map((s) => [s.key, s.itemId])));
    await b.goto(`${BASE}/#/task/${practiceId}`);
    await b.waitFor(`!!document.querySelector('.formula-bar input') || !!document.querySelector('.item input[type=text]')`, { label: 'first practice task', timeout: 8000 });
    const model = content.items[practiceId];
    check('journey: the first practice task is an easy formula task', model && model.type === 'formula' && (model.difficulty || 2) <= 2, JSON.stringify(model && [model.id, model.type, model.difficulty]));
    await b.type('.formula-bar input', '=1');
    await b.click(/^Check/);
    await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'feedback on a wrong answer' });
    const fb1 = await b.evaluate(`({ head: document.querySelector('.feedback h4')?.innerText || '', again: !![...document.querySelectorAll('button')].find((x) => /^Check again/.test(x.textContent.trim())) })`);
    check('journey: a wrong answer says "Not quite" and offers to check again', /Not quite/.test(fb1.head) && fb1.again, JSON.stringify(fb1));
    await b.type('.formula-bar input', model.answer, { replace: true });
    await b.click(/^Check again/);
    await b.waitFor(`/Correct/.test(document.querySelector('.feedback h4')?.innerText || '')`, { label: 'correct answer', timeout: 6000 }).catch(() => {});
    const done = await b.text();
    check('journey: the right answer is marked correct and the task completed', /Correct/.test(done) && /Completed/.test(done), done.slice(0, 300));
    // 10: continue to the next activity
    const nextLabel = await b.evaluate(`document.querySelector('.donebar .btn.primary')?.textContent || ''`);
    await b.evaluate(`document.querySelector('.donebar .btn.primary')?.click()`);
    await sleep(600);
    check('journey: "next" leads somewhere new', nextLabel && !(await b.evaluate(`location.hash`)).includes(practiceId), nextLabel);
    // 11-13: a short quiz, a refresh, progress kept
    await b.goto(`${BASE}/#/quiz/topic/xl-basics`);
    await b.waitFor(`/Question 1 of/.test(document.body.innerText)`, { label: 'first quiz' });
    const session = (await api('GET', '/api/quiz-sessions/current?key=topic:xl-basics')).session;
    const qs = session ? session.items : [];
    check('journey: the first quiz keeps to the basics', qs.length > 0 && qs.filter((q) => (q.difficulty || 2) > 2).length <= 1, JSON.stringify(qs.map((q) => q.difficulty)));
    for (let q = 1; q <= 2; q++) {
      if (await b.evaluate(`!![...document.querySelectorAll('button')].find(x => /^Next question/.test(x.textContent.trim()))`)) await b.click(/^Next question/);
      const p = await pickSomething(b);
      if (p === 'input') await b.type('.main .item input[type=text]', '1');
      await b.click(/^Check/);
      await b.waitFor(`!!document.querySelector('.feedback')`, { label: 'quiz feedback' });
    }
    const at = await quizProgress(b);
    await sleep(600);
    await b.reload();
    await b.waitFor(`/Question \\d+ of/.test(document.body.innerText)`, { label: 'quiz after refresh' });
    check('journey: after a refresh the quiz is on the same question, answer kept', (await quizProgress(b)) === at && await b.evaluate(`!!document.querySelector('.main .item .feedback')`), `${at} -> ${await quizProgress(b)}`);
    // 14-15: back to Home: a sensible recommendation
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Your skills/.test(document.body.innerText)`, { label: 'home', timeout: 8000 });
    const home = await b.text();
    check('journey: Home says it is getting to know the learner', /Getting to know your level/.test(home), home.slice(0, 300));
    // the focus card itself (the Excel skill card also names this topic, so the page text alone proves nothing)
    const focusCard = await b.evaluate(`document.querySelector('.main-cta')?.innerText || ''`);
    const homeApi = await api('GET', '/api/home');
    check('journey: Home keeps the learner on the topic in hand (not another tool) and shows no Real Analyst work yet',
      homeApi.focus.topicId === 'xl-basics' && /Formulas & cell references/.test(focusCard) && !/Open the request/.test(home), `${homeApi.focus.topicId} | ${focusCard.slice(0, 200)}`);
    // a topic without a challenge has no Challenge tab; an old link to it opens the lesson
    await b.goto(`${BASE}/#/topic/pbi-intro?tab=challenge`);
    await b.waitFor(`/What Power BI is/.test(document.body.innerText)`, { label: 'pbi intro', timeout: 8000 }).catch(() => {});
    const pbi = await b.evaluate(`({ tabs: [...document.querySelectorAll('.pill-toggle button, .tabs button')].map((x) => x.textContent.trim()), text: document.querySelector('.main')?.innerText || '' })`);
    check('journey: Power BI starts at its introduction, with no dead-end Challenge tab', !pbi.tabs.includes('Challenge') && !/Try the projects/.test(pbi.text) && /What is it\?/i.test(pbi.text), JSON.stringify(pbi.tabs));
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Your skills/.test(document.body.innerText)`, { label: 'home again', timeout: 8000 });
    // 16: continue training
    await b.click('Start today');
    await b.waitFor(`/Today/.test(document.body.innerText) && /Lesson|Practice|Quiz/.test(document.querySelector('.main')?.innerText || '')`, { label: 'today', timeout: 8000 }).catch(() => {});
    check('journey: continuing from Home opens today\'s plan', /Quiz/.test(await b.text()));
  },
};

// ---------------------------------------------------------------- run
let browser;
try {
  startServer();
  check('server starts', await waitUp(), serverOut);
  await api('POST', '/api/profile', { name: 'Tester' });
  await api('POST', '/api/placement/skip', {});
  await api('POST', '/api/topics/xl-logic/unlock', {});
  browser = await launch();
  for (const [name, fn] of Object.entries(scenarios)) {
    if (only.length && !only.includes(name)) continue;
    try { await fn(browser); } catch (e) { check(`${name}: scenario ran to the end`, false, e.message); }
  }
} catch (e) {
  check('no unexpected errors', false, e.stack);
} finally {
  if (browser) await browser.close();
  await stopServer();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length && /Error/i.test(serverOut)) console.log('\nServer output:\n' + serverOut.slice(-2000));
  setTimeout(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } process.exit(failed.length ? 1 : 0); }, 300);
}
