// Forgiving value comparison used by every grader.

export function normText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse "1,234.50", "$1,234", "18.5%", "(200)" etc. Returns NaN if not numeric. */
export function parseNumber(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$€£\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  if (s.endsWith('%')) s = s.slice(0, -1);
  if (/^-?\d*[.,]?\d+(e-?\d+)?$/i.test(s)) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

/**
 * Compare a learner number with the expected one.
 * tolerance: absolute tolerance (default: 0.5% of the value, at least 0.01).
 * percent: if true, 0.185 and 18.5 are both accepted for 18.5.
 */
export function numbersMatch(given, expected, { tolerance, percent = false } = {}) {
  const g = parseNumber(given);
  if (Number.isNaN(g)) return false;
  const tol = tolerance ?? Math.max(0.01, Math.abs(expected) * 0.005);
  if (Math.abs(g - expected) <= tol) return true;
  if (percent && Math.abs(g * 100 - expected) <= tol) return true;
  return false;
}

export function textMatches(given, expected) {
  const g = normText(given);
  const accepted = Array.isArray(expected) ? expected : [expected];
  return accepted.some((e) => {
    const x = normText(e);
    if (!g) return false;
    if (g === x) return true;
    // accept "Northline" for "Northline Supply", or "clean water program" for "Clean Water"
    return (g.length >= 4 && x.includes(g) && g.length / x.length >= 0.5) || (x.length >= 4 && g.includes(x));
  });
}

/** Generic single answer check; expected can be number, string, or array of accepted strings. */
export function answerMatches(given, expected, opts = {}) {
  if (typeof expected === 'number') return numbersMatch(given, expected, opts);
  return textMatches(given, expected);
}
