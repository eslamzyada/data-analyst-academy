// Adaptive difficulty: the learner's own recent history decides what comes next in a topic.
//
//   step-up     the last three answers were right with little or no help   → harder, more real-world
//   step-back   two of the last three went wrong                          → simpler, ideas first, help close by
//   apply       the ideas and the syntax are there, business use is not   → scenario and interpretation questions
//   steady      none of the above                                         → questions that fit the current stage
//
// Cold start (coldStart: true): fewer than 6 checked answers in the topic, still at an early stage,
// and no run of three right answers yet. A handful of answers is not enough to judge, so questions
// stay close to the basics and plain (engine.questionWeight). It ends by itself: after 6 answers,
// or as soon as three in a row are right (then step-up applies and harder work arrives).
//
// It also decides how much guidance a practice task or challenge offers:
//   full    hints available from the start
//   light   hints open after the first check (guided tasks have been solved with little help)
//   none    no hints until the second check (guided tasks have been solved with no help at all)
//
// Nothing is hidden for good: the answer can always be revealed after two checks, and the
// learner can switch hints back on. This module only reads progress; it never writes it.
import * as store from './store.js';
import { content } from './content/index.js';
import * as mastery from './mastery.js';

const BASE_TARGET = { none: 1.5, introduced: 1.5, learning: 1.8, practicing: 2.5, competent: 3.2, independent: 3.8, strong: 4.3 };
const HANDS_ON = new Set(['practice', 'challenge', 'tryit']);

export const MODE_REASON = Object.freeze({
  'step-up': 'step-up', 'step-back': 'step-back', apply: 'apply',
});

function recentAttempts(topicId, n = 8) {
  return store.all(`SELECT item_id, source, score, raw_score, hints, ts FROM attempts
                    WHERE topic_id = ? AND source NOT IN ('placement', 'card')
                      AND item_id NOT LIKE '%:proof' AND item_id NOT LIKE 'placement:%'
                    ORDER BY ts DESC, id DESC LIMIT ?`, [topicId, n]);
}

const clean = (a) => (a.raw_score ?? a.score) >= 0.8 && (a.hints || 0) <= 1;
const wrong = (a) => (a.raw_score ?? a.score) < 0.5;

/**
 * What should come next in a topic, and why, in plain language.
 * Returns { mode, target, prefer, guidance, message, stage }.
 */
export function adaptFor(topicId, view = null) {
  const topic = content.topicMap?.[topicId];
  if (!topic) return null;
  const v = view || mastery.topicView(topicId);
  const last = recentAttempts(topicId);
  const base = BASE_TARGET[v.stage] ?? 2;
  const out = { mode: 'steady', target: base, prefer: null, guidance: 'full', message: null, stage: v.stage };

  const last3 = last.slice(0, 3);
  const kShown = v.dims.knowledge.state === 'shown';
  const sShown = v.dims.skill.state === 'shown' || v.dims.skill.state === 'na';
  const aState = v.dims.application.state;
  const aWeak = aState === 'started' && (v.dims.application.rate ?? 0) < 60;

  if (last3.length >= 3 && last3.filter(wrong).length >= 2) {
    Object.assign(out, {
      mode: 'step-back', target: Math.max(1, base - 1), prefer: { knowledge: 2.2, skill: 0.8, application: 0.5 },
      message: 'The last few answers here did not go well, so the next ones are simpler and start from the idea. The lesson and the explanations are there if you want them.',
    });
  } else if (last3.length >= 3 && last3.every(clean)) {
    Object.assign(out, {
      mode: 'step-up', target: Math.min(5, base + 0.8), prefer: { knowledge: 0.6, skill: 1.3, application: 1.8 },
      message: 'You got the last three right with little or no help, so the next ones are harder and closer to real work.',
    });
  } else if (kShown && sShown && (aWeak || (aState === 'none' && v.attempts >= 6))) {
    Object.assign(out, {
      mode: 'apply', prefer: { knowledge: 0.5, skill: 0.9, application: 2.5 },
      message: 'You know how this works. What is missing is using it on a business problem, so more questions now describe a situation and ask you to decide.',
    });
  }

  out.coldStart = out.mode !== 'step-up' && last.length < 6 && ['none', 'introduced', 'learning'].includes(v.stage);

  // Guidance: once guided tasks are solved with little help, the help steps back too.
  if (out.mode !== 'step-back') {
    const handsOn = last.filter((a) => HANDS_ON.has(a.source)).slice(0, 3);
    const unaided = handsOn.filter((a) => (a.raw_score ?? a.score) >= 0.8 && (a.hints || 0) === 0).length;
    const lightly = handsOn.filter(clean).length;
    if (unaided >= 2) out.guidance = 'none';
    else if (lightly >= 2) out.guidance = 'light';
  }
  return out;
}

/** The plain-language note shown with a task about the guidance it offers. */
export function guidanceNote(guidance) {
  if (guidance === 'none') return 'You have been solving these without help, so hints stay closed until your second check. You can open them anyway.';
  if (guidance === 'light') return 'Try it on your own first: hints open after your first check.';
  return null;
}
