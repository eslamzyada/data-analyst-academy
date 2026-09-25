// End-to-end API test: starts the server on a spare port with a throw-away progress
// database, then exercises every main feature. Run: npm run smoke
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { loadContent, content, toShownAnswer, toStoredAnswer } from '../server/content/index.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 7799;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-smoke-'));
const answers = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'answers.json'), 'utf8'));
// the content, to translate written option positions into the positions the browser shows
loadContent(path.join(APP, 'data'));
const shown = (id, written) => toShownAnswer(content.items[id], written);

let serverOut = '';
function start() {
  const p = spawn(process.execPath, ['server/index.js'], { cwd: APP, env: { ...process.env, PORT: String(PORT), ACADEMY_DATA: tmp, ACADEMY_TEST_FAULTS: '1', ACADEMY_REQUIRE_TEST_DATA: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', (d) => { serverOut += d; });
  p.stderr.on('data', (d) => { serverOut += d; });
  return p;
}
let server = start();

/** Stop and start the app again, the way closing and reopening it would. */
async function restartServer() {
  server.kill();
  await new Promise((r) => setTimeout(r, 600));
  server = start();
  return waitUp();
}

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra && !cond ? '  -> ' + extra : ''}`);
}
async function api(method, url, body, raw) {
  const res = await fetch(BASE + url, {
    method, headers: raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; } catch { return { status: res.status, text }; }
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return true; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

try {
  check('server starts', await waitUp(), serverOut);

  // ---------------------------------------------------------------- first run
  let home = (await api('GET', '/api/home')).json;
  check('home loads, not onboarded yet', home && home.profile && home.profile.onboarded === false);
  check('fresh progress is 0%', home.overall === 0, JSON.stringify(home.overall));
  await api('POST', '/api/profile', { name: 'Islam' });

  const pl = (await api('GET', '/api/placement')).json;
  check('placement asks about 4 tools first, and its questions carry no answers', pl.tools.length === 4 && pl.questions.every((q) => q.answer === undefined), JSON.stringify(pl.tools));
  // a never-used tool is skipped; every tool starts with the basics
  const probe = (await api('POST', '/api/placement/next', { selfReport: { excel: 'never', sql: 'little', pq: 'little', pbi: 'never' }, answers: {} })).json;
  check('PLACEMENT: a tool marked "never used" is skipped, and the first question is a basic one', probe.area === 'sql' && probe.stage === 'Basics' && probe.areas.find((a) => a.area === 'excel').state === 'skipped', JSON.stringify(probe).slice(0, 240));
  check('PLACEMENT: "I haven\'t learned this yet" is offered with every question', probe.question.idkLabel === "I haven't learned this yet");
  // fewer than 2 of the 3 basics right: nothing harder is asked about that tool
  const idkAll = {};
  for (let i = 0; i < 30; i++) {
    const nx = (await api('POST', '/api/placement/next', { selfReport: { excel: 'little', sql: 'never', pq: 'never', pbi: 'never' }, answers: idkAll })).json;
    if (nx.done) break;
    idkAll[nx.question.id] = 'idk';
  }
  const idkIds = Object.keys(idkAll);
  check('PLACEMENT: a beginner answering "I haven\'t learned this yet" only ever sees the basics (3 Excel + 3 thinking questions)', idkIds.length === 6 && idkIds.every((id) => content.items[id].id.startsWith('pl2-') || id === 'pl-th-4'), idkIds.join(','));

  // the full run used below: Excel basics, beginner and intermediate right; SQL basics and beginner
  // right; Analyst Thinking basics and beginner right; Power Query answered "I haven't learned this
  // yet"; Power BI never used. (The same state the rest of this test was written against.)
  const selfReport = { excel: 'regular', sql: 'little', pq: 'little', pbi: 'never' };
  const STAGES = ['Basics', 'Beginner', 'Intermediate', 'Advanced'];
  const firstWrong = { excel: 'Advanced', sql: 'Intermediate', pq: 'Basics', think: 'Intermediate' };
  const plAnswers = {};
  const plAsked = [];
  for (let i = 0; i < 60; i++) {
    const nx = (await api('POST', '/api/placement/next', { selfReport, answers: plAnswers })).json;
    if (nx.done) break;
    plAsked.push(`${nx.area}:${nx.stage}`);
    const id = nx.question.id;
    plAnswers[id] = STAGES.indexOf(nx.stage) < STAGES.indexOf(firstWrong[nx.area]) ? shown(id, content.items[id].answer) : 'idk';
  }
  check('PLACEMENT: questions come easiest first within each tool, and a tool stops at its first missed stage', plAsked[0] === 'excel:Basics' && !plAsked.includes('pq:Beginner') && !plAsked.some((a) => a.startsWith('pbi:')),
    plAsked.join(' '));
  const placed = (await api('POST', '/api/placement', { selfReport, answers: plAnswers })).json;
  check('placement roadmap: Excel Advanced stage', placed.roadmap.excel === 'Advanced', JSON.stringify(placed.roadmap));
  check('placement roadmap: SQL Intermediate stage', placed.roadmap.sql === 'Intermediate', JSON.stringify(placed.roadmap));
  check('placement roadmap: Power BI not started', placed.roadmap.pbi === 'Not started');
  check('PLACEMENT: the starting point is described in plain words for every tool', ['excel', 'sql', 'pq', 'pbi', 'think'].every((k) => typeof placed.roadmapText[k] === 'string' && placed.roadmapText[k].length > 20) && /What Power BI is/.test(placed.roadmapText.pbi), JSON.stringify(placed.roadmapText));
  check('PLACEMENT: "I haven\'t learned this yet" answers are not recorded as wrong answers', placed.results.length === Object.values(plAnswers).filter((a) => a !== 'idk').length && placed.results.every((r) => plAnswers[r.id] !== 'idk'), JSON.stringify(placed.results.length));
  check('placement suggests a start topic', !!placed.startTopic, JSON.stringify(placed));

  home = (await api('GET', '/api/home')).json;
  check('home after placement: onboarded + named', home.profile.onboarded && home.profile.name === 'Islam');
  check('placement credit shows as real progress (>0) but not mastery', home.overall > 0 && home.overall < 40, String(home.overall));
  const excelSkill = home.skills.find((s) => s.id === 'excel');
  check('Excel beginner topics credited, not mastered', excelSkill.progress > 0 && excelSkill.mastered === 0, JSON.stringify(excelSkill));
  check('COLD START: after placement the learner is still new (placement answers only say where to start)', home.phase && home.phase.phase === 'new', JSON.stringify(home.phase));
  check('COLD START: Real Analyst work is not suggested to a new learner, and its page still opens', home.analyst.readiness && home.analyst.readiness.ready === false && (await api('GET', '/api/analyst')).status === 200, JSON.stringify(home.analyst.readiness));

  // ---------------------------------------------------------------- learning path
  const sk = (await api('GET', '/api/skills/sql')).json;
  check('SQL path has at least the 14 original topics', sk.path.length >= 14);
  check('advanced SQL locked for now', sk.path.find((t) => t.id === 'sql-cohorts').status === 'locked');
  const topic = (await api('GET', '/api/topics/sql-joins')).json;
  check('topic has lesson, try-it, practice, challenge', topic.lesson.length > 200 && topic.tryIt && topic.practice.length >= 2 && topic.challenge);
  check('topic content hides answers', !JSON.stringify(topic).includes('LEFT JOIN employees m ON m.employee_id = e.manager_id;'));
  await api('POST', '/api/topics/sql-joins/lesson-done');

  // hints ladder
  const h1 = (await api('POST', '/api/items/sql-joins-p3/help', { level: 1 })).json;
  const h4 = (await api('POST', '/api/items/sql-joins-p3/help', { level: 4 })).json;
  check('hint 1 and full answer available', h1.text && h4.answer && h4.answer.sql);

  // ---------------------------------------------------------------- SQL grading + mistake tracking
  const wrong = (await api('POST', '/api/items/sql-joins-p3/submit', { answer: 'SELECT e.employee_id, e.full_name, m.full_name FROM employees e JOIN employees m ON m.employee_id = e.manager_id;', source: 'practice' })).json;
  check('INNER JOIN trap detected', wrong.correct === false && /LEFT JOIN/.test(wrong.feedback), JSON.stringify(wrong).slice(0, 300));
  check('mistake logged for the trap', wrong.recorded && wrong.recorded.mistakeLogged === true);
  const joinsQ1 = content.items['sql-joins-q1'];
  const wrongShown = [0, 1, 2, 3].find((d) => toStoredAnswer(joinsQ1, d) !== joinsQ1.answer);
  const wrong2 = (await api('POST', '/api/items/sql-joins-q1/submit', { answer: wrongShown, source: 'quiz' })).json;
  check('quiz wrong answer returns explanation + correct option (in the order shown)', wrong2.correct === false && wrong2.explain && wrong2.answer && wrong2.answer.option === shown('sql-joins-q1', joinsQ1.answer));

  // options are shown in a fixed order of their own, and the shown position is what is graded
  {
    const it = content.items['sql-joins-q1'];
    const a1 = (await api('GET', '/api/items/sql-joins-q1')).json;
    const a2 = (await api('GET', '/api/items/sql-joins-q1')).json;
    check('OPTIONS: a question shows the same option order every time', JSON.stringify(a1.options) === JSON.stringify(a2.options));
    check('OPTIONS: the shown options are the written ones, reordered', JSON.stringify([...a1.options].sort()) === JSON.stringify([...it.options].sort()));
    const rightShown = a1.options.indexOf(it.options[it.answer]);
    const ok = (await api('POST', '/api/items/sql-joins-q1/submit', { answer: rightShown, source: 'quiz' })).json;
    check('OPTIONS: choosing the right option where it is shown is marked correct', ok.correct === true, JSON.stringify(ok).slice(0, 200));
    const positions = new Set(Object.values(content.items).filter((x) => x.type === 'mc').map((x) => toShownAnswer(x, x.answer)));
    check('OPTIONS: across the bank the right answer appears in every position', positions.size >= 4, JSON.stringify([...positions]));
  }
  const mistakes = (await api('GET', '/api/mistakes')).json;
  check('mistakes are grouped by concept', mistakes.open.some((m) => m.concept === 'left-join'), JSON.stringify(mistakes.open));

  const right = (await api('POST', '/api/items/sql-joins-p3/submit', { answer: 'select e.employee_id, e.full_name, m.full_name as boss from employees e left join employees m on e.manager_id = m.employee_id', source: 'practice' })).json;
  check('correct SQL (different style) accepted', right.correct === true, JSON.stringify(right).slice(0, 300));
  const colsSwapped = (await api('POST', '/api/items/sql-groupby-try/submit', { answer: "SELECT COUNT(*) n, channel FROM orders WHERE status='completed' AND order_date >= '2025-01-01' AND order_date < '2026-01-01' GROUP BY channel", source: 'tryit' })).json;
  check('SQL with columns in a different order accepted', colsSwapped.correct === true, JSON.stringify(colsSwapped).slice(0, 300));
  const unrounded = (await api('POST', '/api/items/sql-aggregate-ch/submit', { answer: "SELECT SUM(net_sales), SUM(qty_sold), SUM(net_sales)*1.0/SUM(qty_sold) FROM daily_sales WHERE sale_date LIKE '2026-07-%'", source: 'challenge' })).json;
  check('unrounded numbers still match a rounded answer', unrounded.correct === true, JSON.stringify(unrounded).slice(0, 300));
  const bad = (await api('POST', '/api/sql/run', { db: 'cedarline', sql: 'SELECT nope FROM orders' })).json;
  check('SQL errors come back in plain language', bad.ok === false && /Check the spelling/.test(bad.error), JSON.stringify(bad));
  const multi = (await api('POST', '/api/sql/run', { db: 'cedarline', sql: 'SELECT 1; SELECT 2;' })).json;
  check('only one statement at a time', multi.ok === false);
  const del = (await api('POST', '/api/sql/run', { db: 'cedarline', sql: 'DELETE FROM orders' })).json;
  const after = (await api('POST', '/api/sql/run', { db: 'cedarline', sql: 'SELECT COUNT(*) FROM orders' })).json;
  check('practice database cannot be damaged (changes are rolled back)', del.ok && after.rows[0][0] === 11550, JSON.stringify(after));
  const slow = (await api('POST', '/api/sql/run', { db: 'restaurant', sql: 'SELECT COUNT(*) FROM daily_sales a, daily_sales b, daily_sales c' })).json;
  check('runaway query is stopped', slow.ok === false && /8 seconds/.test(slow.error), JSON.stringify(slow));
  const ok2 = (await api('POST', '/api/sql/run', { db: 'hr', sql: 'SELECT COUNT(*) FROM employees' })).json;
  check('SQL runner recovers after a stopped query', ok2.ok && ok2.rows[0][0] > 1000, JSON.stringify(ok2));
  const dbs = (await api('GET', '/api/sql/dbs')).json;
  check('SQL Lab lists 3 databases with tables and columns', dbs.length === 3 && dbs.every((d) => d.tables.length && d.tables[0].columns.length));

  // ---------------------------------------------------------------- formula grading
  const f1 = (await api('POST', '/api/items/xl-basics-p1/submit', { answer: '=C2*(1+G1)', source: 'practice' })).json;
  check('formula without $ fails after copying down, with a $ hint', f1.correct === false && /\$/.test(f1.feedback), JSON.stringify(f1).slice(0, 300));
  const f2 = (await api('POST', '/api/items/xl-basics-p1/submit', { answer: '=C2+C2*$G$1', source: 'practice' })).json;
  check('different correct formula accepted', f2.correct === true, JSON.stringify(f2).slice(0, 300));
  const f3 = (await api('POST', '/api/items/xl-xlookup-try/submit', { answer: '=INDEX(C2:C7,MATCH(F2,A2:A7,0))', source: 'tryit' })).json;
  check('INDEX/MATCH accepted where XLOOKUP was taught', f3.correct === true, JSON.stringify(f3).slice(0, 300));
  const f4 = (await api('POST', '/api/items/xl-sumifs-try/submit', { answer: '=SUMIFS(D2:D11;B2:B11;"West";C2:C11;"Online")', source: 'tryit' })).json;
  check('semicolon separators (non-English Excel) accepted', f4.correct === true, JSON.stringify(f4).slice(0, 300));
  const f5 = (await api('POST', '/api/items/xl-basics-q5/submit', { answer: '422.5', source: 'quiz' })).json;
  check('typed-in number instead of formula is not accepted', f5.correct === false);
  const f6 = (await api('POST', '/api/items/xl-dynamic-p1/submit', { answer: '=FILTER(A2:A11,D2:D11>=500)', source: 'practice' })).json;
  check('dynamic array (FILTER spill) graded', f6.correct === true && Array.isArray(f6.spill), JSON.stringify(f6).slice(0, 300));
  const f7 = (await api('POST', '/api/items/xl-sumifs-p3/submit', { answer: ['13154.86', '20', '245.38', '11685.87', '392', 'January'], source: 'practice' })).json;
  check('typed multi-answer task graded (month written as a word)', f7.correct === true, JSON.stringify(f7).slice(0, 400));

  // ---------------------------------------------------------------- Excel upload
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(APP, 'data', 'files', 'excel', 'summit_coffee_sales.xlsx'));
  const ws = wb.getWorksheet('Answers');
  const exp = answers['xl-file-summit'];
  exp.forEach((v, i) => { ws.getCell(5 + i, 3).value = i === 0 ? { formula: 'SUM(1,1)', result: v } : v; });
  ws.getCell(5 + 5, 3).value = 1; // one deliberately wrong answer
  const buf = await wb.xlsx.writeBuffer();
  const up = (await api('POST', '/api/items/xl-basics-ch/upload?source=challenge', Buffer.from(buf), true)).json;
  check('uploaded workbook graded from the Answers sheet (5 of 6)', up.correct === false && up.parts.filter((p) => p.correct).length === 5, JSON.stringify(up).slice(0, 400));
  check('formula results are read from the saved values', up.parts[0].correct === true);
  const notXlsx = await api('POST', '/api/items/xl-basics-ch/upload', Buffer.from('hello'), true);
  check('a non-Excel upload gets a friendly error', notXlsx.status === 400 && /xlsx/.test(notXlsx.json.error));

  // ---------------------------------------------------------------- open answers
  const open = (await api('POST', '/api/items/think-trust-ch/submit', { answer: 'Compare with the same month last year for seasonality, check margin and discounts, big orders, target, and duplicates.', source: 'challenge' })).json;
  check('written answer: checklist points detected', open.selfCheck && open.detected.filter((d) => d.detected).length >= 4, JSON.stringify(open.detected));
  const sc = (await api('POST', '/api/items/think-trust-ch/selfcheck', { answer: 'x', ticks: [true, true, true, true, false] })).json;
  check('self-check scored', Math.abs(sc.score - 0.8) < 1e-9);

  // ---------------------------------------------------------------- today, quick, quizzes, cards, exams
  const today = (await api('GET', '/api/today')).json;
  check('today plan has learn/practice/quiz/challenge', ['learn', 'quiz'].every((k) => today.steps.some((s) => s.key === k)) && today.steps.length >= 3, JSON.stringify(today.steps));
  check('today focuses on the repeated JOIN mistakes', today.mode === 'fix' || today.topicId === 'sql-joins', `${today.mode} ${today.topicId} ${today.reason}`);
  const qi = (await api('POST', '/api/today/quiz-items', { ids: today.steps.find((s) => s.key === 'quiz').itemIds })).json;
  check('today quiz items load', qi.items.length >= 3);
  const quick = (await api('GET', '/api/quick')).json;
  check('quick practice returns one item', quick.item && quick.item.id);
  const quizzes = (await api('GET', '/api/quizzes')).json;
  check('quiz hub lists exams and topic quizzes', quizzes.exams.length === 9 && quizzes.bySkill.length === 5);
  const cards = (await api('GET', '/api/cards')).json;
  check('flashcards available', cards.cards.length > 0);
  const cr = (await api('POST', `/api/cards/${cards.cards[0].id}`, { knew: true })).json;
  check('flashcard review stored', cr.ok && cr.box === 1);
  const exam = (await api('GET', '/api/exams/exam-sql-b')).json;
  check('exam draws 12 questions without answers', exam.items.length === 12 && !JSON.stringify(exam.items).includes('"answer"'));
  const examAns = {};
  for (const q of exam.items) {
    const reveal = (await api('POST', `/api/items/${q.id}/help`, { level: 4 })).json.answer;
    if (!reveal) continue;
    examAns[q.id] = reveal.option ?? reveal.value ?? reveal.order ?? reveal.text ?? reveal.sql ?? reveal.number ?? reveal.formula;
  }
  const er = (await api('POST', '/api/exams/exam-sql-b', { answers: examAns, total: exam.items.length })).json;
  check('perfect exam passes', er.passed === true && er.score === 1, JSON.stringify({ score: er.score, weak: er.weak, fails: er.results.filter((r) => !r.correct).map((r) => r.id) }));

  // ---------------------------------------------------------------- projects
  // ---------------------------------------------------------------- quiz variety
  const { resolveGenerated } = await import('../server/content/generated.js');
  const q1 = (await api('GET', '/api/topics/xl-basics/quiz?n=6')).json.items;
  const q2 = (await api('GET', '/api/topics/xl-basics/quiz?n=6')).json.items;
  const q3 = (await api('GET', '/api/topics/xl-basics/quiz?n=6')).json.items;
  const overlap = q1.filter((a) => q2.some((b) => b.id === a.id)).length;
  check('the next quiz on a topic is a different selection', overlap <= 2, `overlap ${overlap}: ${q1.map((x) => x.id)} / ${q2.map((x) => x.id)}`);
  // xl-basics has 13 bank questions; three quizzes take 5 each plus one fresh-number question, so
  // at least 2 bank repeats are forced. Allow one more than that; back-to-back overlap is checked above.
  check('three quizzes in a row show at least 13 different questions', new Set([...q1, ...q2, ...q3].map((x) => x.id)).size >= 13, JSON.stringify([q1, q2, q3].map((q) => q.map((x) => `${x.id}:${x.style}:${x.difficulty}`))));
  check('a quiz mixes question styles', new Set(q1.map((x) => x.style)).size >= 3, JSON.stringify(q1.map((x) => x.style)));
  check('a quiz is not mostly true/false', q1.filter((x) => x.type === 'tf').length <= 2);
  const gen = q1.find((x) => x.id.startsWith('g.'));
  check('a quiz includes a question with fresh numbers', !!gen, JSON.stringify(q1.map((x) => x.id)));
  check('quiz questions carry no answers', q1.every((x) => x.answer === undefined && x.explain === undefined));
  if (gen) {
    const truth = resolveGenerated(gen.id, {});
    const genRight = (await api('POST', `/api/items/${gen.id}/submit`, { answer: String(truth.answer), source: 'quiz' })).json;
    check('a generated question grades its right answer as correct', genRight.correct === true && !!genRight.explain, JSON.stringify(genRight).slice(0, 200));
    const genWrong = (await api('POST', `/api/items/${gen.id}/submit`, { answer: String(truth.answer + 7), source: 'quiz' })).json;
    check('a generated question grades a wrong answer as wrong', genWrong.correct === false, JSON.stringify(genWrong).slice(0, 200));
  }
  const rq = (await api('GET', '/api/review-quiz?n=8')).json;
  check('mixed review returns 8 questions from practised topics', rq.items.length === 8, String(rq.items.length));
  check('mixed review leans on the topics with open mistakes', rq.items.some((x) => ['sql-joins', 'sql-multijoins'].includes(x.topicId)), JSON.stringify(rq.items.map((x) => x.topicId)));

  const projs = (await api('GET', '/api/projects')).json;
  check('12 projects across business areas', projs.length === 12, JSON.stringify(projs.map((p) => p.id)));
  check('every project says how long it takes', projs.every((p) => p.minutes > 0), JSON.stringify(projs.map((p) => [p.id, p.minutes])));
  check('projects cover several business areas', new Set(projs.map((p) => p.business)).size >= 5, JSON.stringify([...new Set(projs.map((p) => p.business))]));

  // the new projects must grade their own known-correct answers
  const retKey = answers['cap-returns'];
  const ret1 = (await api('POST', '/api/projects/cap-returns/steps/s1', { answer: [String(retKey.onlinePct), String(retKey.inStorePct)] })).json;
  check('returns project step grades its own answer', ret1.score === 1, JSON.stringify(ret1));
  const ret5 = (await api('POST', '/api/projects/cap-returns/steps/s5', { answer: 2 })).json;
  check('returns project reasoning step grades', ret5.score === 1 && !!ret5.explain, JSON.stringify(ret5));
  const wrongRet = (await api('POST', '/api/projects/cap-returns/steps/s1', { answer: ['99', '1'] })).json;
  check('a wrong project answer is not marked correct', wrongRet.score < 1, JSON.stringify(wrongRet));
  const ngo1 = (await api('POST', '/api/projects/cap-ngo/steps/s2', { answer: [String(answers['cap-ngo'].top10Share), String(answers['cap-ngo'].topDonorTotal)] })).json;
  check('NGO project step grades its own answer', ngo1.score === 1, JSON.stringify(ngo1));
  const cr1 = (await api('POST', '/api/projects/cap-restaurant/steps/s1', { answer: [String(answers['cap-restaurant'].foodCostBefore), '28.1'] })).json;
  check('project numbers step graded (tolerance)', cr1.score === 1, JSON.stringify(cr1));
  const cr5 = (await api('POST', '/api/projects/cap-restaurant/steps/s5', { answer: 0 })).json;
  check('project choice step graded', cr5.score === 0 && cr5.explain);
  const sw = answers['cap-swiftline'];
  const sw1 = (await api('POST', '/api/projects/cap-swiftline/steps/s1', { answer: [String(sw.group.runs), String(sw.group.parcels)] })).json;
  check('logistics project step grades its own answer', sw1.score === 1, JSON.stringify(sw1));
  const swFooter = (await api('POST', '/api/projects/cap-swiftline/steps/s1', { answer: [String(sw.group.runs + 1), String(sw.group.parcels)] })).json;
  check('leaving the totals row in is marked wrong', swFooter.score < 1, JSON.stringify(swFooter));
  const mk = answers['cap-marketing'];
  const mk2 = (await api('POST', '/api/projects/cap-marketing/steps/s2', { answer: [String(mk.searchRoas), String(mk.socialRoas)] })).json;
  check('marketing project step grades its own answer', mk2.score === 1, JSON.stringify(mk2));
  const pf4 = (await api('POST', '/api/projects/cap-profit/steps/s4', { answer: [String(answers['cap-profit'].worstBreakEven)] })).json;
  check('profitability break-even step grades its own answer', pf4.score === 1, JSON.stringify(pf4));
  const sa5 = (await api('POST', '/api/projects/cap-sales/steps/s5', { answer: [answers['cap-sales'].peakMonth, String(answers['cap-sales'].peakMonthSales), String(answers['cap-sales'].troughMonthSales)] })).json;
  check('a month answer is graded as a month', sa5.score === 1, JSON.stringify(sa5));

  // ---------------------------------------------------------------- progress + honesty
  const prog = (await api('GET', '/api/progress')).json;
  check('progress page data', prog.level && prog.skills.length === 5 && Array.isArray(prog.topics));
  check('nothing is "mastered" after one session', prog.topics.every((t) => t.status !== 'mastered'));
  check('level stays honest (Level 1 or 2)', prog.level.level.n <= 2, JSON.stringify(prog.level.level));
  const ds = (await api('GET', '/api/datasets/cedarline-q2/preview?limit=5')).json;
  check('dataset preview works (xlsx with title rows)', ds.columns[0] === 'LineID' && ds.rows.length === 5, JSON.stringify(ds).slice(0, 200));
  const dl = await fetch(BASE + '/files/excel/summit_coffee_sales.xlsx');
  check('file download works', dl.ok && Number(dl.headers.get('content-length')) > 5000);
  const backup = await fetch(BASE + '/api/backup');
  check('progress backup download works', backup.ok);

  // ---------------------------------------------------------------- saved work survives everything
  const draftKey = 'item:xl-logic-p1';
  await api('PUT', `/api/state/${draftKey}`, { state: { answer: '=SUM(C2:C9', hints: 1, seconds: 42, status: 'in-progress', itemId: 'xl-logic-p1' } });
  let draft = (await api('GET', `/api/state/${draftKey}`)).json;
  check('a half-typed answer is saved', draft.state && draft.state.answer === '=SUM(C2:C9' && draft.state.hints === 1, JSON.stringify(draft));

  await api('PUT', '/api/state/quiz:t-xl-basics', { state: { answers: { q1: 2, q2: 0 }, index: 2, status: 'in-progress' } });
  await api('PUT', '/api/state/session:place', { state: { route: '/topic/xl-b-formulas', label: 'Formulas & cell references' } });

  // the real test: stop the app and start it again
  check('app restarts', await restartServer(), serverOut.slice(-800));
  draft = (await api('GET', `/api/state/${draftKey}`)).json;
  check('the half-typed answer is still there after a restart', draft.state && draft.state.answer === '=SUM(C2:C9' && draft.state.seconds === 42, JSON.stringify(draft));
  const quizDraft = (await api('GET', '/api/state/quiz:t-xl-basics')).json;
  check('quiz answers survive a restart', quizDraft.state && quizDraft.state.index === 2 && quizDraft.state.answers.q1 === 2, JSON.stringify(quizDraft));

  const resume = (await api('GET', '/api/session/resume')).json;
  check('the app knows where the learner was', resume.place && resume.place.route === '/topic/xl-b-formulas', JSON.stringify(resume.place));
  check('unfinished work is listed', resume.unfinished.some((u) => u.key === draftKey), JSON.stringify(resume.unfinished.map((u) => u.key)));

  await api('PUT', '/api/state/project:cap-waste', { state: { drafts: { s1: ['Airport', ''] }, hints: {}, ticks: {} } });
  const homeLinks = (await api('GET', '/api/home')).json.unfinished;
  check('home offers to carry on with an unfinished task', homeLinks.some((u) => u.to === '/task/xl-logic-p1'), JSON.stringify(homeLinks));
  check('home offers to carry on with an unfinished project', homeLinks.some((u) => u.to === '/projects/cap-waste' && u.kind === 'Project'), JSON.stringify(homeLinks));
  // earlier in this run a quiz question (sql-joins-q1) was answered wrongly and a generated one was answered
  check('quiz questions never appear as unfinished tasks', homeLinks.every((u) => !u.to.includes('sql-joins-q1') && !u.to.startsWith('/task/g.')), JSON.stringify(homeLinks));
  const projList = (await api('GET', '/api/projects')).json;
  check('a project with a saved draft shows as in progress', projList.find((p) => p.id === 'cap-waste').status === 'in-progress');

  // practice library
  await api('PUT', '/api/state/item:bp-xl-logic-p3', { state: { itemId: 'bp-xl-logic-p3', answer: '=IF(', status: 'in-progress' } });
  const lib = (await api('GET', '/api/practice')).json;
  check('every practice task has one of the five lifecycle states', lib.tasks.every((t) => ['not-started', 'in-progress', 'submitted', 'evaluated', 'completed'].includes(t.status) && typeof t.stateLabel === 'string'));
  check('practice covers at least 8 business areas', new Set(lib.tasks.map((t) => t.business).filter(Boolean)).size >= 8, JSON.stringify([...new Set(lib.tasks.map((t) => t.business))]));
  check('the drafted task shows as in progress in the library', lib.tasks.find((t) => t.id === 'bp-xl-logic-p3').status === 'in-progress', JSON.stringify(lib.tasks.find((t) => t.id === 'bp-xl-logic-p3').status));
  await api('PUT', '/api/state/item:xl-basics-p1', { state: { answer: '=SUM(C2:C9', itemId: 'xl-basics-p1' } });
  const lib1b = (await api('GET', '/api/practice')).json;
  check('a solved task stays completed even with a newer draft', lib1b.tasks.find((t) => t.id === 'xl-basics-p1').status === 'completed');
  check('a solved task with a newer draft is not offered as unfinished', !(await api('GET', '/api/home')).json.unfinished.some((u) => u.to === '/task/xl-basics-p1'));
  const nxt = (await api('GET', '/api/practice/next?after=xl-basics-p1')).json;
  check('finishing a task suggests what to do next', nxt.next && typeof nxt.next.to === 'string' && nxt.next.label, JSON.stringify(nxt));

  // progress made before the restart is still there
  const progAfter = (await api('GET', '/api/progress')).json;
  check('progress survives a restart', progAfter.level && progAfter.topics.length === prog.topics.length);

  // submitting stores the answer on the server, not just in the browser
  await api('POST', '/api/items/xl-basics-try/submit', { answer: '=B2*C9999', source: 'practice', hints: 0, seconds: 12 });
  const stored = (await api('GET', '/api/state/item:xl-basics-try')).json;
  check('a submitted answer is kept by the server itself', stored.state && stored.state.answer === '=B2*C9999' && !!stored.state.result, JSON.stringify(stored).slice(0, 220));
  check('a wrong submitted answer is stored as INCORRECT, not completed', stored.state && stored.state.result.outcome === 'INCORRECT' && stored.state.result.correct === false, JSON.stringify(stored.state && stored.state.result));

  // a completed activity stops being "unfinished"
  await api('PUT', `/api/state/${draftKey}`, { state: { answer: '=C2+C2*$G$1', result: { outcome: 'CORRECT', correct: true, score: 1 }, itemId: 'xl-logic-p1' } });
  const resume2 = (await api('GET', '/api/session/resume')).json;
  check('completed work drops off the unfinished list', !resume2.unfinished.some((u) => u.key === draftKey) && !resume2.links.some((u) => u.to === '/task/xl-logic-p1'));

  // ================================================================ QUIZ ATTEMPTS
  // A quiz lives on the server: refresh and restart come back to it, finished stays finished,
  // review rebuilds it, and a new attempt draws different questions.
  const QK = 'topic:xl-basics';
  const reveal = async (id) => (await api('POST', `/api/items/${id}/help`, { level: 4 })).json.answer;
  const valueOf = (a) => (a ? a.option ?? a.value ?? a.order ?? a.number ?? a.text ?? a.formula ?? a.sql : null);
  const wrongFor = (it, right) => (it.type === 'tf' ? !right : it.type === 'mc' ? (Number(right) + 1) % it.options.length
    : it.type === 'number' ? String(Number(right) + 12345) : it.type === 'order' ? [...right].reverse() : it.type === 'formula' ? '=1' : it.type === 'sql' ? 'SELECT 1' : 'zzz-wrong');
  const o1 = (await api('POST', '/api/quiz-sessions/open', { key: QK, n: 6 })).json;
  const s1 = o1.session;
  check('QUIZ: opening a topic quiz starts an attempt with 6 questions and no answers', s1 && s1.items.length === 6 && o1.resumed === false && !JSON.stringify(s1.items).includes('"answer"'), JSON.stringify(o1).slice(0, 300));
  check('QUIZ: every question in it has a reason for being chosen', s1.itemIds.every((id) => typeof s1.reasons[id] === 'string'), JSON.stringify(s1.reasons));
  const o1b = (await api('POST', '/api/quiz-sessions/open', { key: QK, n: 6 })).json;
  check('QUIZ: refresh during a quiz returns the same attempt and the same questions', o1b.session.id === s1.id && o1b.session.itemIds.join() === s1.itemIds.join());

  const [qa, qb, qc] = s1.items;
  const rightA = valueOf(await reveal(qa.id));
  const ra = (await api('POST', `/api/items/${qa.id}/submit`, { answer: qa.type === 'number' ? String(rightA) : rightA, source: 'quiz', session: s1.id })).json;
  const rightB = valueOf(await reveal(qb.id));
  const rb = (await api('POST', `/api/items/${qb.id}/submit`, { answer: wrongFor(qb, rightB), source: 'quiz', session: s1.id })).json;
  check('QUIZ: answers are checked inside the attempt (one right, one wrong)', ra.outcome === 'CORRECT' && rb.outcome === 'INCORRECT', `${ra.outcome} ${rb.outcome} ${JSON.stringify(rb).slice(0, 200)}`);
  const again = await api('POST', `/api/items/${qb.id}/submit`, { answer: rightB, source: 'quiz', session: s1.id });
  check('QUIZ: a checked answer cannot be changed afterwards', again.status === 409, JSON.stringify(again));
  const foreign = await api('POST', '/api/items/sql-joins-q1/submit', { answer: 1, source: 'quiz', session: s1.id });
  check('QUIZ: a question that is not part of the attempt is refused', foreign.status === 409);
  // the page's own place in the quiz (question 3, an answer chosen but not checked)
  const draftC = valueOf(await reveal(qc.id));
  await api('PUT', `/api/state/quiz:${QK}`, { state: { sessionId: s1.id, index: 2, drafts: { [qc.id]: { answer: draftC } } } });

  check('QUIZ: app restarts in the middle of a quiz', await restartServer(), serverOut.slice(-800));
  const o1c = (await api('POST', '/api/quiz-sessions/open', { key: QK, n: 6 })).json;
  check('QUIZ: after a restart the same attempt resumes with both answers kept', o1c.session.id === s1.id && o1c.resumed === true && o1c.session.answered === 2
    && o1c.session.results[qa.id].correct === true && o1c.session.results[qb.id].given !== undefined, JSON.stringify(o1c.session.results));
  const place = (await api('GET', `/api/state/quiz:${QK}`)).json;
  check('QUIZ: after a restart the current question and the unchecked selection are kept', place.state && place.state.index === 2 && !!place.state.drafts[qc.id], JSON.stringify(place));
  const homeQuiz = (await api('GET', '/api/home')).json.unfinished;
  check('QUIZ: an unfinished quiz is offered on Home', homeQuiz.some((u) => u.kind === 'Quiz' && u.to === '/quiz/topic/xl-basics'), JSON.stringify(homeQuiz));
  const early = await api('GET', `/api/quiz-sessions/${s1.id}/review`);
  check('QUIZ: review is only available once the quiz is finished', early.status === 409);

  const fin = (await api('POST', `/api/quiz-sessions/${s1.id}/finish`, {})).json.session;
  check('QUIZ: finishing stores the score (unanswered count as not right)', fin.finishedAt && fin.correct === 1 && fin.total === 6 && Math.abs(fin.score - 1 / 6) < 1e-9, JSON.stringify(fin).slice(0, 300));
  check('QUIZ: a low score is "try again", not completed', fin.state === 'evaluated', fin.state);
  const late = await api('POST', `/api/items/${qc.id}/submit`, { answer: 0, source: 'quiz', session: s1.id });
  check('QUIZ: a finished quiz cannot be changed', late.status === 409);
  const o1d = (await api('POST', '/api/quiz-sessions/open', { key: QK, n: 6 })).json;
  check('QUIZ: refresh after finishing shows the same finished attempt (result kept)', o1d.session.id === s1.id && !!o1d.session.finishedAt && o1d.session.score === fin.score);
  check('QUIZ: a failed quiz points back to practice in the same topic, not on to the next topic', !!o1d.session.next && o1d.session.next.to.startsWith('/topic/xl-basics') && /practi|lesson/i.test(o1d.session.next.label), JSON.stringify(o1d.session.next));
  const rv = (await api('GET', `/api/quiz-sessions/${s1.id}/review`)).json.session;
  check('QUIZ: review rebuilds every question with the answer given, the right answer and why',
    rv.items.length === 6 && rv.results[qb.id].given !== null && !!rv.results[qb.id].answer && rv.results[qb.id].explain !== undefined
    && rv.results[qc.id].outcome === null && rv.results[qa.id].correct === true, JSON.stringify(rv.results).slice(0, 400));
  const topicQ = (await api('GET', '/api/topics/xl-basics')).json;
  check('QUIZ: the topic checklist shows the quiz as "try again"', topicQ.quizState === 'evaluated' && topicQ.checklist.find((c) => c.key === 'quiz').status === 'evaluated', topicQ.quizState);

  // "Try another quiz" six times in a row: each attempt must avoid the questions of the one before
  // (one attempt alone could miss the previous questions by chance)
  const bankOf = (x) => x.itemIds.filter((id) => !id.startsWith('g.'));
  let n2 = null;
  let prevBank = bankOf(s1);
  const repeats = [];
  for (let i = 0; i < 6; i++) {
    n2 = (await api('POST', '/api/quiz-sessions', { key: QK, n: 6 })).json.session;
    const overlap = bankOf(n2).filter((id) => prevBank.includes(id));
    if (overlap.length) repeats.push(`attempt ${i + 2}: ${overlap}`);
    prevBank = bankOf(n2);
  }
  check('QUIZ: another attempt is a new attempt with different questions (6 in a row)', n2.id !== s1.id && !n2.finishedAt && repeats.length === 0, repeats.join(' | '));
  const list = (await api('GET', `/api/quiz-sessions?key=${encodeURIComponent(QK)}`)).json.sessions;
  check('QUIZ: the earlier attempt is still stored with its score', list.some((x) => x.id === s1.id && x.finishedAt && x.score === fin.score), JSON.stringify(list).slice(0, 300));
  // pass the second attempt: every question right
  for (const it of n2.items) {
    const v = valueOf(await reveal(it.id));
    await api('POST', `/api/items/${it.id}/submit`, { answer: it.type === 'number' ? String(v) : v, source: 'quiz', session: n2.id });
  }
  const fin2 = (await api('POST', `/api/quiz-sessions/${n2.id}/finish`, {})).json.session;
  check('QUIZ: all right -> 100% and completed', fin2.score === 1 && fin2.state === 'completed', JSON.stringify(fin2).slice(0, 300));
  check('QUIZ: a passed quiz moves on (no "practise first")', !!fin2.next && !/Practise first/.test(fin2.next.label), JSON.stringify(fin2.next));
  const topicQ2 = (await api('GET', '/api/topics/xl-basics')).json;
  check('QUIZ: a passed quiz stays completed on the topic', topicQ2.quizState === 'completed', topicQ2.quizState);
  const n3 = (await api('POST', '/api/quiz-sessions', { key: QK, n: 6 })).json.session;
  await api('POST', `/api/items/${n3.items[0].id}/submit`, { answer: wrongFor(n3.items[0], valueOf(await reveal(n3.items[0].id))), source: 'quiz', session: n3.id });
  const topicQ3 = (await api('GET', '/api/topics/xl-basics')).json;
  check('QUIZ: starting another try does not undo "completed"', topicQ3.quizState === 'completed', topicQ3.quizState);

  // today's quiz is an attempt too
  const todayNow = (await api('GET', '/api/today')).json;
  const tq = (await api('POST', '/api/quiz-sessions/open', { key: todayNow.quizKey })).json.session;
  const planIds = todayNow.steps.find((s) => s.key === 'quiz').itemIds;
  check("QUIZ: today's quiz uses the plan's questions", tq.itemIds.join() === planIds.join(), `${tq.itemIds} vs ${planIds}`);
  await api('POST', `/api/quiz-sessions/${tq.id}/finish`, {});
  const todayAfter = (await api('GET', '/api/today')).json;
  check("QUIZ: finishing today's quiz ticks the step", todayAfter.steps.find((s) => s.key === 'quiz').done === true);

  // ================================================================ GRADING THROUGH THE APP
  const answeredBefore = (await api('GET', '/api/progress')).json.stats.answered;
  const mistakesBefore = (await api('GET', '/api/mistakes')).json.open.length;
  const p2Model = (await reveal('xl-basics-p2')).formula;
  await api('POST', '/api/test/faults', { formula: 'fail' });
  const broken = (await api('POST', '/api/items/xl-basics-p2/submit', { answer: '=B2*1.0001', source: 'practice', ctx: 'task' })).json;
  check('GRADING: calculator broken ("no AST with such key") -> EVALUATION_ERROR, not marked wrong', broken.outcome === 'EVALUATION_ERROR' && broken.correct === false && broken.recorded === null, JSON.stringify(broken).slice(0, 300));
  check('GRADING: the task is "submitted", not "try again"', broken.state === 'submitted', broken.state);
  check('GRADING: the learner is told plainly and still gets a way forward', /could not check/i.test(broken.feedback) && !!(broken.next && broken.next.to), JSON.stringify(broken).slice(0, 300));
  // a quiz attempt that contains a formula question (drawn at random, so draw until one does)
  let sq = null;
  let fq = null;
  for (let i = 0; i < 25 && !fq; i++) {
    sq = (await api('POST', '/api/quiz-sessions', { key: 'topic:xl-basics', n: 6 })).json.session;
    fq = sq.items.find((x) => x.type === 'formula');
  }
  check('GRADING: found a quiz with a formula question to test with', !!fq);
  if (fq) {
    const fr = (await api('POST', `/api/items/${fq.id}/submit`, { answer: '=1+1', source: 'quiz', session: sq.id })).json;
    check('GRADING: a quiz question the app could not check is marked "not checked"', fr.outcome === 'EVALUATION_ERROR', JSON.stringify(fr).slice(0, 200));
  }
  const brokenModel = (await api('POST', '/api/items/xl-basics-p2/submit', { answer: p2Model, source: 'practice' })).json;
  check('GRADING: calculator broken + the model answer -> still CORRECT (text match)', brokenModel.outcome === 'CORRECT' && brokenModel.method === 'text-match', JSON.stringify(brokenModel).slice(0, 200));
  await api('POST', '/api/test/faults', { formula: 'ok' });
  const answeredAfter = (await api('GET', '/api/progress')).json.stats.answered;
  check('GRADING: answers the app could not check are not counted as attempts', answeredAfter === answeredBefore + 1, `${answeredBefore} -> ${answeredAfter} (only the text-matched model answer counts)`);
  check('GRADING: and never become mistakes', (await api('GET', '/api/mistakes')).json.open.length === mistakesBefore);
  if (fq) {
    const retry = (await api('POST', `/api/items/${fq.id}/submit`, { answer: (await reveal(fq.id)).formula, source: 'quiz', session: sq.id })).json;
    check('GRADING: an unchecked quiz answer can be checked again once the app works', retry.outcome === 'CORRECT', JSON.stringify(retry).slice(0, 200));
  }
  const good = (await api('POST', '/api/items/xl-basics-p2/submit', { answer: p2Model, source: 'practice' })).json;
  check('GRADING: once the calculator works again the same task is checked normally', good.outcome === 'CORRECT' && good.method === 'engine', JSON.stringify(good).slice(0, 200));
  const sqlRight = (await api('POST', '/api/items/sql-joins-p1/submit', { answer: (await reveal('sql-joins-p1')).sql, source: 'practice' })).json;
  const sqlWrong = (await api('POST', '/api/items/sql-joins-p2/submit', { answer: 'SELECT 1 AS x', source: 'practice' })).json;
  check('GRADING: correct SQL -> CORRECT, incorrect SQL -> INCORRECT', sqlRight.outcome === 'CORRECT' && sqlWrong.outcome === 'INCORRECT', `${sqlRight.outcome} ${sqlWrong.outcome}`);

  const genQ = n2.items.find((x) => x.id.startsWith('g.'));

  // ================================================================ COMPLETION AND CONTINUATION
  check('COMPLETION: a solved task reports "completed" with a next step that moves forward', sqlRight.state === 'completed' && !!sqlRight.next && sqlRight.next.to !== '/task/sql-joins-p1' && !sqlRight.next.to.includes('task=sql-joins-p1'), JSON.stringify({ s: sqlRight.state, n: sqlRight.next }));
  check('COMPLETION: a wrong answer reports "try again" and still offers a way on', sqlWrong.state === 'evaluated' && !!(sqlWrong.next && sqlWrong.next.to), JSON.stringify({ s: sqlWrong.state, n: sqlWrong.next }));
  const nTask = (await api('GET', '/api/next?kind=item&id=sql-joins-p1&ctx=task')).json.next;
  const nTopic = (await api('GET', '/api/next?kind=item&id=sql-joins-p1&ctx=topic')).json.next;
  check('COMPLETION: next from a task page stays on task pages; from a topic it stays in the topic', (nTask.to.startsWith('/task/') || nTask.kind !== 'practice') && nTopic.to.startsWith('/topic/'), `${nTask.to} | ${nTopic.to}`);
  const ld = (await api('POST', '/api/topics/xl-logic/lesson-done', {})).json;
  check('COMPLETION: marking a lesson complete answers "completed" and the next step', ld.state === 'completed' && !!ld.next && /tab=practice|tab=challenge|tab=quiz/.test(ld.next.to), JSON.stringify(ld));
  const xlb = (await api('GET', '/api/topics/xl-basics')).json;
  check('COMPLETION: the topic checklist uses the five lifecycle states', xlb.checklist.every((c) => ['not-started', 'in-progress', 'submitted', 'evaluated', 'completed'].includes(c.status)), JSON.stringify(xlb.checklist));
  const firstOpen = xlb.checklist.find((c) => c.status !== 'completed');
  check("COMPLETION: the topic's next step is the first step not yet completed", firstOpen ? xlb.next.to.includes(firstOpen.task || `tab=${firstOpen.tab}`) : xlb.next.kind === 'topic', `${JSON.stringify(firstOpen)} -> ${xlb.next.to}`);
  // finish the whole of xl-basics: lesson, every practice task and the challenge (the quiz is already passed)
  await api('POST', '/api/topics/xl-basics/lesson-done', {});
  const solveTask = async (p, source) => {
    const a = await reveal(p.id);
    if (p.type === 'formula') return api('POST', `/api/items/${p.id}/submit`, { answer: a.formula, source });
    if (p.type === 'sql') return api('POST', `/api/items/${p.id}/submit`, { answer: a.sql, source });
    if (p.type === 'numbers') return api('POST', `/api/items/${p.id}/submit`, { answer: a.values.map(String), source });
    if (p.type === 'open') return api('POST', `/api/items/${p.id}/selfcheck`, { answer: 'x', ticks: [true, true, true], source });
    if (p.type === 'file') return api('POST', `/api/items/${p.id}/selfmark`, { correct: true, source });
    return api('POST', `/api/items/${p.id}/submit`, { answer: valueOf(a), source });
  };
  for (const p of xlb.practice) await solveTask(p, 'practice');
  if (xlb.challenge) await solveTask(xlb.challenge, 'challenge');
  const xlb2 = (await api('GET', '/api/topics/xl-basics')).json;
  check('COMPLETION: completing every practice task marks them completed', xlb2.practice.every((p) => p.status === 'completed'), JSON.stringify(xlb2.practice.map((p) => [p.id, p.type, p.status])));
  const openSteps = xlb2.checklist.filter((c) => c.status !== 'completed').map((c) => c.key);
  check('COMPLETION: a fully completed topic leads on to the next topic', openSteps.length === 0 && xlb2.next.kind === 'topic' && !xlb2.next.to.includes('xl-basics') && /complete/i.test(xlb2.next.hint || ''), `${openSteps} ${JSON.stringify(xlb2.next)}`);

  // projects: completion, result kept, next project
  const handIn = (await api('POST', '/api/projects/cap-returns/steps/final', { answer: { 'What did you find?': 'Online returns are far higher than in store because of sizing.' } })).json;
  check('COMPLETION: handing in a project report asks for the self-check first', handIn.score === null && Array.isArray(handIn.detected) && handIn.state === 'in-progress', JSON.stringify(handIn).slice(0, 200));
  const projMid = (await api('GET', '/api/projects/cap-returns')).json;
  const finalSaved = projMid.steps.find((s) => s.id === 'final').saved;
  check('PERSISTENCE: after a refresh the report comes back at its self-check', finalSaved && Array.isArray(finalSaved.detected) && finalSaved.detected.length === 7, JSON.stringify(finalSaved).slice(0, 200));
  const done = (await api('POST', '/api/projects/cap-returns/steps/final', { answer: { 'What did you find?': 'x' }, ticks: [true, true, true, true, false, false, false] })).json;
  check('COMPLETION: saving the self-check completes the project with a score and a next project', done.state === 'completed' && !!done.summary && !!done.next && done.next.to.startsWith('/projects/') && done.next.to !== '/projects/cap-returns', JSON.stringify({ state: done.state, next: done.next }));
  const projAfter = (await api('GET', '/api/projects/cap-returns')).json;
  check('COMPLETION: a completed project keeps its result after a refresh', projAfter.state === 'completed' && !!projAfter.summary && projAfter.summary.projectScore === done.summary.projectScore, JSON.stringify(projAfter.summary).slice(0, 200));
  check('COMPLETION: the project library shows it completed', (await api('GET', '/api/projects')).json.find((p) => p.id === 'cap-returns').status === 'completed');

  // ================================================================ PERSISTENCE ACROSS A RESTART
  await api('PUT', '/api/state/session:quick', { state: { itemId: qa.id, topic: { id: 'xl-basics', title: 'x' }, draft: { answer: 1 }, result: null, right: 3, total: 4 } });
  await api('PUT', '/api/state/session:sqllab', { state: { db: 'hr', drafts: { hr: 'SELECT department, COUNT(*)\nFROM employees' } } });
  await api('PUT', '/api/state/session:placement', { state: { step: 'quiz', name: 'Islam', answers: { 'pl-xl-b1': 1 }, index: 1 } });
  await api('PUT', '/api/state/item:sql-joins-p2', { state: { itemId: 'sql-joins-p2', answer: 'SELECT e.full_name FROM employees e', hints: 2, help: [{ level: 1, text: 'hint' }], result: { outcome: 'INCORRECT', correct: false } } });
  // quizzes saved by the previous version of the app: one finished (all right), one left half-way
  const legacyIds = (await api('GET', '/api/topics/xl-countif/quiz?n=6')).json.items.map((x) => x.id);
  const legacyHalfIds = (await api('GET', '/api/topics/sql-select/quiz?n=5')).json.items.map((x) => x.id);
  const LEGACY_AT = '2026-09-16T22:09:25.844Z';
  await api('PUT', '/api/state/quiz:topic:xl-countif', { state: { ids: legacyIds, index: 5, finished: true, title: 'COUNTIF quiz', source: 'quiz', at: LEGACY_AT,
    results: Object.fromEntries(legacyIds.map((id) => [id, { correct: true, score: 1, given: 1, recorded: { score: 1, correct: true }, explain: 'x' }])) } });
  await api('PUT', '/api/state/quiz:topic:sql-select', { state: { ids: legacyHalfIds, index: 2, title: 'SELECT quiz',
    results: { [legacyHalfIds[0]]: { correct: true, score: 1, given: 0 }, [legacyHalfIds[1]]: { correct: false, score: 0, given: 3 } } } });
  const answeredBeforeImport = (await api('GET', '/api/progress')).json.stats.answered;

  check('PERSISTENCE: app restarts with work in progress everywhere', await restartServer(), serverOut.slice(-800));
  check('MIGRATION: the app reports that it kept the quizzes saved by the previous version', /Kept 2 quiz/.test(serverOut), serverOut.slice(-300));
  const legacyTopic = (await api('GET', '/api/topics/xl-countif')).json;
  check('MIGRATION: a quiz finished before the update is still completed', legacyTopic.quizState === 'completed', legacyTopic.quizState);
  const legacyOpen = (await api('POST', '/api/quiz-sessions/open', { key: 'topic:xl-countif', n: 6 })).json.session;
  check('MIGRATION: opening it shows that finished attempt and its score, not a new quiz',
    legacyOpen.finishedAt === LEGACY_AT && legacyOpen.score === 1 && legacyOpen.itemIds.join() === legacyIds.join(), JSON.stringify(legacyOpen).slice(0, 300));
  const half = (await api('POST', '/api/quiz-sessions/open', { key: 'topic:sql-select', n: 5 })).json;
  check('MIGRATION: a quiz left half-way before the update carries on with its answers',
    half.resumed === true && half.session.answered === 2 && half.session.itemIds.join() === legacyHalfIds.join()
    && half.session.results[legacyHalfIds[0]].outcome === 'CORRECT' && half.session.results[legacyHalfIds[1]].outcome === 'INCORRECT', JSON.stringify(half).slice(0, 300));
  const halfPlace = (await api('GET', '/api/state/quiz:topic:sql-select')).json.state;
  check('MIGRATION: ...on the same question', halfPlace && halfPlace.sessionId === half.session.id && halfPlace.index === 2, JSON.stringify(halfPlace));
  check('MIGRATION: importing old quizzes records no new attempts', (await api('GET', '/api/progress')).json.stats.answered === answeredBeforeImport);
  const quickBack = (await api('GET', '/api/state/session:quick')).json.state;
  const labBack = (await api('GET', '/api/state/session:sqllab')).json.state;
  const plBack = (await api('GET', '/api/state/session:placement')).json.state;
  const taskBack = (await api('GET', '/api/state/item:sql-joins-p2')).json.state;
  check('PERSISTENCE: quick practice (question, unchecked answer, score) survives a restart', quickBack && quickBack.itemId === qa.id && quickBack.draft.answer === 1 && quickBack.right === 3);
  check('PERSISTENCE: the SQL Lab query being written survives a restart', labBack && labBack.drafts.hr.includes('COUNT(*)'));
  check('PERSISTENCE: the placement check in progress survives a restart', plBack && plBack.index === 1 && plBack.answers['pl-xl-b1'] === 1);
  check("PERSISTENCE: a task's answer, hints and result survive a restart", taskBack && taskBack.hints === 2 && taskBack.help.length === 1 && taskBack.result.outcome === 'INCORRECT');
  const lib2 = (await api('GET', '/api/practice')).json;
  check('PERSISTENCE: its state after the restart is "try again"', lib2.tasks.find((t) => t.id === 'sql-joins-p2').status === 'evaluated', lib2.tasks.find((t) => t.id === 'sql-joins-p2').status);
  check('PERSISTENCE: completed states survive a restart', lib2.tasks.find((t) => t.id === 'sql-joins-p1').status === 'completed' && (await api('GET', '/api/topics/xl-basics')).json.quizState === 'completed');
  if (genQ) {
    const g1 = (await api('GET', `/api/items/${genQ.id}`)).json;
    const g2 = (await api('POST', `/api/items/${genQ.id}/submit`, { answer: String(valueOf(await reveal(genQ.id))), source: 'quiz' })).json;
    check('PERSISTENCE: a generated question is the same question after a restart and still grades right', g1.prompt === genQ.prompt && g2.outcome === 'CORRECT', JSON.stringify(g2).slice(0, 200));
  }
  // killed the instant after acting (no clean shutdown): what the app confirmed is already on disk.
  // These actions write nothing else, so only the save-before-reply rule can keep them.
  const killQuiz = (await api('POST', '/api/quiz-sessions', { key: 'topic:xl-textdates', n: 4 })).json.session;
  const kq = killQuiz.items[0];
  const kqr = (await api('POST', `/api/items/${kq.id}/submit`, { answer: wrongFor(kq, valueOf(await reveal(kq.id))), source: 'quiz', session: killQuiz.id })).json;
  const killLesson = (await api('POST', '/api/topics/xl-textdates/lesson-done', {})).json;
  server.kill('SIGKILL');
  check('PERSISTENCE: app killed right after acting restarts', await restartServer(), serverOut.slice(-400));
  const kqBack = (await api('GET', `/api/quiz-sessions/${killQuiz.id}`)).json.session;
  check('PERSISTENCE: a quiz answer checked just before the app was killed is kept', kqr.outcome && !!kqBack && kqBack.answered === 1 && kqBack.results[kq.id].outcome === kqr.outcome, JSON.stringify(kqBack && kqBack.results));
  check('PERSISTENCE: a lesson completed just before the app was killed stays completed', killLesson.state === 'completed' && (await api('GET', '/api/topics/xl-textdates')).json.lessonState === 'completed');
  const legacyAfter = (await api('GET', '/api/quiz-sessions?key=topic%3Axl-countif')).json.sessions;
  check('MIGRATION: old quizzes are imported only once (after further restarts)', legacyAfter.length === 1, JSON.stringify(legacyAfter.map((x) => x.id)));
  const unknownKind = await api('PUT', '/api/state/nonsense:x', { state: { a: 1 } });
  check('PERSISTENCE: unknown kinds of saved work are refused, not silently dropped', unknownKind.status === 400);

  // ================================================================ THE MASTERY LAYER
  const ms = (await api('GET', '/api/mastery')).json;
  check('MASTERY: every skill is judged ability by ability', ms.skills.length === 5 && ms.skills.every((x) => x.competencies.length >= 5 && x.stageLabel), JSON.stringify(ms.skills.map((x) => [x.id, x.competencies.length])));
  check('MASTERY: six stages, four kinds of evidence', ms.stages.length === 6 && ms.dimensions.length === 4);
  const xlb3 = (await api('GET', '/api/topics/xl-basics')).json;
  check('MASTERY: a topic carries its stage, its evidence and what would move it up', xlb3.masteryView && ['knowledge', 'skill', 'application', 'independence'].every((d) => xlb3.masteryView.dims[d]) && Array.isArray(xlb3.masteryView.next), JSON.stringify(xlb3.masteryView).slice(0, 200));
  check('MASTERY: the old topic percent is still there beside it', typeof xlb3.mastery === 'number');
  check('MASTERY: a completed topic is not automatically "Strong"', xlb3.checklist.every((c) => c.status === 'completed') && xlb3.masteryView.stage !== 'strong', xlb3.masteryView.stage);
  const home2 = (await api('GET', '/api/home')).json;
  check('MASTERY: home shows the next milestone and a Real Analyst task', home2.milestones && home2.milestones.total === 6 && home2.analyst && (home2.analyst.recommended || home2.analyst.assessment));
  const prog2 = (await api('GET', '/api/progress')).json;
  check('MASTERY: progress lists the six milestones with their requirements', prog2.milestones.list.length === 6 && prog2.milestones.list.every((m) => m.requirements.length >= 3));
  check('MASTERY: a few days of work earn no milestone', prog2.milestones.achieved === 0, JSON.stringify(prog2.milestones.list.filter((m) => m.achieved).map((m) => m.id)));
  const task = (await api('GET', '/api/items/xl-basics-p1')).json;
  check('ADAPTIVE: a practice task says how much help it offers', ['full', 'light', 'none'].includes(task.guidance), JSON.stringify({ g: task.guidance }));

  // Real Analyst: a cross-tool challenge from start to finish, through the API
  const al = (await api('GET', '/api/analyst')).json;
  check('ANALYST: the work list has requests, cross-tool challenges and assessments', ['request', 'toolchoice', 'assessment'].every((k) => al.tasks.some((t) => t.kind === k)) && al.tasks.length >= 15);
  const tc = (await api('GET', '/api/analyst/tc-quick-question')).json;
  check('ANALYST: a task opens with only its first part, and no verdicts', tc.parts.length === 1 && tc.totalParts === 2 && !JSON.stringify(tc).includes('"verdict"'));
  const tooEarly = await api('POST', '/api/analyst/tc-quick-question/parts/decide', { answer: 0 });
  check('ANALYST: parts open in order', tooEarly.status === 409);
  const t1 = (await api('POST', '/api/analyst/tc-quick-question/parts/tools', { answer: { tools: ['excel'], why: 'Two thousand rows, one-off question, needed before the meeting.' } })).json;
  check('ANALYST: a good tool choice with reasons scores full marks, with every tool rated', t1.result.score === 1 && t1.result.tools.length === 4 && t1.result.tools.every((x) => x.ratings.length === 6), JSON.stringify(t1.result).slice(0, 200));
  const toolsAgain = await api('POST', '/api/analyst/tc-quick-question/parts/tools', { answer: { tools: ['sql'], why: 'x' } });
  check('ANALYST: a checked choice is final', toolsAgain.status === 409);
  const t2 = (await api('POST', '/api/analyst/tc-quick-question/parts/decide', { answer: 0 })).json;
  check('ANALYST: the finished task has a result, the criteria and a debrief', t2.task.state === 'completed' && t2.task.summary && t2.task.summary.debrief && t2.task.summary.criteria.length > 0);
  const al2 = (await api('GET', '/api/analyst')).json;
  check('ANALYST: the work list shows it done', al2.tasks.find((t) => t.id === 'tc-quick-question').state === 'completed');
  // a work request: the finding is filed under the tool chosen
  await api('POST', '/api/analyst/ra-invoices/parts/tools', { answer: { tools: ['pq'], why: 'Four files every month: a refresh repeats the combine.' } });
  const inv = (await api('GET', '/api/analyst/ra-invoices')).json;
  const issues = inv.parts.find((p) => p.id === 'issues');
  check('ANALYST: a pick-every-true part sends only the statements', issues && issues.options.every((o) => typeof o === 'string'));

  // projects: judged on ten criteria, with the new steps
  const wasteProj = (await api('GET', '/api/projects/cap-waste')).json;
  const understand = wasteProj.steps.find((x) => x.id === 'understand');
  check('PROJECTS: every project starts with the data and the approach', wasteProj.steps[0].id === 'understand' && wasteProj.steps[1].id === 'approach' && wasteProj.steps.some((x) => x.id === 'check'));
  check('PROJECTS: statements about the data go out without their answers', understand.options.every((o) => typeof o === 'string') && !JSON.stringify(wasteProj).includes('"right":'));
  check('PROJECTS: every step says which criteria it shows', wasteProj.steps.every((x) => Array.isArray(x.criteria) && x.criteria.length));
  const u1 = (await api('POST', '/api/projects/cap-waste/steps/understand', { answer: [0, 1, 2] })).json;
  check('PROJECTS: the data step is graded with a reason for every statement', u1.score === 1 && u1.result.options.every((o) => o.why), JSON.stringify(u1).slice(0, 200));
  const u2 = await api('POST', '/api/projects/cap-waste/steps/understand', { answer: [3] });
  check('PROJECTS: a checked choosing step is final', u2.status === 409);
  const ap = (await api('POST', '/api/projects/cap-waste/steps/approach', { answer: { tools: ['pbi'], why: 'The manager will watch this monthly, so a refreshing report.' } })).json;
  check('PROJECTS: more than one tool can be right for a project', ap.score > 0.7 && ap.result.tools.find((x) => x.id === 'pbi').verdict !== 'weak');

  // ================================================================ SAFETY: tests only ever use temporary folders
  // The learner's installed copy and the development worktree are separate checkouts: a server started
  // from one does not know the other's app/data. So a test run refuses any folder outside os.tmpdir().
  {
    const { spawnSync } = await import('node:child_process');
    const outside = path.join(APP, 'no-such-test-folder');     // not temporary, and must stay uncreated
    const envFor = (dir) => ({ ...process.env, PORT: '7795', ACADEMY_DATA: dir, ACADEMY_REQUIRE_TEST_DATA: '1' });
    const srv = spawnSync(process.execPath, ['server/index.js'], { cwd: APP, env: envFor(outside), encoding: 'utf8', timeout: 20000 });
    check('SAFETY: a test server refuses a data folder outside the temporary folder (exit 2, nothing created)', srv.status === 2 && /temporary folder/.test(srv.stderr) && !fs.existsSync(outside), `${srv.status} ${srv.stderr.slice(0, 200)}`);
    const real = spawnSync(process.execPath, ['server/index.js'], { cwd: APP, env: envFor(path.join(APP, 'data')), encoding: 'utf8', timeout: 20000 });
    check('SAFETY: ...and the real progress folder of its own checkout', real.status === 2 && /real progress/.test(real.stderr), `${real.status} ${real.stderr.slice(0, 200)}`);
    const dev = spawnSync(process.execPath, ['tools/dev-server.js', '--new-learner'], { cwd: APP, env: envFor(outside), encoding: 'utf8', timeout: 20000 });
    check('SAFETY: the dev server checks before it empties anything', dev.status !== 0 && /refused/.test(dev.stderr) && !fs.existsSync(outside), `${dev.status} ${dev.stderr.slice(0, 200)}`);
    const fixture = spawnSync(process.execPath, ['tools/fixture.js', outside, '--force'], { cwd: APP, encoding: 'utf8', timeout: 20000 });
    check('SAFETY: the fixture builder refuses a folder outside the temporary folder', fixture.status !== 0 && /refused/.test(fixture.stderr) && !fs.existsSync(outside), `${fixture.status} ${fixture.stderr.slice(0, 200)}`);
  }
} catch (e) {
  check('no exceptions', false, e.stack);
} finally {
  server.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log('\nServer output:\n' + serverOut.slice(-3000)); }
  setTimeout(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } process.exit(failed.length ? 1 : 0); }, 300);
}
