// Grading for Real Analyst work: parts that have more than one good answer.
//
//   tools       which tool(s) you would use, and why. Every tool has a verdict for this job (best,
//               good, weak) and a rating on the six things that decide it: correctness,
//               scalability, repeatability, clarity, data volume and business need. Any "best"
//               tool earns full marks; a "good" one most of them; choosing a "weak" one costs marks.
//   select      pick every statement that is true (data problems, data you need, metrics that
//               matter, weaknesses in a conclusion). Right picks score, wrong picks cost.
//   scope       choose the best reading of a request. Options carry partial credit.
//   numbers     findings checked against the data (grading/excel.js gradeParts).
//   conclusion  a written conclusion: key points plus the reasoning rubric (grading/reasoning.js).
import { gradeParts } from './excel.js';
import { autoCheck } from './text.js';
import { detectReasoning, scoreReasoning } from './reasoning.js';
import { normText } from './values.js';

export const TOOLS = Object.freeze([
  { id: 'excel', name: 'Excel' }, { id: 'sql', name: 'SQL' }, { id: 'pq', name: 'Power Query' }, { id: 'pbi', name: 'Power BI' },
]);
export const TOOL_NAME = Object.fromEntries(TOOLS.map((t) => [t.id, t.name]));

/** The six things that decide a tool choice, in the order ratings are written ('210122'). */
export const TOOL_CRITERIA = Object.freeze([
  { id: 'correctness', label: 'Correctness', words: ['correct', 'accura', 'right answer', 'mistake', 'error', 'reliab', 'exact', 'trust'] },
  { id: 'scalability', label: 'Scalability', words: ['scale', 'grow', 'bigger', 'more data', 'future', 'larger'] },
  { id: 'repeatability', label: 'Repeatability', words: ['repeat', 'refresh', 'every month', 'every week', 'monthly', 'weekly', 'recurr', 'automat', 'again', 'next month', 'next quarter', 'reuse', 'one-off', 'one off', 'once', 'come back', 'rerun', 're-run', 'recorded', 'every step'] },
  { id: 'clarity', label: 'Clarity', words: ['clear', 'read', 'understand', 'explain', 'audit', 'transparen', 'show', 'visual', 'simple'] },
  { id: 'volume', label: 'Data volume', words: ['rows', 'volume', 'large', 'million', 'thousand', 'size', 'small', 'big', 'performance', 'slow', 'fast'] },
  { id: 'need', label: 'Business need', words: ['manager', 'director', 'deadline', 'today', 'need', 'audience', 'stakeholder', 'decision', 'self-serve', 'self serve', 'board', 'quick', 'minutes', 'hour', 'afternoon', 'meeting', 'urgent', 'friday', 'this week', 'asked'] },
]);

const RATING_WORD = ['weak', 'fair', 'strong'];

/** '210122' → { correctness: 2, scalability: 1, ... } */
export function parseRatings(r) {
  const s = String(r || '');
  return Object.fromEntries(TOOL_CRITERIA.map((c, i) => [c.id, Number(s[i] ?? 1)]));
}

function mentioned(text) {
  const t = normText(text);
  return TOOL_CRITERIA.filter((c) => c.words.some((w) => t.includes(w))).map((c) => c.id);
}

export function gradeTools(part, answer = {}) {
  const chosen = [...new Set((answer.tools || []).filter((t) => part.tools[t]))];
  const why = String(answer.why || '');
  const verdict = (t) => part.tools[t].verdict;
  let choice = 0;
  if (chosen.length) {
    choice = chosen.some((t) => verdict(t) === 'best') ? 1 : chosen.some((t) => verdict(t) === 'good') ? 0.7 : 0.2;
    choice -= 0.3 * chosen.filter((t) => verdict(t) === 'weak').length;
    if (chosen.length && chosen.every((t) => verdict(t) === 'weak')) choice = Math.min(choice, 0.2);
    choice = Math.max(0, choice);
  }
  const reasons = mentioned(why);
  const justify = reasons.length >= 2 ? 1 : reasons.length === 1 ? 0.5 : 0;
  const score = chosen.length ? 0.8 * choice + 0.2 * justify : 0;
  const best = TOOLS.filter((t) => part.tools[t.id]?.verdict === 'best').map((t) => t.name);
  return {
    score: Math.round(score * 100) / 100,
    correct: score >= 0.999,
    tools: TOOLS.filter((t) => part.tools[t.id]).map((t) => ({
      id: t.id, name: t.name, chosen: chosen.includes(t.id), verdict: part.tools[t.id].verdict, why: part.tools[t.id].why,
      ratings: Object.entries(parseRatings(part.tools[t.id].rate)).map(([k, v]) => ({ criterion: k, label: TOOL_CRITERIA.find((c) => c.id === k).label, rating: v, word: RATING_WORD[v] })),
    })),
    mentioned: reasons.map((r) => TOOL_CRITERIA.find((c) => c.id === r).label),
    feedback: !chosen.length ? 'Choose at least one tool.'
      : choice >= 1 ? `A good choice for this job.${best.length > 1 ? ` ${best.join(' and ')} are both strong here: there is more than one right way.` : ''}`
        : choice >= 0.7 ? `That works. ${best.join(' or ')} would suit this job better: see why below.`
          : `That tool would struggle with this job. ${best.join(' or ')} would suit it better: see why below.`,
    justification: reasons.length >= 2 ? 'Your reasons cover the things that matter here.'
      : reasons.length === 1 ? 'Your reasons mention one thing that matters. Say which others (volume, repeatability, the audience…) decided it.'
        : 'Say why: which of correctness, scale, repeatability, clarity, data volume or the business need decided it?',
  };
}

/** Pick every true statement. Right picks count, wrong picks cost, missed ones are listed. */
export function gradeSelect(part, answer) {
  const picked = new Set((Array.isArray(answer) ? answer : []).map(Number).filter((i) => i >= 0 && i < part.options.length));
  const right = part.options.map((o, i) => (o.right ? i : -1)).filter((i) => i >= 0);
  const hits = right.filter((i) => picked.has(i)).length;
  const falseAlarms = [...picked].filter((i) => !part.options[i].right).length;
  const score = Math.max(0, Math.min(1, (hits - falseAlarms) / Math.max(1, right.length)));
  return {
    score: Math.round(score * 100) / 100,
    correct: hits === right.length && falseAlarms === 0,
    options: part.options.map((o, i) => ({ text: o.text, picked: picked.has(i), right: !!o.right, why: o.why || null })),
    feedback: `You found ${hits} of ${right.length}${falseAlarms ? `, and picked ${falseAlarms} that ${falseAlarms === 1 ? 'is' : 'are'} not right` : ''}.`,
  };
}

/** Choose the best reading of the request (or the best decision). Options carry partial credit. */
export function gradeScope(part, answer) {
  const i = Number(answer);
  const opt = Number.isInteger(i) ? part.options[i] : null;
  const score = opt ? opt.score : 0;
  return {
    score, correct: score >= 0.999,
    options: part.options.map((o, k) => ({ text: o.text, chosen: k === i, score: o.score, why: o.why || null })),
    feedback: !opt ? 'Choose one.' : score >= 0.999 ? 'That is the question that matters here.' : score >= 0.5 ? 'Partly: there is a better reading. See below.' : 'That would answer a different question. See below.',
  };
}

export function gradeNumbers(part, answer) {
  const g = gradeParts(part.questions, part.expected, Array.isArray(answer) ? answer : []);
  return { ...g, correct: g.score >= 0.999, feedback: `${g.correct} of ${g.total} findings match the data.` };
}

/**
 * A written conclusion, in two steps: the text comes back with what the app found (key points and
 * the six reasoning qualities); with the learner's ticks it gets a score.
 */
export function gradeConclusion(part, answer, ticks = null) {
  const text = typeof answer === 'object' && answer ? Object.values(answer).join('\n') : String(answer || '');
  const reasoning = detectReasoning(text, part.reasoning || {});
  const points = autoCheck(part.checklist || [], text);
  if (!ticks) return { score: null, reasoning, points, feedback: 'Compare your conclusion with the checks below, tick what you really covered, then save.' };
  const r = scoreReasoning(reasoning, ticks.reasoning || null);
  const pTicks = ticks.points || points.map((p) => p.detected);
  const p = points.length ? pTicks.filter(Boolean).length / points.length : null;
  const score = p === null ? r : 0.5 * p + 0.5 * r;
  return { score: Math.round(score * 100) / 100, correct: score >= 0.999, reasoning, points, reasoningScore: Math.round(r * 100) / 100, pointsScore: p === null ? null : Math.round(p * 100) / 100 };
}

export function gradePart(part, answer, extra = {}) {
  switch (part.type) {
    case 'tools': return gradeTools(part, answer || {});
    case 'select': return gradeSelect(part, answer);
    case 'scope': return gradeScope(part, answer);
    case 'numbers': return gradeNumbers(part, answer);
    case 'conclusion': return gradeConclusion(part, answer, extra.ticks || null);
    default: throw new Error(`Unknown part type ${part.type}`);
  }
}
