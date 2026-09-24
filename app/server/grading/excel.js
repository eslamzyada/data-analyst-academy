// Checks an uploaded workbook: reads the yellow answer cells on the "Answers" sheet
// (formula results are read from the values Excel saved) and compares them.
import ExcelJS from 'exceljs';
import { answerMatches } from './values.js';

function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ('result' in v) return cellValue(v.result);
    if ('formula' in v || 'sharedFormula' in v) return null; // formula without a saved result
    if (v.richText) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
    if ('error' in v) return v.error;
  }
  return v;
}

export async function readAnswerCells(buffer, count) {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error('That file could not be opened as an Excel workbook (.xlsx). Save it as "Excel Workbook (*.xlsx)" and try again.');
  }
  const ws = wb.worksheets.find((w) => w.name.trim().toLowerCase() === 'answers');
  if (!ws) throw new Error('The workbook has no "Answers" sheet. Use the file you downloaded from the app, and keep the Answers sheet.');
  const values = [];
  let formulas = 0;
  for (let i = 0; i < count; i++) {
    const cell = ws.getCell(5 + i, 3);
    const raw = cell.value;
    if (raw && typeof raw === 'object' && ('formula' in raw || 'sharedFormula' in raw)) formulas++;
    values.push(cellValue(raw));
  }
  let dataFormulas = 0;
  for (const w of wb.worksheets) {
    if (w === ws) continue;
    w.eachRow((row) => row.eachCell((c) => { if (c.value && typeof c.value === 'object' && ('formula' in c.value || 'sharedFormula' in c.value)) dataFormulas++; }));
  }
  return { values, formulas, dataFormulas };
}

/** questions: [{ label, percent?, tolerance? }], expected: [...] */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** "2026-03", "March", "Mar 2026", "3" all match an expected "2026-03". */
function monthMatches(given, expected) {
  const m = Number(String(expected).slice(5, 7));
  const g = String(given).trim().toLowerCase();
  if (g === String(expected).toLowerCase()) return true;
  const named = MONTHS.findIndex((x) => g.includes(x));
  if (named >= 0) return named + 1 === m;
  const num = /^(?:\d{4}[-/.])?(\d{1,2})$/.exec(g);
  return !!num && Number(num[1]) === m;
}

/**
 * A day, written any clear way, matches an expected "2026-02-11": 2026-02-11, 11 February 2026,
 * Feb 11 2026, 11/02/2026. A slash date whose day and month could be swapped (02/11/2026) only
 * counts when both readings give the same day, so a misread date is never accepted.
 */
export function dateMatches(given, expected) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(expected));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const g = String(given ?? '').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!g) return false;
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[t ].*)?$/.exec(g);
  if (iso) return Number(iso[1]) === y && Number(iso[2]) === mo && Number(iso[3]) === d;
  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(g);
  if (slash) {
    const [a, b, yy] = [Number(slash[1]), Number(slash[2]), Number(slash[3])];
    if (yy !== y) return false;
    const dayFirst = a === d && b === mo;
    const monthFirst = a === mo && b === d;
    const ambiguous = a <= 12 && b <= 12 && a !== b;
    return ambiguous ? false : dayFirst || monthFirst;
  }
  const words = g.split(' ');
  const monthIdx = words.findIndex((w) => MONTHS.includes(w.slice(0, 3)) && /^[a-z]+$/.test(w));
  if (monthIdx < 0 || MONTHS.indexOf(words[monthIdx].slice(0, 3)) + 1 !== mo) return false;
  const nums = words.filter((w) => /^\d+$/.test(w)).map(Number);
  const day = nums.find((n) => n >= 1 && n <= 31);
  const year = nums.find((n) => n > 31);
  return day === d && (year === undefined || year === y);
}

export function gradeParts(questions, expected, given) {
  const parts = questions.map((q, i) => {
    const g = given[i];
    const has = g !== null && g !== undefined && String(g).trim() !== '';
    const exp = q.accept || expected[i];
    const ok = has && (q.month ? monthMatches(g, exp) : q.date ? dateMatches(g, exp) : answerMatches(g, exp, { percent: q.percent, tolerance: q.tolerance }));
    return { label: q.label, given: has ? g : null, correct: ok, concept: q.concept };
  });
  const correct = parts.filter((p) => p.correct).length;
  return { parts, correct, total: parts.length, score: parts.length ? correct / parts.length : 0 };
}
