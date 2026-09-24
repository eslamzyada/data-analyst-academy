// How good is the reasoning in a written conclusion? Not right or wrong: six qualities a manager
// would look for. The app finds what it can see in the text; the learner confirms the rest against
// a model answer. What the app detected counts in full, what only the learner ticked counts less,
// and a claim the data cannot support is flagged by name.
import { normText } from './values.js';

export const REASONING = Object.freeze([
  { id: 'evidence', label: 'Uses evidence', hint: 'Quotes the numbers that support the conclusion.' },
  { id: 'question', label: 'Answers the business question', hint: 'Answers what was asked, in the requester\'s terms.' },
  { id: 'uncertainty', label: 'Recognises uncertainty', hint: 'Says what the data cannot show, or what is assumed.' },
  { id: 'supported', label: 'Avoids unsupported conclusions', hint: 'Claims no more than the data shows: no "proves", no blame without evidence.' },
  { id: 'next', label: 'Identifies useful next steps', hint: 'Says what to do, or what to find out next.' },
  { id: 'reasoning', label: 'Shows the reasoning', hint: 'Explains why: compares, rules things out, links the cause to the number.' },
]);

const UNCERTAIN = /\b(may|might|could|likely|unlikely|probably|possibly|suggests?|appears?|seems?|not (certain|sure|clear|proven)|cannot (tell|say|show|prove|separate|see)|can't (tell|say|show)|does not (show|tell|prove)|doesn't (show|tell|prove)|uncertain|uncertainty|limitation|assum\w*|caveat|would need|we do not know|we don't know|not enough (data|evidence)|small sample|only (shows|covers|measures)|estimate\w*|not the same as|correlat\w*)\b/i;
const OVERCLAIM = /\b(proves?|proven|definitely|certainly|undoubtedly|without (a )?doubt|guaranteed?|100% sure|it is obvious|obviously|clearly (caused|because|due)|the only reason|always|never)\b/i;
const NEXT = /\b(recommend\w*|suggest\w*|next step|should|propose|i would|we would|check|investigat\w*|ask (for|the)|request|test|pilot|monitor|follow[- ]up|look (at|into)|find out|confirm|compare|action|plan)\b/i;
const LINKS = /\b(because|so that|therefore|which means|this means|meaning that|as a result|compared (with|to)|whereas|while|rather than|instead of|driven by|due to|explains?|accounts? for|rules? out|ruled out|if we|so the|so it|so this|that is why|this is why|not because)\b/gi;

/** Numbers written in the text, as values: 6.03, 6%, 3,171,428, 3.17m, 12k, $1,200. */
export function numbersIn(text) {
  const out = [];
  const re = /(-?\$?£?€?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%|m\b|k\b|million\b|thousand\b|bn\b)?/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    let v = Number(`${m[2].replace(/,/g, '')}${m[3] || ''}`);
    const unit = (m[4] || '').toLowerCase();
    if (unit === 'm' || unit === 'million') v *= 1e6;
    else if (unit === 'k' || unit === 'thousand') v *= 1e3;
    else if (unit === 'bn') v *= 1e9;
    if (Number.isFinite(v)) out.push({ value: v, percent: unit === '%' });
  }
  return out;
}

/** A figure is quoted when a number in the text is within 3% of it (or 0.3 for small figures). */
function quotes(nums, figure) {
  const f = typeof figure === 'number' ? figure : Number(figure);
  if (!Number.isFinite(f)) return false;
  return nums.some(({ value }) => Math.abs(value - f) <= Math.max(0.3, Math.abs(f) * 0.03));
}

/**
 * What the app can see in the text.
 * spec: { figures: [numbers worth quoting], question: [[synonyms], ...], overclaims: ['phrase', ...] }
 * Returns one entry per quality: { id, label, hint, detected, note }.
 */
export function detectReasoning(text, spec = {}) {
  const raw = String(text || '');
  const t = normText(raw);
  const nums = numbersIn(raw);
  const figures = (spec.figures || []).filter((x) => Number.isFinite(Number(x)));
  const quoted = figures.filter((f) => quotes(nums, f));
  const words = t.split(/\s+/).filter(Boolean).length;

  const needFigures = Math.min(2, figures.length);
  const evidence = figures.length ? quoted.length >= needFigures : nums.length >= 2;
  const groups = spec.question || [];
  const hitGroups = groups.filter((g) => g.some((w) => t.includes(normText(w))));
  const question = groups.length ? hitGroups.length >= Math.ceil(groups.length / 2) : false;
  const uncertain = UNCERTAIN.exec(raw);
  const general = OVERCLAIM.exec(raw);
  const specific = (spec.overclaims || []).find((p) => t.includes(normText(p)));
  const next = NEXT.exec(raw);
  const links = (raw.match(LINKS) || []).length;

  const found = {
    evidence: { detected: evidence, note: figures.length ? `${quoted.length} of the key figures quoted` : `${nums.length} numbers in your answer` },
    question: { detected: question, note: groups.length ? (question ? 'Speaks to what was asked' : 'The question itself is hard to find in your answer') : 'Check this one yourself' },
    uncertainty: { detected: !!uncertain, note: uncertain ? `"${uncertain[0]}"` : 'Nothing says what the data cannot show' },
    supported: { detected: words >= 25 && !general && !specific, note: specific ? `"${specific}" is not something the data can show` : general ? `"${general[0]}" claims more than data can prove` : words < 25 ? 'Too short to judge' : 'No overclaiming found', warning: !!(specific || general) },
    next: { detected: !!next, note: next ? `"${next[0]}"` : 'No next step or recommendation' },
    reasoning: { detected: links >= 2, note: `${links} reasoning link${links === 1 ? '' : 's'} (because, so, compared with, rules out…)` },
  };
  return REASONING.map((r) => ({ ...r, ...found[r.id] }));
}

/**
 * The reasoning score, 0 to 1. A quality the app detected counts 1; one the learner ticked but the
 * app could not see counts 0.6; ticking "avoids unsupported conclusions" over a flagged claim
 * counts 0.3. Unticked qualities count 0.
 */
export function scoreReasoning(detected, ticks = null) {
  const confirmed = ticks || detected.map((d) => d.detected);
  let s = 0;
  detected.forEach((d, i) => {
    if (!confirmed[i]) return;
    if (d.detected) s += 1;
    else if (d.warning) s += 0.3;
    else s += 0.6;
  });
  return s / detected.length;
}
