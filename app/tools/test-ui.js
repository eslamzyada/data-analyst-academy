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

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

  // ------------------------------------------------------------ the placement check (runs last: it resets progress)
  async placement(b) {
    await api('POST', '/api/reset', { confirm: 'RESET' });
    await b.goto(`${BASE}/#/`);
    await b.waitFor(`/Start assessment/.test(document.body.innerText)`, { label: 'welcome screen' });
    await b.click('Start assessment');
    await b.waitFor(`/1 of 20/.test(document.body.innerText)`, { label: 'assessment question 1' });
    await pickSomething(b);
    await b.click(/^Next/);
    await b.waitFor(`/2 of 20/.test(document.body.innerText)`, { label: 'assessment question 2' });
    await pickSomething(b);
    await sleep(900);
    await b.reload();
    await b.waitFor(`/of 20/.test(document.body.innerText)`, { label: 'assessment after refresh', timeout: 6000 }).catch(() => {});
    check('placement: a refresh comes back to the same question', /2 of 20/.test(await b.text()), (await b.text()).slice(0, 200));
    check('placement: the chosen answer survives a refresh', await b.evaluate(`!!document.querySelector('.main .item button.option.sel, .item button.option.sel')`));
    await b.click('Back');
    await b.waitFor(`/1 of 20/.test(document.body.innerText)`, { label: 'back to question 1' });
    check('placement: earlier answers are kept too', await b.evaluate(`!!document.querySelector('.item button.option.sel')`));
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
