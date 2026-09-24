// Excel formula grading.
//
// The learner's formula is evaluated on the practice grid and compared with the result of the
// reference formula, so any correct method passes.
//
// Why "There is no AST with such key in the cache" happened
//   HyperFormula caches every parsed formula under a key made from the formula's *tokens*, and
//   then silently rewrites reversed ranges (B4:B2 -> B2:B4) in the cell. Its copy/paste looks
//   the parse up again under a key made from the *rewritten* formula, which was never cached.
//   The old grader filled formulas down with copy/paste, so any correct answer written with a
//   bottom-up or right-to-left range (=SUM(B9:B2), =COUNTIF($A$9:$A$2,A2)) crashed the check.
//
// Reliability rules (a failing engine must never mean a wrong answer):
//   * Every evaluation builds its own engine and destroys it in a finally block.
//   * Fill-down translates the references itself; the grader never calls copy/paste, cut,
//     move, row/column insertion, named expressions or undo - the only engine features that
//     read that cache (tools/test-grading.js enforces this).
//   * Ranges are written top-left first before the engine sees them, as Excel does.
//   * Engine failure: retry once on a fresh engine, then compare the text with the model and
//     accepted answers, and otherwise return "not checked" - never "incorrect".
import { HyperFormula } from 'hyperformula';

const CONFIG = {
  licenseKey: 'gpl-v3',
  useArrayArithmetic: true,
  dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD.MM.YYYY'],
  smartRounding: true,
};
const UNSUPPORTED = ['LET', 'LAMBDA', 'TAKE', 'DROP', 'SORTBY', 'CHOOSECOLS', 'CHOOSEROWS', 'VSTACK', 'HSTACK', 'TEXTSPLIT', 'GROUPBY', 'PIVOTBY', 'SEQUENCE',
  // not in the calculator; a correct formula using them must not be marked wrong
  'RANK.AVG', 'TREND', 'PERCENTRANK', 'PERCENTRANK.INC', 'PERCENTRANK.EXC', 'TRIMMEAN', 'AGGREGATE', 'MODE', 'MODE.SNGL', 'MODE.MULT', 'NUMBERVALUE'];
// TEXT is calculated, but month names, day names and % formats come out wrong
const TEXT_FORMAT_UNSUPPORTED = /\bTEXT\s*\([^"]*"[^"]*(m{3,}|d{3,}|%)[^"]*"/i;

// ---------------------------------------------------------------- A1 helpers
export function colToIdx(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export function idxToCol(i) {
  let s = '';
  i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
export function parseAddr(a) {
  const m = /^([A-Z]+)(\d+)$/i.exec(String(a).trim());
  if (!m) throw new Error(`Bad cell address ${a}`);
  return { col: colToIdx(m[1]), row: Number(m[2]) - 1 };
}

// ---------------------------------------------------------------- rewriting Excel-only syntax
function splitArgs(s) {
  const args = [];
  let depth = 0, q = false, cur = '';
  for (const c of s) {
    if (c === '"') q = !q;
    if (!q && (c === '(' || c === '{')) depth++;
    if (!q && (c === ')' || c === '}')) depth--;
    if (!q && depth === 0 && c === ',') { args.push(cur); cur = ''; continue; }
    cur += c;
  }
  args.push(cur);
  return args;
}

const REWRITES = {
  AVERAGEIFS: (a) => `(SUMIFS(${a.join(',')})/COUNTIFS(${a.slice(1).join(',')}))`,
  XMATCH: (a) => `MATCH(${a[0]},${a[1]},0)`,
  CONCAT: (a) => `CONCATENATE(${a.join(',')})`,
  TEXTBEFORE: (a) => `LEFT(${a[0]},FIND(${a[1]},${a[0]})-1)`,
  TEXTAFTER: (a) => `MID(${a[0]},FIND(${a[1]},${a[0]})+LEN(${a[1]}),LEN(${a[0]}))`,
  DATEDIF: (a) => `DATEDIF(${a[0]},${a[1]},UPPER(${a[2]}))`,
  // RANK(number, ref, [order]): largest first unless order is non-zero
  RANK: (a) => rankRewrite(a),
  'RANK.EQ': (a) => rankRewrite(a),
  // straight-line forecast and intercept from SLOPE and AVERAGE
  INTERCEPT: (a) => `(AVERAGE(${a[0]})-SLOPE(${a[0]},${a[1]})*AVERAGE(${a[1]}))`,
  // Excel reads INDEX(one-row range, n) as column n; the calculator reads n as a row
  INDEX: (a) => (a.length === 2 && isOneRowRange(a[0]) ? `INDEX(${a[0]},1,${a[1]})` : `INDEX(${a.join(',')})`),
  FORECAST: (a) => forecastRewrite(a),
  'FORECAST.LINEAR': (a) => forecastRewrite(a),
};
function isOneRowRange(ref) {
  const m = /^\s*\$?[A-Za-z]{1,3}\$?(\d{1,7}):\$?[A-Za-z]{1,3}\$?(\d{1,7})\s*$/.exec(String(ref));
  return !!m && m[1] === m[2];
}
function rankRewrite(a) {
  const desc = `(COUNTIF(${a[1]},">"&${a[0]})+1)`;
  const asc = `(COUNTIF(${a[1]},"<"&${a[0]})+1)`;
  if (a.length < 3 || !String(a[2]).trim()) return desc;
  return `IF((${a[2]})=0,${desc},${asc})`;
}
function forecastRewrite(a) {
  return `(AVERAGE(${a[1]})+SLOPE(${a[1]},${a[2]})*((${a[0]})-AVERAGE(${a[2]})))`;
}

/** Rewrites function calls recursively (innermost first). */
function rewriteCalls(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') { const j = src.indexOf('"', i + 1); out += src.slice(i, j === -1 ? src.length : j + 1); i = j === -1 ? src.length : j + 1; continue; }
    const m = /^([A-Za-z_][A-Za-z0-9_.]*)\s*\(/.exec(src.slice(i));
    if (m && (i === 0 || !/[A-Za-z0-9_.$]/.test(src[i - 1]))) {
      const name = m[1].toUpperCase();
      let depth = 0, q = false, j = i + m[0].length - 1;
      for (; j < src.length; j++) {
        const ch = src[j];
        if (ch === '"') q = !q;
        if (q) continue;
        if (ch === '(') depth++;
        if (ch === ')') { depth--; if (depth === 0) break; }
      }
      const inner = src.slice(i + m[0].length, j);
      const args = splitArgs(inner).map((a) => rewriteCalls(a));
      out += REWRITES[name] ? REWRITES[name](args) : `${name}(${args.join(',')})`;
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// A1 ranges: B4:B2, $C$9:$A$2, C:A, 9:2 (not inside quotes, not part of a sheet name)
const CELL_RANGE = /(?<![A-Za-z0-9_$!.])(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7}):(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g;
const COL_RANGE = /(?<![A-Za-z0-9_$!.:])(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![A-Za-z0-9_(:])/g;
const ROW_RANGE = /(?<![A-Za-z0-9_$!.:])(\$?)(\d{1,7}):(\$?)(\d{1,7})(?![A-Za-z0-9_(:])/g;

function outsideStrings(text, fn) {
  return text.split(/("[^"]*")/).map((part, i) => (i % 2 ? part : fn(part))).join('');
}

/**
 * Write every range top-left first, as Excel itself does when you type =SUM(B4:B2).
 * Besides making the text comparison fair, this keeps reversed ranges away from the engine:
 * HyperFormula rewrites them internally, and its formula cache then no longer matches the
 * cell (the "There is no AST with such key in the cache" failure).
 */
export function orderRanges(formula) {
  return outsideStrings(String(formula || ''), (s) => s
    .replace(CELL_RANGE, (m, c1a, c1, r1a, r1, c2a, c2, r2a, r2) => {
      const [cA, cB] = colToIdx(c1) <= colToIdx(c2) ? [[c1a, c1], [c2a, c2]] : [[c2a, c2], [c1a, c1]];
      const [rA, rB] = Number(r1) <= Number(r2) ? [[r1a, r1], [r2a, r2]] : [[r2a, r2], [r1a, r1]];
      return `${cA[0]}${cA[1]}${rA[0]}${rA[1]}:${cB[0]}${cB[1]}${rB[0]}${rB[1]}`;
    })
    .replace(COL_RANGE, (m, a1, c1, a2, c2) => (colToIdx(c1) <= colToIdx(c2) ? m : `${a2}${c2}:${a1}${c1}`))
    .replace(ROW_RANGE, (m, a1, r1, a2, r2) => (Number(r1) <= Number(r2) ? m : `${a2}${r2}:${a1}${r1}`)));
}

/** Normalise what a learner typed into something the engine accepts. */
export function normaliseFormula(input) {
  let f = String(input || '').trim();
  if (!f) return '';
  if (f.startsWith('+')) f = '=' + f.slice(1);
  if (!f.startsWith('=')) f = '=' + f;
  f = f.replace(/^=\s*@/, '=');
  const outsideQuotes = f.replace(/"[^"]*"/g, '');
  if (outsideQuotes.includes(';') && !outsideQuotes.includes(',')) f = f.replace(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ',');
  f = f.replace(/[“”]/g, '"');
  let body = rewriteCalls(f.slice(1));
  body = body.replace(/("[^"]*")|\b(TRUE|FALSE)\b(?!\s*\()/gi, (m, str, b) => (str ? str : `${b.toUpperCase()}()`));
  return '=' + orderRanges(body);
}

export function usedUnsupported(input) {
  const names = [...String(input).toUpperCase().matchAll(/([A-Z][A-Z0-9.]*)\s*\(/g)].map((m) => m[1]);
  const out = names.filter((n) => UNSUPPORTED.includes(n));
  if (TEXT_FORMAT_UNSUPPORTED.test(String(input))) out.push('TEXT with month names, day names or %');
  return out;
}

// ---------------------------------------------------------------- reference translation (fill-down)
const REF = /(?<![A-Za-z0-9_$!.])(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?![A-Za-z0-9_(])/g;

/**
 * Shift the relative parts of every A1 reference, exactly like dragging a formula down or across.
 * Does the job the spreadsheet clipboard used to do, with no engine state involved.
 */
export function translateFormula(formula, dRow, dCol) {
  if (!dRow && !dCol) return formula;
  let out = '';
  let i = 0;
  while (i < formula.length) {
    const c = formula[i];
    if (c === '"') { const j = formula.indexOf('"', i + 1); out += formula.slice(i, j === -1 ? formula.length : j + 1); i = j === -1 ? formula.length : j + 1; continue; }
    REF.lastIndex = i;
    const m = REF.exec(formula);
    if (m && m.index === i) {
      const [, colAbs, colLetters, rowAbs, rowDigits] = m;
      const col = colAbs ? colToIdx(colLetters) : colToIdx(colLetters) + dCol;
      const row = rowAbs ? Number(rowDigits) - 1 : Number(rowDigits) - 1 + dRow;
      out += col < 0 || row < 0 ? '#REF!' : `${colAbs}${idxToCol(col)}${rowAbs}${row + 1}`;
      i += m[0].length;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- evaluation
function valueOut(v) {
  if (v && typeof v === 'object' && 'type' in v) return { error: `#${String(v.type).replace('DIV_BY_ZERO', 'DIV/0!').replace('NA', 'N/A')}`, message: v.message };
  return v;
}

/**
 * Evaluate `formula` at `target`, filled to `fillTo` when given.
 * Returns { cells, spill } | { parseError } | { engineError }
 */
export const MAX_FORMULA_LENGTH = 8192;   // Excel's own limit

export function evaluate(grid, formula, target, fillTo) {
  const f = normaliseFormula(formula);
  if (!f || f === '=') return { parseError: 'Type a formula first (it starts with =).' };
  if (f.length > MAX_FORMULA_LENGTH) return { parseError: `Excel formulas can be at most ${MAX_FORMULA_LENGTH.toLocaleString('en-US')} characters long.` };
  let hf = null;
  try {
    const t = parseAddr(target);
    const end = fillTo ? parseAddr(fillTo) : t;
    const data = grid.rows.map((r) => r.map((v) => (v === undefined ? null : v)));
    hf = HyperFormula.buildFromArray(data, CONFIG);

    // Write the formula into every cell of the fill range, translating references ourselves.
    // Each cell is parsed fresh from text, so no cached parse can be missing. (A syntax error
    // does not throw here: it comes back as an #ERROR value, which is graded normally.)
    const block = [];
    for (let r = t.row; r <= end.row; r++) {
      const row = [];
      for (let c = t.col; c <= end.col; c++) row.push(translateFormula(f, r - t.row, c - t.col));
      block.push(row);
    }
    hf.setCellContents({ sheet: 0, row: t.row, col: t.col }, block);

    const cells = [];
    for (let r = t.row; r <= end.row; r++) {
      for (let c = t.col; c <= end.col; c++) {
        cells.push({ addr: `${idxToCol(c)}${r + 1}`, value: valueOut(hf.getCellValue({ sheet: 0, row: r, col: c })) });
      }
    }
    if (fillTo) return { cells, spill: null };

    // a single formula may spill (FILTER / UNIQUE / SORT): collect the block it fills
    const vals = hf.getSheetValues(0);
    const below = [];
    for (let r = t.row; r < vals.length; r++) {
      const row = [];
      for (let c = t.col; c < (vals[r] || []).length; c++) {
        const orig = grid.rows[r] ? grid.rows[r][c] : undefined;
        const now = vals[r][c];
        if ((orig === undefined || orig === null) && now !== null && now !== undefined) row.push(valueOut(now));
        else break;
      }
      if (!row.length) break;
      below.push(row);
    }
    const spill = below.length > 1 || (below[0] && below[0].length > 1) ? below : null;
    return { cells, spill };
  } catch (e) {
    // the engine itself failed: never a verdict on the learner's answer
    return { engineError: String((e && e.message) || e) };
  } finally {
    try { hf && hf.destroy(); } catch { /* already gone */ }
  }
}

// ---------------------------------------------------------------- comparison
function same(a, b) {
  if (a && typeof a === 'object' && a.error) return !!(b && typeof b === 'object' && b.error === a.error);
  if (b && typeof b === 'object' && b.error) return false;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-9);
  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim();
  return a === b;
}

/** Text comparison used when the engine can't run: ignores spacing, case, separators and range order. */
export function sameFormulaText(a, b) {
  const norm = (s) => normaliseFormula(s)
    .replace(/\s+/g, '')
    .replace(/"([^"]*)"/g, (m, inner) => `"${inner.toLowerCase()}"`)
    .toUpperCase();
  return !!a && !!b && norm(a) === norm(b);
}

// Reference results per item. Only successful evaluations are kept, so a failure is always
// retried on the next check. The cache lives in memory: a restart simply recomputes it.
const refCache = new Map();

/** Test hook: lets the tests break the engine on purpose. */
let evaluator = evaluate;
export function setEvaluatorForTests(fn) { evaluator = fn || evaluate; }

/**
 * Evaluate with one retry. Every attempt uses a brand-new engine, so a second attempt is a
 * genuine regeneration, not a second look at the same broken state.
 */
function evaluateWithRetry(grid, formula, target, fillTo) {
  const first = evaluator(grid, formula, target, fillTo);
  if (!first.engineError) return { ...first, attempts: 1 };
  console.error(`formula engine failed, retrying: ${first.engineError}`);
  const second = evaluator(grid, formula, target, fillTo);
  return { ...second, attempts: 2, firstError: first.engineError };
}

function referenceResult(item) {
  const hit = refCache.get(item.id);
  if (hit) return hit;
  const res = evaluateWithRetry(item.grid, item.answer, item.target, item.fillTo);
  if (!res.engineError && !res.parseError) refCache.set(item.id, res);
  return res;
}

/**
 * Grade a formula. The result always says how the verdict was reached (`method`):
 *   engine        calculated and compared with the model answer's result
 *   text-match    the calculator failed twice, but the formula is the model answer (or an
 *                 accepted variant) written differently
 *   none          no verdict: `engineError` says why; the answer is NOT marked wrong
 */
export function gradeFormula(item, formula) {
  const input = String(formula || '').trim();
  if (!input || input === '=') return { correct: false, score: 0, feedback: 'Type a formula first (it starts with =).', noMistake: true, method: 'none' };

  const unsupported = usedUnsupported(input);
  if (unsupported.length) {
    return {
      correct: false, score: 0, unsupported: true, noMistake: true, method: 'none',
      feedback: `This practice grid can't calculate ${unsupported.join(', ')} yet, so it can't check your answer automatically. Your formula may well be right: try it in real Excel. Here, an approach with FILTER, SORT, INDEX/MATCH or XLOOKUP can be checked.`,
    };
  }

  const exp = referenceResult(item);
  const got = evaluateWithRetry(item.grid, input, item.target, item.fillTo);

  // ---- the calculator failed (twice) on either side: fall back, never mark wrong
  if (exp.engineError || got.engineError || exp.parseError) {
    const why = exp.engineError || got.engineError || `model answer could not be calculated: ${exp.parseError}`;
    const accepted = [item.answer, ...(item.accept || [])];
    if (accepted.some((a) => sameFormulaText(input, a))) {
      return { correct: true, score: 1, method: 'text-match', checkedWithoutEngine: true, engineError: why, feedback: 'Correct. (The calculator was unavailable, so your formula was matched against the model answer instead.)' };
    }
    return {
      correct: false, score: 0, noMistake: true, needsReview: true, method: 'none', engineError: why,
      feedback: 'The formula calculator could not check this answer, so nothing has been marked wrong. Your work is saved. Try checking again in a moment, or compare with the model solution and mark it yourself.',
    };
  }
  if (got.parseError) return { correct: false, score: 0, feedback: `Excel couldn't read that formula: ${got.parseError}`, noMistake: true, method: 'engine' };

  const cells = got.cells;
  const firstErr = cells.find((c) => c.value && c.value.error);
  const refs = /\$?[A-Z]{1,3}\$?\d+/i.test(input.replace(/"[^"]*"/g, ''));
  let ok = cells.length === exp.cells.length && cells.every((c, i) => same(c.value, exp.cells[i].value));
  if (ok && exp.spill) {
    ok = !!got.spill && got.spill.length === exp.spill.length && got.spill.every((row, i) => row.length === exp.spill[i].length && row.every((v, j) => same(v, exp.spill[i][j])));
  }
  if (ok && !refs) {
    return { correct: false, score: 0.3, cells, method: 'engine', feedback: 'The number is right, but you typed it in. Use cell references, so the answer updates when the data changes.' };
  }
  if (ok) return { correct: true, score: 1, cells, spill: got.spill, method: 'engine', feedback: item.fillTo ? 'It still works when copied down to every row.' : null };

  let feedback;
  const syntax = firstErr && firstErr.value.error === '#ERROR' && /Parsing error/i.test(firstErr.value.message || '');
  if (syntax) {
    feedback = 'Excel could not read that formula: check for a missing bracket, comma or quote mark.';
  } else if (firstErr) {
    const e = firstErr.value.error;
    feedback = e === '#NAME?' ? 'Excel does not recognise a name in your formula (#NAME?). Check the function spelling and that text is inside "quotes".'
      : e === '#N/A' ? 'Your lookup could not find a match (#N/A). Check the lookup value, the column you search in, and whether it needs an exact match.'
        : e === '#VALUE!' ? 'A #VALUE! error usually means text is being used where a number is expected, or ranges of different sizes.'
          : e === '#REF!' ? 'A #REF! error means a reference points outside the table.'
            : e === '#DIV/0!' ? 'You are dividing by zero (#DIV/0!). Wrap it with IFERROR, or check the denominator.'
              : `Your formula returns an error (${e}).`;
    if (item.fillTo && !(cells[0].value && cells[0].value.error)) {
      feedback = `${item.target} works, but after copying down ${firstErr.addr} shows ${e}. Do some references need $ signs to stay fixed?`;
    }
  } else if (item.fillTo && same(cells[0].value, exp.cells[0].value)) {
    const bad = cells.find((c, i) => !same(c.value, exp.cells[i].value));
    feedback = `${item.target} is right, but after copying down ${bad.addr} is wrong. When a formula is copied, relative references move. Lock the ones that must not move with $ (for example $F$1).`;
  } else {
    feedback = 'Your formula gives a different result from the expected one. Check which range you sum or look up in, and your conditions.';
  }
  return { correct: false, score: 0, cells, spill: got.spill, method: 'engine', noMistake: syntax || undefined, feedback };
}

/** Used by the content validator. */
export function checkReference(item) {
  const r = evaluate(item.grid, item.answer, item.target, item.fillTo);
  if (r.engineError) return `engine error: ${r.engineError}`;
  if (r.parseError) return r.parseError;
  const bad = r.cells.find((c) => c.value && c.value.error);
  return bad ? `${bad.addr} -> ${bad.value.error} ${bad.value.message || ''}` : null;
}

/** Test hook: clears the cached reference results. */
export function clearFormulaCache() {
  refCache.clear();
}
