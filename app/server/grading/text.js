// Written answers can't be marked word-for-word. Each checklist point has keyword groups;
// the app pre-ticks the points it can see in the answer and the learner confirms the rest
// against the model answer (self-check), so wording never matters.
import { normText } from './values.js';

/** checklist: [{ point, keywords: [['median','middle'], ['outlier']] }]  (all groups must match, any word within a group) */
export function autoCheck(checklist, text) {
  const t = normText(text);
  return checklist.map((c) => {
    const groups = c.keywords || [];
    const hit = groups.length > 0 && groups.every((g) => g.some((w) => t.includes(normText(w))));
    return { point: c.point, detected: hit };
  });
}
