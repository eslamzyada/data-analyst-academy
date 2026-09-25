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
  server = spawn(process.execPath, ['server/index.js'], { cwd: APP, env: { ...process.env, PORT: String(PORT), ACADEMY_DATA: tmp, ACADEMY_REQUIRE_TEST_DATA: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    await b.type('.formula-bar input', 'C2/');
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

  // ------------------------------------------------------------ the placement check (runs near the end: it resets progress)
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
