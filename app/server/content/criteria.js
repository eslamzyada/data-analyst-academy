// The ten things a piece of analyst work is judged on, in projects and in Real Analyst work.
// Each project step and each Real Analyst part names the criteria it gives evidence of; the result
// screen shows which were shown, which need work and which the work did not test.
export const CRITERIA = Object.freeze([
  { id: 'understanding', label: 'Data understanding', means: 'Knows what each table or file holds, at what grain, and what it can answer.' },
  { id: 'quality', label: 'Data quality', means: 'Finds duplicates, gaps, wrong types and rows that should not be there.' },
  { id: 'tools', label: 'Tool choice', means: 'Picks a tool that fits the data, the deadline and whether it will be repeated.' },
  { id: 'cleaning', label: 'Cleaning', means: 'Fixes what is wrong before counting anything.' },
  { id: 'transformation', label: 'Transformation', means: 'Combines, reshapes and joins data without losing or multiplying rows.' },
  { id: 'analysis', label: 'Analysis', means: 'Gets the numbers that answer the question, and gets them right.' },
  { id: 'validation', label: 'Validation', means: 'Checks the result against a total, a second method or common sense.' },
  { id: 'insight', label: 'Insight quality', means: 'Finds what matters in the numbers, not just what is there.' },
  { id: 'communication', label: 'Communication', means: 'Says it clearly, with the evidence and its limits.' },
  { id: 'business', label: 'Business reasoning', means: 'Connects the finding to a decision, and claims no more than the data shows.' },
]);
export const CRITERIA_MAP = Object.fromEntries(CRITERIA.map((c) => [c.id, c]));

/**
 * A profile of the ten criteria from scored pieces of work: [{ criteria: [...], score }, ...].
 * shown ≥ 0.8 average, partial ≥ 0.5, weak below, untested when nothing gave evidence.
 */
export function criteriaProfile(pieces) {
  return CRITERIA.map((c) => {
    const scores = pieces.filter((p) => (p.criteria || []).includes(c.id) && p.score !== null && p.score !== undefined).map((p) => p.score);
    if (!scores.length) return { ...c, state: 'untested', score: null };
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { ...c, state: avg >= 0.8 ? 'shown' : avg >= 0.5 ? 'partial' : 'weak', score: Math.round(avg * 100) / 100 };
  });
}
