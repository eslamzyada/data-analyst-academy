// Unit tests for grading, lifecycle rules and saving (no server needed): npm run test:grading
//
// The point of these tests is the rule that a broken grader must never produce a wrong verdict.
// Every path that can fail is forced to fail here, and the outcome must be EVALUATION_ERROR
// ("not checked"), never INCORRECT.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// short SQL time limit, so the "a stopped query does not block the next one" test is quick.
// Set before the SQL runner is loaded (it reads the limit once).
process.env.ACADEMY_SQL_LIMIT_MS ||= '2500';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { loadContent, content } = await import('../server/content/index.js');
const { gradeFormula, translateFormula, sameFormulaText, clearFormulaCache, orderRanges, setEvaluatorForTests, evaluate, syntaxProblem, checkFunctions, cleanFormulaInput, excelErrorText, parseAddr, idxToCol } = await import('../server/grading/formula.js');
const { sameSqlText, gradeSql } = await import('../server/grading/sql.js');
const { dateMatches } = await import('../server/grading/excel.js');
const { initSqlRunner, runSql } = await import('../server/sqlrunner.js');
const { sqlHelp } = await import('../server/sqlhelp.js');
const { OUTCOME, STATE, outcomeOf, isRecordable, taskState, quizState, projectState, lessonState } = await import('../shared/lifecycle.js');
loadContent(path.join(ROOT, 'data'));
initSqlRunner(path.join(ROOT, 'data', 'practice'));

let pass = 0; const failures = [];
const ok = (cond, label, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${label}`); }
  else { failures.push(label); console.log(`FAIL  ${label}  ${extra}`); }
};
const section = (name) => console.log(`\n-- ${name}`);

// ================================================================ FORMULA GRADING
section('formula grading');

const T = [
  ['=B2*C2', 1, 0, '=B3*C3'],
  ['=B2*$C$2', 1, 0, '=B3*$C$2'],
  ['=B$2*$C2', 2, 0, '=B$2*$C4'],
  ['=B2*C2', 0, 1, '=C2*D2'],
  ['=SUM(B2:B10)', 3, 0, '=SUM(B5:B13)'],
  ['=IF(A2="West",1,0)', 1, 0, '=IF(A3="West",1,0)'],
  ['=A2&"B2 is here"', 1, 0, '=A3&"B2 is here"'],
  ['=VLOOKUP(A2,$A$2:$C$5,3,FALSE())', 1, 0, '=VLOOKUP(A3,$A$2:$C$5,3,FALSE())'],
  ['=DATE(2026,1,1)', 1, 0, '=DATE(2026,1,1)'],
  ['=A2*10%', 1, 0, '=A3*10%'],
];
let bad = T.filter(([f, dr, dc, want]) => translateFormula(f, dr, dc) !== want);
ok(bad.length === 0, 'fill-down translates relative references like Excel', bad.map(([f, dr, dc, w]) => `${f} -> ${translateFormula(f, dr, dc)} (want ${w})`).join('; '));

const items = Object.values(content.items).filter((i) => i.type === 'formula');
const selfFail = items.filter((i) => !gradeFormula(i, i.answer).correct);
ok(selfFail.length === 0, `CORRECT formula: all ${items.length} model formulas grade themselves correct`, selfFail.map((i) => i.id).join(', '));
{
  const it = items.find((i) => i.id === 'xl-basics-try') || items[0];
  const right = gradeFormula(it, it.answer);
  const wrong = gradeFormula(it, '=B2+C2');
  ok(outcomeOf(right) === OUTCOME.CORRECT && right.method === 'engine', 'correct formula -> CORRECT, checked by the calculator', JSON.stringify(right).slice(0, 200));
  ok(outcomeOf(wrong) === OUTCOME.INCORRECT && wrong.method === 'engine' && !wrong.engineError, 'incorrect formula -> INCORRECT, checked by the calculator', JSON.stringify(wrong).slice(0, 200));
  const typo = gradeFormula(it, '=(B2*C2))');
  ok(outcomeOf(typo) === OUTCOME.INCORRECT && typo.noMistake && /bracket|read/i.test(typo.feedback || ''),
    "learner's own syntax error -> INCORRECT with a plain explanation, not logged as a concept mistake", JSON.stringify(typo).slice(0, 200));
}

const variants = (i) => [i.answer, i.answer.replace('=', '= '), i.answer.toLowerCase(), '=SUM(A2:A3)', '=NOSUCHFN(A2)',
  '=A2*', '=1/0', '=', '', '=FILTER(A2:A4,B2:B4>2)', '=TAKE(B2:B4,1)', 'B2*C2', '=IF(B2>1;"a";"b")', '=A1:A9999999',
  '=SUM(B4:B2)', '=SUM(C:B)', '=SUM(4:2)', `=${'1+'.repeat(5000)}1`];
let threw = 0, checked = 0, engineErrors = 0, firstThrow = '', firstEngine = '';
for (const item of items) {
  for (const v of variants(item)) {
    checked++;
    try {
      const g = gradeFormula(item, v);
      if (g.engineError) { engineErrors++; firstEngine ||= `${item.id} "${v.slice(0, 40)}": ${g.engineError}`; }
    } catch (e) { threw++; firstThrow ||= `${item.id} "${v.slice(0, 40)}": ${e.message}`; }
  }
}
ok(threw === 0, `${checked} formula gradings (incl. odd input), none crash the grader`, firstThrow);
ok(engineErrors === 0, `${checked} formula gradings, the calculator never fails on learner input`, firstEngine);

// ---------------------------------------------------------------- the "no AST with such key" root cause
section('missing AST / cache entry');
{
  // Root cause, reproduced on the library itself: HyperFormula caches a parsed formula under a
  // hash of its text, then rewrites reversed ranges (B4:B2 -> B2:B4) in the stored copy. Copying
  // that cell looks the cache up under the rewritten text, which was never stored.
  const { HyperFormula } = await import('hyperformula');
  const hf = HyperFormula.buildFromArray([[1], [2], [3], ['=SUM(A3:A1)']], { licenseKey: 'gpl-v3' });
  let libraryError = null;
  try { hf.copy({ start: { sheet: 0, col: 0, row: 3 }, end: { sheet: 0, col: 0, row: 3 } }); hf.paste({ sheet: 0, col: 1, row: 3 }); }
  catch (e) { libraryError = e.message; }
  hf.destroy();
  console.log(`INFO  HyperFormula copy/paste of a reversed range: ${libraryError ? `throws "${libraryError}"` : 'no longer throws (library fixed)'}`);

  const src = fs.readFileSync(path.join(ROOT, 'server', 'grading', 'formula.js'), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
  const cacheReaders = ['.copy(', '.paste(', '.cut(', 'moveRows', 'moveColumns', 'moveCells', '.undo(', '.redo(', 'addNamedExpression', 'setRowOrder', 'setColumnOrder'];
  const used = cacheReaders.filter((f) => src.includes(f));
  ok(used.length === 0, 'the formula grader never calls a HyperFormula operation that reads its AST cache', used.join(', '));

  ok(orderRanges('=SUM(B4:B2)') === '=SUM(B2:B4)' && orderRanges('=B2/SUM($B$4:$B$2)') === '=B2/SUM($B$2:$B$4)'
    && orderRanges('=SUM(C:B)') === '=SUM(B:C)' && orderRanges('=SUM(4:2)') === '=SUM(2:4)'
    && orderRanges('=IF(A2="B4:B2",1,0)') === '=IF(A2="B4:B2",1,0)' && orderRanges('=SUM(B2:B4)') === '=SUM(B2:B4)',
  'reversed ranges are put in order before the calculator sees them (text in quotes untouched)');

  // every fill-down task, answered with its ranges written backwards: same verdict, no engine error
  const reversed = [];
  const rev = (f) => f.replace(/(\$?[A-Z]{1,3}\$?\d+):(\$?[A-Z]{1,3}\$?\d+)/g, '$2:$1');
  const withRanges = items.filter((i) => /[A-Z]\$?\d+:\$?[A-Z]/.test(i.answer));
  for (const it of withRanges) {
    const g = gradeFormula(it, rev(it.answer));
    if (!g.correct || g.method !== 'engine') reversed.push(`${it.id}: ${rev(it.answer)} -> ${g.method} ${g.engineError || g.feedback}`);
  }
  ok(withRanges.length > 5 && reversed.length === 0, `regression: ${withRanges.length} model answers with reversed ranges still grade CORRECT by the calculator`, reversed.slice(0, 3).join(' | '));

  const fill = items.find((i) => i.fillTo);
  const repro = ['=SUM(B4:B2)', '=B2/SUM($B$4:$B$2)', '=COUNTIF($A$4:$A$2,A2)', '=SUM(C:B)', '=VLOOKUP(A2,$C$4:$A$2,3,FALSE())'];
  const reproBad = repro.map((f) => [f, gradeFormula(fill, f)]).filter(([, g]) => g.engineError || g.method !== 'engine');
  ok(reproBad.length === 0, `regression: the formulas that used to throw "no AST with such key" are now checked normally (${fill.id})`, reproBad.map(([f, g]) => `${f}: ${g.engineError}`).join(' | '));

  // the calculator failing with that exact error, twice: never a wrong answer
  const it = fill;
  const AST = 'There is no AST with such key in the cache.';
  setEvaluatorForTests(() => ({ engineError: AST }));
  clearFormulaCache();
  const model = gradeFormula(it, it.answer);
  const other = gradeFormula(it, '=B2*1.0001');
  const empty = gradeFormula(it, '=B2');
  setEvaluatorForTests(null);
  ok(outcomeOf(model) === OUTCOME.CORRECT && model.method === 'text-match', 'missing AST twice + the model answer -> CORRECT by text match', JSON.stringify(model));
  ok(outcomeOf(other) === OUTCOME.EVALUATION_ERROR && other.noMistake && !isRecordable(outcomeOf(other)),
    'missing AST twice + any other answer -> EVALUATION_ERROR, not recorded', JSON.stringify(other));
  ok(outcomeOf(empty) === OUTCOME.EVALUATION_ERROR, 'missing AST twice never becomes INCORRECT, whatever the answer', JSON.stringify(empty));
  ok(/could(n.t| not) check/i.test(other.feedback || '') && /saved/i.test(other.feedback || '') && !/wrong|incorrect/i.test((other.feedback || '').replace(/nothing has been marked wrong/i, '')),
    'the learner is told the app could not check it, that nothing is marked wrong and the work is saved', other.feedback);

  // failing once: a fresh engine is built and the real verdict comes back
  let calls = 0;
  setEvaluatorForTests((...a) => (++calls % 2 === 1 ? { engineError: AST } : evaluate(...a)));
  clearFormulaCache();
  const retried = gradeFormula(it, it.answer);
  const retriedWrong = gradeFormula(it, '=B2+999');
  setEvaluatorForTests(null);
  ok(retried.correct && retried.method === 'engine', 'missing AST once -> regenerated on a new engine -> CORRECT by calculation', JSON.stringify(retried).slice(0, 160));
  ok(outcomeOf(retriedWrong) === OUTCOME.INCORRECT && retriedWrong.method === 'engine', 'missing AST once + a wrong answer -> real verdict INCORRECT after regeneration', JSON.stringify(retriedWrong).slice(0, 160));

  // only the model answer's evaluation fails: the learner's different formula is not judged against nothing
  setEvaluatorForTests((grid, f, ...rest) => (f === it.answer ? { engineError: AST } : evaluate(grid, f, ...rest)));
  clearFormulaCache();
  const refDown = gradeFormula(it, '=B2*1.0001');
  setEvaluatorForTests(null);
  clearFormulaCache();
  ok(outcomeOf(refDown) === OUTCOME.EVALUATION_ERROR, 'model answer cannot be evaluated -> learner answer is EVALUATION_ERROR, not INCORRECT', JSON.stringify(refDown).slice(0, 160));
  const after = gradeFormula(it, it.answer);
  ok(after.correct && after.method === 'engine', 'a failed evaluation is not cached: the next check works normally', JSON.stringify(after).slice(0, 120));
}

section('other formula cases');
const fillItem = items.find((i) => i.fillTo);
const spill = gradeFormula(fillItem, '=FILTER(A2:A4,B2:B4>2)');
ok(!spill.correct && typeof spill.feedback === 'string' && spill.feedback.length > 0,
  'a spilling formula in a fill-down task explains itself instead of crashing', JSON.stringify(spill).slice(0, 160));
const unsup = gradeFormula(items[0], '=LET(x,1,x)');
ok(unsup.unsupported && unsup.noMistake && !unsup.correct && outcomeOf(unsup) === OUTCOME.NOT_EVALUABLE,
  'an unsupported function -> NOT_EVALUABLE, never counted as a mistake', JSON.stringify(unsup).slice(0, 160));
{
  const g = { rows: [['Store', 'Sales'], ['A', 420], ['B', 180], ['C', 950], ['D', 75]] };
  const rank = (f) => evaluate(g, f, 'C2', 'C5').cells.map((c) => c.value).join(',');
  ok(rank('=RANK.EQ(B2,$B$2:$B$5)') === '2,3,1,4' && rank('=RANK(B2,$B$2:$B$5,1)') === '3,2,4,1' && rank('=RANK.EQ(B2,$B$2:$B$5,0)') === '2,3,1,4',
    'RANK and RANK.EQ are calculated (largest first by default, smallest first with order 1), also when copied down',
    `${rank('=RANK.EQ(B2,$B$2:$B$5)')} / ${rank('=RANK(B2,$B$2:$B$5,1)')}`);
  const row = { rows: [['h', 'Worst', 'Expected', 'Best'], ['Price', 22, 25, 27]] };
  const idx = (f) => evaluate(row, f, 'F1').cells[0].value;
  ok(idx('=INDEX(B2:D2,2)') === 25 && idx('=INDEX($B$2:$D$2,MATCH("Best",$B$1:$D$1,0))') === 27 && idx('=INDEX(A1:A2,2)') === 'Price' && idx('=INDEX(B1:D2,2,3)') === 27,
    'INDEX on a one-row range takes the number as a column, as Excel does; other INDEX forms are unchanged',
    JSON.stringify([idx('=INDEX(B2:D2,2)'), idx('=INDEX(A1:A2,2)'), idx('=INDEX(B1:D2,2,3)')]));
  const fc = evaluate(g, '=FORECAST.LINEAR(5,{10,20,30,40},{1,2,3,4})', 'D2').cells[0].value;
  const ic = evaluate(g, '=INTERCEPT({12,20,30,40},{1,2,3,4})', 'D2').cells[0].value;
  ok(Math.abs(fc - 50) < 1e-9 && Math.abs(ic - 2) < 1e-9, 'FORECAST.LINEAR and INTERCEPT give straight-line results', `${JSON.stringify(fc)} ${JSON.stringify(ic)}`);
  const txt = gradeFormula(items[0], '=TEXT(A2,"mmm")');
  const mode = gradeFormula(items[0], '=MODE.SNGL(B2:B5)');
  const plain = evaluate(g, '=TEXT(B2,"0.0")', 'D2').cells[0].value;
  ok(txt.unsupported && txt.noMistake && mode.unsupported && mode.noMistake && plain === '420.0',
    'TEXT with month names and functions the calculator lacks are "not checked", never wrong; plain TEXT still works', JSON.stringify([txt.feedback, mode.feedback, plain]).slice(0, 200));
}
{
  const yes = ['2026-02-11', '2026/2/11', '11 February 2026', 'February 11, 2026', 'Feb 11th 2026', '11 feb'].filter((g) => !dateMatches(g, '2026-02-11'));
  const no = ['2026-02', '2026-02-12', '11 March 2026', '02/11/2026', '11/02/2026', '11/02/2025', 'February 2026', '11', ''].filter((g) => dateMatches(g, '2026-02-11'));
  const unambiguous = dateMatches('15/03/2026', '2026-03-15') && dateMatches('03/15/2026', '2026-03-15') && dateMatches('07/07/2026', '2026-07-07');
  ok(!yes.length && !no.length && unambiguous, 'date answers: any clear way of writing the day matches; other days, bare months and swappable slash dates do not',
    JSON.stringify({ wronglyRejected: yes, wronglyAccepted: no, unambiguous }));
}
ok(sameFormulaText('=B2*C2', '=b2 * c2') && sameFormulaText('=IF(B2>1;"a";"b")', '=IF(B2>1,"a","b")') && !sameFormulaText('=B2*C2', '=B2*C3'),
  'formula text fallback ignores case, spacing and separators but not real differences');
ok(sameSqlText('select  a from t;', 'SELECT a FROM t') && !sameSqlText('select a from t', 'select b from t'),
  'SQL text fallback ignores case, spacing and the trailing semicolon');

let repeatWrong = 0;
const heapBefore = process.memoryUsage().heapUsed;
for (let i = 0; i < 300; i++) if (!gradeFormula(fillItem, fillItem.answer).correct) repeatWrong++;
const heapAfter = process.memoryUsage().heapUsed;
ok(repeatWrong === 0, '300 repeated submissions of the same task all stay correct', `${repeatWrong} went wrong`);
ok(heapAfter - heapBefore < 150e6, 'repeated grading does not leak memory', `${Math.round((heapAfter - heapBefore) / 1e6)}MB growth`);

// ================================================================ SQL GRADING
// ================================================================ FORMULA MATRIX: learner vs system
// Every way a formula check can end, on one real task ("12 kg" -> 12, copied down). A problem of
// the app (engine, parser, cache, crash) must never become a wrong answer; a mistake Excel would
// reject is the learner's, and says so plainly.
section('formula matrix: learner mistakes vs app problems');
{
  const kg = content.items['xl2-cln-02'];
  ok(kg && kg.type === 'formula' && kg.fillTo, 'the matrix task exists (weights like "12 kg" into kilograms, copied down)');
  const g = (f) => gradeFormula(kg, f);
  const is = (r, outcome, reason) => outcomeOf(r) === outcome && r.outcome === outcome && (!reason || r.reason === reason);
  const show = (r) => JSON.stringify({ outcome: r.outcome, reason: r.reason, feedback: (r.feedback || '').slice(0, 90) });
  const cases = [
    ['1. the exact model answer', kg.answer, OUTCOME.CORRECT, 'correct'],
    ['2. a valid equivalent formula', '=SUBSTITUTE(A2," kg","")*1', OUTCOME.CORRECT, 'correct'],
    ['3. harmless spacing inside', '= VALUE( SUBSTITUTE( A2 , " kg" , "" ) )', OUTCOME.CORRECT, 'correct'],
    ['4. lower-case function names and references', '=value(substitute(a2," kg",""))', OUTCOME.CORRECT, 'correct'],
    ['5. another valid approach', '=--SUBSTITUTE(A2," kg","")', OUTCOME.CORRECT, 'correct'],
    ['6. malformed: a quote mark missing', '=VALUE(SUBSTITUTE(A2," kg,""))', OUTCOME.INCORRECT, 'syntax'],
    ['7. a wrong formula', '=VALUE(SUBSTITUTE(A2," kg",""))*2', OUTCOME.INCORRECT, 'wrong-result'],
    ['8. an empty answer', '', OUTCOME.NOT_EVALUABLE, 'empty'],
    ['9. extra whitespace around it', '   =VALUE(SUBSTITUTE(A2," kg",""))   ', OUTCOME.CORRECT, 'correct'],
    ['10. a duplicated leading "=" (Excel rejects it)', '==SUBSTITUTE(A2, " kg", "")*1', OUTCOME.INCORRECT, 'syntax'],
    ['14. a real Excel function the calculator lacks', '=NUMBERVALUE(SUBSTITUTE(A2," kg",""))', OUTCOME.NOT_EVALUABLE, 'unsupported-function'],
    ['15. a wrong result: the digits come back as text', '=SUBSTITUTE(A2," kg","")', OUTCOME.INCORRECT, 'text-not-number'],
    ['16. the right result by another valid method', '=LEFT(A2,FIND(" ",A2)-1)*1', OUTCOME.CORRECT, 'correct'],
    ['a misspelt function (Excel would say #NAME?)', '=VALUE(SUBSITUTE(A2," kg",""))', OUTCOME.INCORRECT, 'unknown-function'],
    ['a Google Sheets function', '=COUNTUNIQUE(A2:A5)', OUTCOME.INCORRECT, 'not-excel'],
    ['a table reference Excel understands', '=VALUE(SUBSTITUTE(Table1[@Weight]," kg",""))', OUTCOME.NOT_EVALUABLE, 'unsupported-syntax'],
    ['a fixed value typed in', '=12', OUTCOME.INCORRECT, 'typed-constant'],
    ['a missing closing bracket at the end (Excel adds it itself)', '=VALUE(SUBSTITUTE(A2," kg","")', OUTCOME.CORRECT, 'correct'],
  ];
  for (const [label, f, outcome, reason] of cases) { const r = g(f); ok(is(r, outcome, reason), `matrix ${label} -> ${outcome} (${reason})`, show(r)); }

  const dbl = g('==SUBSTITUTE(A2, " kg", "")*1');
  // Owner's decision after the Codex review (Sept 2026): the box no longer starts with "=", so a
  // typed "==" is the learner's own, and Excel rejects it. It is a checked wrong answer, explained,
  // not logged as a concept mistake. (It used to be read as one "=" and marked right.)
  ok(!dbl.correct && dbl.reason === 'syntax' && dbl.noMistake === true && /single "="/.test(dbl.feedback || ''), 'a doubled "=" is marked wrong as Excel would, with a plain explanation (not a concept mistake)', show(dbl));
  // Quoted text is part of the answer, so tidying the typing must never touch it. A non-breaking or
  // zero-width space in the search text makes the formula fail in Excel; cleaning it up used to
  // turn exactly that formula into the right one (found by the Codex review).
  const NBSP = ' ', ZWSP = '​';
  for (const [label, f] of [
    ['a non-breaking space', `=VALUE(SUBSTITUTE(A2,"${NBSP}kg",""))`],
    ['a zero-width space', `=VALUE(SUBSTITUTE(A2," ${ZWSP}kg",""))`],
    ['a non-breaking space between curly quotes', `=VALUE(SUBSTITUTE(A2,“${NBSP}kg”,""))`],
  ]) {
    const r = g(f);
    ok(!r.correct && r.outcome === OUTCOME.INCORRECT, `${label} inside the quoted search text is kept, so the formula fails as it does in Excel (never CORRECT)`, show(r));
  }
  const outside = g(`${ZWSP}=VALUE(SUBSTITUTE(A2,${NBSP}" kg",""))`);
  ok(outside.correct, 'invisible characters and non-breaking spaces outside quotes are still harmless', show(outside));
  const typo = g('=VALUE(SUBSITUTE(A2," kg",""))');
  ok(/SUBSITUTE/.test(typo.feedback) && /Did you mean SUBSTITUTE\?/.test(typo.feedback) && typo.noMistake, 'a misspelt function is named, with the likely one ("Did you mean SUBSTITUTE?")', typo.feedback);
  const quote = g('=VALUE(SUBSTITUTE(A2," kg,""))');
  ok(/quote/i.test(quote.feedback) && quote.noMistake && !/Parsing error|Token/i.test(quote.feedback), 'a syntax mistake is explained in plain words, without the engine\'s parser text', quote.feedback);
  ok(!/AST|cache|Token|Parsing/i.test([g('').feedback, g('=NUMBERVALUE(A2)').feedback, g('=VALUE(SUBSTITUTE(Table1[@Weight]," kg",""))').feedback].join(' ')),
    'messages for answers that could not be checked contain no internal words (AST, cache, parser tokens)');
  ok(!isRecordable(g('').outcome) && !isRecordable(g('=NUMBERVALUE(A2)').outcome) && isRecordable(g('=VALUE(SUBSTITUTE(A2," kg,""))').outcome),
    'unchecked answers are never recorded; a syntax mistake Excel would reject is');
  ok(excelErrorText('NAME') === '#NAME?' && excelErrorText('NA') === '#N/A' && excelErrorText('DIV_BY_ZERO') === '#DIV/0!' && excelErrorText('VALUE') === '#VALUE!',
    'error values are written as Excel shows them (#NAME?, never "#N/AME")');
  const name = gradeFormula(kg, '=A2&kg');
  ok(name.reason === 'error-value' && /#NAME\?/.test(name.feedback) && /quotes/.test(name.feedback), 'an unquoted word gives #NAME? and the explanation about text in quotes', show(name));

  // ---- the app fails, the learner must not pay for it
  const PARSE_FAIL = { error: '#ERROR', message: 'Parsing error. injected' };
  const parseAll = (grid, f, target, fillTo) => {
    const t = parseAddr(target); const e = fillTo ? parseAddr(fillTo) : t; const cells = [];
    for (let r = t.row; r <= e.row; r++) for (let c = t.col; c <= e.col; c++) cells.push({ addr: `${idxToCol(c)}${r + 1}`, value: PARSE_FAIL });
    return { cells, spill: null };
  };
  const forced = (fn, f) => { clearFormulaCache(); setEvaluatorForTests(fn); try { return gradeFormula(kg, f); } finally { setEvaluatorForTests(null); clearFormulaCache(); } };
  const p1 = forced(parseAll, '=SUBSTITUTE(A2," kg","")*1');
  ok(is(p1, OUTCOME.NOT_EVALUABLE, 'parser') && p1.noMistake && !isRecordable(p1.outcome) && /couldn't check/.test(p1.feedback) && /Parsing error/.test(p1.technical || ''),
    '11. the parser fails on a valid formula -> NOT_EVALUABLE, not recorded; the engine text only under technical details', show(p1));
  const p2 = forced(parseAll, '=VALUE(SUBSTITUTE(A2," kg,""))');
  ok(is(p2, OUTCOME.INCORRECT, 'syntax'), '11b. with the parser failing, a formula with a real mistake is still the learner\'s mistake', show(p2));
  const ev = forced(() => ({ engineError: 'evaluator exploded (injected)' }), '=SUBSTITUTE(A2," kg","")*1');
  ok(is(ev, OUTCOME.EVALUATION_ERROR, 'engine') && !isRecordable(ev.outcome) && ev.technical, '12. the evaluator fails -> EVALUATION_ERROR, not recorded', show(ev));
  const ast = forced(() => ({ engineError: 'There is no AST with such key in the cache.' }), '=--SUBSTITUTE(A2," kg","")');
  ok(is(ast, OUTCOME.EVALUATION_ERROR, 'engine') && !isRecordable(ast.outcome) && !/AST|cache/.test(ast.feedback), '13. the AST cache fails -> EVALUATION_ERROR, and the learner never sees "AST" or "cache"', show(ast));
  const astModel = forced(() => ({ engineError: 'There is no AST with such key in the cache.' }), kg.answer);
  ok(is(astModel, OUTCOME.CORRECT, 'text-match'), '13b. the AST cache fails but the answer is the model answer -> CORRECT by text match', show(astModel));
  let crashed = null;
  try { forced(() => { throw new Error('injected crash'); }, kg.answer); } catch (e) { crashed = e; }
  ok(crashed && /injected crash/.test(crashed.message), 'a crash inside the grader surfaces to gradeSafely (which turns it into EVALUATION_ERROR: see npm run smoke)');
  const after = gradeFormula(kg, '=SUBSTITUTE(A2," kg","")*1');
  ok(is(after, OUTCOME.CORRECT, 'correct'), 'after each injected failure the next check is normal again (no broken state or cached failure left behind)', show(after));

  // ---- the same holds for every formula in the academy
  const outsideQuotes = (f, fn) => f.split(/("(?:[^"]|"")*")/).map((p, i) => (i % 2 ? p : fn(p))).join('');
  const harmless = (a) => [outsideQuotes(a, (p) => p.toLowerCase()), `  ${a}  `, a.replace(/^=/, '= '), outsideQuotes(a, (p) => p.replace(/,/g, ', '))];
  const broken = [];
  for (const it of items) for (const v of harmless(it.answer)) { const r = gradeFormula(it, v); if (!r.correct) broken.push(`${it.id}: ${v} -> ${r.reason}`); }
  ok(broken.length === 0, `all ${items.length} formula tasks: the model answer typed in lower case or with extra spaces still counts as right (${items.length * 4} checks)`, broken.slice(0, 5).join(' | '));
  const doubled = items.filter((it) => { const r = gradeFormula(it, `=${it.answer}`); return r.correct || r.reason !== 'syntax'; });
  ok(doubled.length === 0, `all ${items.length} formula tasks: the model answer typed with a doubled "=" is marked wrong as Excel would (syntax)`, doubled.slice(0, 5).map((it) => it.id).join(' | '));
  const alarms = items.flatMap((it) => [it.answer, ...(it.accept || [])]).filter((f) => syntaxProblem(f));
  ok(alarms.length === 0, 'the syntax checker finds nothing wrong in any model or accepted answer (it can only blame real mistakes)', alarms.slice(0, 3).join(' | '));
  const validTricky = ['=-A2', '=A2*-1', '=A2^-2', '=A2%', '=(A2)', '=SUM(A2:A5,)', '=IF(A2>=5,"x","")', '=A2<>B2', '=A2&" "&B2', '={1,2,3}', '={1,-2;3,4}', '=SUM(A2 A3)',
    '="a""b"', '=+A2', "='My sheet'!A2", '=IFERROR(A2/B2,#N/A)', '=A2=#DIV/0!', '=1.5E-3*A2', '=TODAY()', '=--A2', '=INDEX(A2:C5,2,)', '=SUM(A:A)'];
  const flagged = validTricky.filter((f) => syntaxProblem(f));
  ok(flagged.length === 0, `${validTricky.length} unusual but valid Excel formulas are never called syntax mistakes`, flagged.join(' | '));
  const realMistakes = ['=C2*', '=C2*/2', '=C2==3', '=SUM(A2:A5))', '=IF(A2>1,"yes,"no")', '=(*A2)', '=SUM(A2,*B2)'];
  const missed = realMistakes.filter((f) => !syntaxProblem(f));
  ok(missed.length === 0, `${realMistakes.length} mistakes Excel would reject are each explained`, missed.join(' | '));
  const fnModel = items.flatMap((it) => [it.answer, ...(it.accept || [])]).filter((f) => { const c = checkFunctions(f); return c.unknown.length || c.sheetsOnly.length || c.unsupported.length; });
  ok(fnModel.length === 0, 'every function in every model answer is a real Excel function the calculator can run', fnModel.slice(0, 3).join(' | '));
  ok(cleanFormulaInput('\u200B=\uFF1DSUM(A1)').text === '=SUM(A1)', 'invisible characters and a full-width "=" are cleaned away before checking');
}

section('SQL grading');
{
  const sqlItems = Object.values(content.items).filter((i) => i.type === 'sql');
  const it = sqlItems.find((i) => (i.traps || []).length) || sqlItems[0];
  const right = await gradeSql(it, it.answer);
  ok(outcomeOf(right) === OUTCOME.CORRECT, `correct SQL -> CORRECT (${it.id})`, JSON.stringify(right).slice(0, 160));
  const wrong = await gradeSql(it, it.traps?.[0]?.sql || 'SELECT 1 AS x');
  ok(outcomeOf(wrong) === OUTCOME.INCORRECT && !wrong.engineError, 'incorrect SQL -> INCORRECT, with feedback', JSON.stringify(wrong).slice(0, 160));
  const typo = await gradeSql(it, 'SELEC * FRM orders');
  ok(outcomeOf(typo) === OUTCOME.INCORRECT && /syntax/i.test(typo.feedback || ''), "learner's SQL syntax error -> INCORRECT with a hint", typo.feedback);

  const missingDb = await gradeSql({ ...it, id: `${it.id}-nodb`, db: 'no_such_practice_db' }, it.answer);
  ok(outcomeOf(missingDb) === OUTCOME.CORRECT && missingDb.checkedWithoutEngine,
    'practice database missing + the model answer -> CORRECT by text match', JSON.stringify(missingDb).slice(0, 160));
  const missingDb2 = await gradeSql({ ...it, id: `${it.id}-nodb`, db: 'no_such_practice_db' }, 'SELECT 1 AS x');
  ok(outcomeOf(missingDb2) === OUTCOME.EVALUATION_ERROR && !isRecordable(outcomeOf(missingDb2)),
    'practice database missing -> EVALUATION_ERROR, never INCORRECT', JSON.stringify(missingDb2).slice(0, 160));
  const badRef = await gradeSql({ ...it, id: `${it.id}-badref`, answer: 'SELECT * FROM table_that_is_not_there' }, 'SELECT 1 AS x');
  ok(outcomeOf(badRef) === OUTCOME.EVALUATION_ERROR, 'model query broken -> EVALUATION_ERROR, never INCORRECT', JSON.stringify(badRef).slice(0, 160));
  const badRefAgain = await gradeSql({ ...it, id: `${it.id}-badref`, answer: 'SELECT * FROM table_that_is_not_there' }, 'SELECT 1 AS x');
  ok(outcomeOf(badRefAgain) === OUTCOME.EVALUATION_ERROR, 'a failed model query is not cached as a result (still re-tried, still not checked)');

  const SLOW = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT COUNT(*) FROM c';
  const t0 = Date.now();
  const [slow, fast] = await Promise.all([runSql(it.db, SLOW), runSql(it.db, 'SELECT 1 AS x')]);
  const took = Date.now() - t0;
  ok(slow.timeout === true && !slow.fault, `a runaway query is stopped after the limit (${took} ms)`, JSON.stringify(slow).slice(0, 120));
  ok(fast.ok === true, 'a query queued behind a runaway one still runs and is not blamed for the timeout', JSON.stringify(fast).slice(0, 120));
  const after = await gradeSql(it, it.answer);
  ok(after.correct, 'the SQL engine works normally after a stopped query');
  const slowGrade = await gradeSql(it, SLOW);
  ok(outcomeOf(slowGrade) === OUTCOME.INCORRECT && slowGrade.noMistake === true && /stopped/i.test(slowGrade.feedback || ''),
    'a stopped query is a checked answer (explained) but not logged as a concept mistake', JSON.stringify(slowGrade).slice(0, 160));

  // A stopped query is explained by what it contains, with the real time limit (found by the Codex
  // review: every stop was blamed on a JOIN without ON, and the message always said 8 seconds).
  const secs = String(Number(process.env.ACADEMY_SQL_LIMIT_MS) / 1000);
  ok(slow.limitMs === Number(process.env.ACADEMY_SQL_LIMIT_MS) && slow.error.includes(`${secs} seconds`) && !/\bJOIN\b|\bON condition/i.test(slow.error),
    `a stopped query without a JOIN is not blamed on one, and the message gives the real limit (${secs} s)`, slow.error);
  const cedar = { id: 'cedarline', title: 'Cedarline', tables: [{ name: 'orders', columns: ['order_id'] }, { name: 'customers', columns: ['customer_id'] }] };
  const recursiveHelp = sqlHelp(slow.error, SLOW, cedar, { kind: 'timeout', limitMs: slow.limitMs });
  ok(/recursive/i.test(recursiveHelp.message) && !/missing its ON/i.test(recursiveHelp.message) && recursiveHelp.message.includes(`${secs} seconds`),
    'the help for a runaway WITH RECURSIVE talks about its stop condition, not a JOIN', recursiveHelp.message);
  const crossJoin = 'SELECT COUNT(*) FROM orders o JOIN customers c JOIN orders o2';
  ok(/missing its ON/i.test(sqlHelp('stopped', crossJoin, cedar, { kind: 'timeout', limitMs: 8000 }).message),
    'the help for a JOIN without its ON condition still says so');

  // Every query starts from the same connection settings: a PRAGMA in one query must not change the
  // next one (found by the Codex review: case_sensitive_like changed an unrelated LIKE from 565 to 4
  // rows, for every later query and check, until the app restarted).
  const probe = "SELECT COUNT(*) FROM customers WHERE full_name LIKE 'a%'";
  // first: on one plain connection this PRAGMA really changes the probe, so "unchanged" below means
  // isolation worked, not that the PRAGMA did nothing (asked by the Codex test review)
  const SQLJS = await (await import('sql.js')).default();
  const plain = new SQLJS.Database(fs.readFileSync(path.join(ROOT, 'data', 'practice', 'cedarline.db')));
  const onOne = [plain.exec(probe)[0].values[0][0], (plain.exec('PRAGMA case_sensitive_like=ON'), plain.exec(probe)[0].values[0][0])];
  plain.close();
  ok(onOne[0] > 0 && onOne[1] !== onOne[0], `on a single connection the PRAGMA changes the probe (${onOne[0]} -> ${onOne[1]} rows)`, JSON.stringify(onOne));
  const pBefore = await runSql('cedarline', probe);
  const pragma = await runSql('cedarline', 'PRAGMA case_sensitive_like=ON');
  const pAfter = await runSql('cedarline', probe);
  ok(pragma.ok && pBefore.ok && pAfter.ok && pBefore.rows[0][0] === onOne[0] && pAfter.rows[0][0] === pBefore.rows[0][0],
    'a PRAGMA run by one query (accepted) does not change the results of the next one', `${pBefore.rows?.[0]?.[0]} -> ${pAfter.rows?.[0]?.[0]} (pragma ok=${pragma.ok})`);
  const info = await runSql('cedarline', 'PRAGMA table_info(customers)');
  ok(info.ok && info.rows.some((r) => r.includes('full_name')), 'a PRAGMA that only reads (table_info) still works in the SQL Lab', JSON.stringify(info).slice(0, 160));
}

// ================================================================ LIFECYCLE RULES
section('lifecycle rules');
{
  const R = (outcome, extra = {}) => ({ outcome, ...extra });
  const cases = [
    [{}, STATE.NOT_STARTED],
    [{ hasAnswer: true }, STATE.IN_PROGRESS],
    [{ hasAnswer: true, submitting: true }, STATE.SUBMITTED],
    [{ hasAnswer: true, result: R(OUTCOME.CORRECT, { correct: true }) }, STATE.COMPLETED],
    [{ hasAnswer: true, result: R(OUTCOME.INCORRECT) }, STATE.EVALUATED],
    [{ hasAnswer: true, result: R(OUTCOME.INCORRECT), solvedBefore: true }, STATE.COMPLETED],
    [{ hasAnswer: true, result: R(OUTCOME.EVALUATION_ERROR) }, STATE.SUBMITTED],
    [{ hasAnswer: true, result: R(OUTCOME.NOT_EVALUABLE) }, STATE.SUBMITTED],
    [{ hasAnswer: true, result: R(OUTCOME.NOT_EVALUABLE), selfMarked: true }, STATE.COMPLETED],
    [{ hasAnswer: true, result: R(OUTCOME.NOT_EVALUABLE), selfMarked: false }, STATE.EVALUATED],
    [{ hasAnswer: true, result: R(OUTCOME.NOT_EVALUABLE, { selfCheck: true }), selfChecked: true }, STATE.COMPLETED],
  ];
  const wrongStates = cases.filter(([input, want]) => taskState(input) !== want);
  ok(wrongStates.length === 0, `task states: ${cases.length} situations map to the right state`, wrongStates.map(([i, w]) => `${JSON.stringify(i)} -> ${taskState(i)} (want ${w})`).join(' | '));
  ok(outcomeOf({ correct: false, engineError: 'x', needsReview: true }) === OUTCOME.EVALUATION_ERROR
    && outcomeOf({ correct: false, evaluationError: 'x' }) === OUTCOME.EVALUATION_ERROR
    && outcomeOf({ correct: false, unsupported: true }) === OUTCOME.NOT_EVALUABLE
    && outcomeOf({ correct: true, checkedWithoutEngine: true }) === OUTCOME.CORRECT
    && outcomeOf({ correct: false }) === OUTCOME.INCORRECT,
  'grader flags map to one of the four outcomes (errors are never INCORRECT)');
  ok(isRecordable(OUTCOME.CORRECT) && isRecordable(OUTCOME.INCORRECT) && !isRecordable(OUTCOME.EVALUATION_ERROR) && !isRecordable(OUTCOME.NOT_EVALUABLE),
    'only CORRECT and INCORRECT are recorded as evidence about the learner');
  ok(quizState({}) === STATE.NOT_STARTED && quizState({ answered: 2 }) === STATE.IN_PROGRESS
    && quizState({ finished: true, score: 0.5 }) === STATE.EVALUATED && quizState({ finished: true, score: 0.6 }) === STATE.COMPLETED,
  'quiz states: finished with 60%+ is completed, below that is "try again"');
  ok(projectState({}) === STATE.NOT_STARTED && projectState({ drafts: 1 }) === STATE.IN_PROGRESS && projectState({ graded: 3 }) === STATE.IN_PROGRESS && projectState({ finished: true }) === STATE.COMPLETED,
    'project states: completed only when the final report is handed in');
  ok(lessonState({}) === STATE.NOT_STARTED && lessonState({ tried: true }) === STATE.IN_PROGRESS && lessonState({ done: true }) === STATE.COMPLETED,
    'lesson states: completed only when marked complete');
}

// ================================================================ ADAPTIVE SELECTION
section('question selection');
{
  const { questionWeight } = await import('../server/engine.js');
  const now = Date.now();
  const iso = (daysAgo) => new Date(now - daysAgo * 864e5).toISOString();
  const q = { id: 'q1', difficulty: 2, concept: 'c1' };
  const none = new Set();
  const w = (h, opts = {}) => questionWeight(q, h, opts.recent || none, opts.week || none, opts.weak || none, opts.mastery ?? 50, now);
  const fresh = w(undefined);
  const missed = w({ n: 1, right: 0, lastWrong: iso(1) });
  const due = w({ n: 1, right: 1, lastRight: iso(20) });
  const known = w({ n: 3, right: 3, lastRight: iso(2) });
  const recent = w(undefined, { recent: new Set(['q1']) });
  const weak = w({ n: 1, right: 1, lastRight: iso(2) }, { weak: new Set(['c1']) });
  ok(fresh.reason === 'new' && missed.reason === 'missed-before' && due.reason === 'due-for-review' && known.reason === 'known'
    && recent.reason === 'seen-recently' && weak.reason === 'weak-concept',
  'every drawn question has a reason (new, missed before, due for review, known, seen recently, weak concept)',
  JSON.stringify({ fresh, missed, due, known, recent, weak }));
  ok(missed.w > fresh.w && fresh.w > due.w && due.w > known.w && known.w > recent.w,
    'weights favour: missed before > new > due for review > known > just seen');
  const easyForExpert = questionWeight({ id: 'q2', difficulty: 1 }, undefined, none, none, none, 90, now);
  const fitsExpert = questionWeight({ id: 'q3', difficulty: 3 }, undefined, none, none, none, 90, now);
  ok(fitsExpert.w > easyForExpert.w, 'difficulty follows mastery: a strong learner gets fewer very easy questions');
}

// ================================================================ SAVING ON EXIT
section('saving on exit');
{
  const storeUrl = pathToFileURL(path.join(ROOT, 'server', 'store.js')).href;
  const initUrl = pathToFileURL(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.js')).href;
  const check = (label, ending) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-exit-'));
    const script = `
      import * as store from ${JSON.stringify(storeUrl)};
      await store.openStore(${JSON.stringify(dir)});
      store.run("INSERT INTO work_state (key, kind, state_json, updated_at) VALUES ('item:exit-test', 'item', '{\\"answer\\":\\"=B2*C2\\"}', 'now')");
      console.log('flushed-before-exit=' + store.isFlushed());
      ${ending}
    `;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 20000 });
    return import(initUrl).then(async ({ default: initSqlJs }) => {
      const SQL = await initSqlJs();
      const db = new SQL.Database(fs.readFileSync(path.join(dir, 'academy.db')));
      const rows = db.exec("SELECT state_json FROM work_state WHERE key = 'item:exit-test'");
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
      const saved = rows.length && rows[0].values[0][0].includes('B2*C2');
      ok(/flushed-before-exit=false/.test(r.stdout) && saved, label, `stdout=${r.stdout.trim()} stderr=${r.stderr.trim().slice(0, 200)} saved=${saved}`);
    });
  };
  await check('an answer typed a moment before the app exits is on disk after restart', 'process.exit(0);');
  await check('an answer typed a moment before the app crashes is on disk after restart', "setTimeout(() => { throw new Error('simulated crash'); }, 0);");
}

// ================================================================ GENERATED QUESTIONS
section('generated questions');
{
  const { GENERATORS, resolveGenerated, newGeneratedId, generatorsFor } = await import('../server/content/generated.js');
  const { numbersMatch } = await import('../server/grading/values.js');
  const { getItem, clientItem } = await import('../server/content/index.js');
  const problems = [];
  let built = 0;
  for (const [name, gen] of Object.entries(GENERATORS)) {
    for (const t of gen.topics) if (!content.topicMap[t]) problems.push(`${name}: unknown topic ${t}`);
    for (let seed = 1; seed <= 400; seed++) {
      const id = `g.${name}.${seed * 7919}`;
      const a = resolveGenerated(id, content.topicMap);
      const b = resolveGenerated(id, content.topicMap);
      built++;
      if (!a) { problems.push(`${id}: did not resolve`); continue; }
      if (a.prompt !== b.prompt || a.answer !== b.answer) problems.push(`${id}: not deterministic`);
      if (typeof a.answer !== 'number' || !Number.isFinite(a.answer)) problems.push(`${id}: answer ${a.answer}`);
      if (/undefined|NaN|Infinity|\[object/.test(a.prompt + a.explain)) problems.push(`${id}: broken text`);
      if (!numbersMatch(String(a.answer), a.answer, { tolerance: a.tolerance })) problems.push(`${id}: own answer not accepted`);
      if (numbersMatch(String(a.answer + 1), a.answer, { tolerance: a.tolerance })) problems.push(`${id}: a wrong answer is accepted`);
      if (!a.explain || !a.explain.includes(String(a.answer).replace(/\.0$/, '').split('.')[0])) problems.push(`${id}: explanation does not show the answer`);
      if (problems.length > 10) break;
    }
  }
  ok(problems.length === 0, `${built} generated questions: valid, deterministic (same question after a restart), self-grading`, problems.slice(0, 5).join(' | '));

  const landing = [];
  for (const t of content.topics) for (const g of generatorsFor(t.id)) {
    for (let i = 0; i < 20; i++) { const it = getItem(newGeneratedId(g, t.id)); if (!it || it.topicId !== t.id) landing.push(`${g}->${t.id}`); }
  }
  ok(landing.length === 0, 'a generated question belongs to the topic it was drawn for', landing.slice(0, 3).join(', '));
  ok(!!getItem('g.vat.123') && getItem('g.nosuch.1') === null && getItem('g.vat.abc') === null, 'unknown or malformed generated ids are rejected');
  const safe = clientItem(getItem('g.wavg.4242'));
  ok(safe.answer === undefined && safe.explain === undefined && safe.type === 'number', 'a generated question reaches the browser without its answer');
}

// ================================================================ QUESTION BANK SHAPE
section('question bank');
{
  const { metaOf } = await import('../server/content/index.js');
  const { KINDS, FORMAT } = await import('../server/content/schema.js');
  const all = Object.values(content.items);
  const incomplete = content.bankProblems.filter((p) => p.problem !== 'no explanation');
  ok(incomplete.length === 0, `all ${all.length} questions and tasks carry complete metadata`, incomplete.slice(0, 3).map((p) => `${p.id}: ${p.problem}`).join(' | '));
  const kinds = new Set(all.map((i) => metaOf(i).kind));
  ok(['concept', 'tool-selection', 'formula-writing', 'sql-writing', 'debugging', 'scenario', 'interpretation'].every((k) => kinds.has(k)) && [...kinds].every((k) => KINDS.includes(k)),
    `the bank covers the required kinds of question (${[...kinds].join(', ')})`);
  // options are shown in a fixed order per question, so the answer's position gives nothing away
  const { displayOrder, toShownAnswer, toStoredAnswer, shownExplain, startOrder } = await import('../server/content/index.js');
  const mcs = all.filter((i) => i.type === 'mc');
  const broken = mcs.filter((i) => {
    const o = displayOrder(i);
    return !o || new Set(o).size !== i.options.length || o.some((_, d) => toShownAnswer(i, toStoredAnswer(i, d)) !== d) || toStoredAnswer(i, toShownAnswer(i, i.answer)) !== i.answer;
  });
  ok(broken.length === 0, `all ${mcs.length} multiple-choice questions have a valid, reversible display order`, broken.slice(0, 3).map((i) => i.id).join(', '));
  const spread = {};
  for (const i of mcs) { const p = toShownAnswer(i, i.answer); spread[p] = (spread[p] || 0) + 1; }
  const maxShare = Math.max(...Object.values(spread)) / mcs.length;
  ok(maxShare < 0.35, `the right answer is spread across shown positions (largest share ${Math.round(maxShare * 100)}%)`, JSON.stringify(spread));
  ok(toStoredAnswer(mcs[0], 99) === 99 && toStoredAnswer(mcs[0], null) === null, 'an out-of-range choice ("I don\'t know") is never turned into a real option');
  {
    const sample = { id: 'demo-explain', type: 'mc', options: ['a', 'b', 'c', 'd'], answer: 0 };
    const o = displayOrder(sample);
    const where = (written) => o.indexOf(written) + 1;
    const text = shownExplain(sample, 'Option 1 is right. Options 2 and 4 are traps.');
    const expectPair = [where(1), where(3)].sort((a, b) => a - b);
    ok(text === `Option ${where(0)} is right. Options ${expectPair[0]} and ${expectPair[1]} are traps.`, 'explanations that name option numbers are renumbered to what is shown', text);
  }
  const orders = all.filter((i) => i.type === 'order');
  const readyMade = orders.filter((i) => JSON.stringify(startOrder(i)) === JSON.stringify(i.answer));
  ok(orders.length > 0 && readyMade.length === 0, `no ordering question (${orders.length}) starts in the right order`, readyMade.map((i) => i.id).join(', '));

  const formats = new Set(all.map((i) => metaOf(i).format));
  ok(['multiple-choice', 'true-false', 'formula-writing', 'sql-writing'].every((f) => formats.has(f)) && [...formats].every((f) => Object.values(FORMAT).includes(f)),
    `every question has a known format (${[...formats].join(', ')})`);
}

console.log(`\n${pass}/${pass + failures.length} checks passed.`);
if (failures.length) { console.log('Failed:\n - ' + failures.join('\n - ')); process.exit(1); }
process.exit(0);
