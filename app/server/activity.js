// Where every activity stands, and what comes after it.
//
// This is the only place that turns stored evidence (attempts, saved work, quiz attempts,
// project steps, lesson marks) into a state, using the shared rules in shared/lifecycle.js.
// Lists, checklists, the daily plan and the "next step" buttons all read from here.
import * as store from './store.js';
import * as workstate from './workstate.js';
import * as engine from './engine.js';
import { content, getItem } from './content/index.js';
import { quizStateFor } from './quizsessions.js';
import { STATE, STATE_LABEL, taskState, lessonState, projectState, isDone } from '../shared/lifecycle.js';

export { STATE, STATE_LABEL };

const hasText = (a) => a !== undefined && a !== null && a !== '' && a !== '=' && !(Array.isArray(a) && !a.some((x) => String(x ?? '').trim()));

/** State of one task from its saved work and its attempts. */
function taskStateFrom(itemId, { solved, tried }) {
  const saved = workstate.loadState(`item:${itemId}`);
  const s = (saved && saved.state) || {};
  const result = s.result || null;
  let state = taskState({
    hasAnswer: hasText(s.answer) || (s.hints || 0) > 0,
    result,
    selfChecked: typeof s.selfSaved === 'number',
    selfMarked: result && result.selfMarked ? !!result.correct : null,
    solvedBefore: solved,
  });
  // checked in an earlier sitting but nothing saved about it: it was attempted and not solved
  if (state === STATE.NOT_STARTED && tried) state = STATE.EVALUATED;
  return state;
}

export function itemStates(itemIds) {
  const ids = [...new Set(itemIds.filter(Boolean))];
  if (!ids.length) return {};
  const marks = ids.map(() => '?').join(',');
  const rows = store.all(`SELECT item_id, MAX(correct) AS solved FROM attempts WHERE item_id IN (${marks}) GROUP BY item_id`, ids);
  const byId = Object.fromEntries(rows.map((r) => [r.item_id, r]));
  return Object.fromEntries(ids.map((id) => [id, taskStateFrom(id, { solved: !!byId[id]?.solved, tried: !!byId[id] })]));
}

export const itemState = (itemId) => itemStates([itemId])[itemId];

export function lessonStateOf(topic) {
  const done = !!engine.topicStatus(topic).lessonDone;
  const tried = topic.tryIt ? itemState(topic.tryIt.id) !== STATE.NOT_STARTED : false;
  return lessonState({ done, tried });
}

export const quizKeyForTopic = (topicId) => `topic:${topicId}`;
export const quizStateOf = (topic) => quizStateFor(quizKeyForTopic(topic.id));

export function projectStateOf(project) {
  const rows = store.all('SELECT step_id, score FROM project_progress WHERE project_id = ?', [project.id]);
  const final = rows.find((r) => r.step_id === 'final' && r.score !== null);
  const draft = workstate.loadState(`project:${project.id}`);
  const drafts = draft && draft.state ? Object.values(draft.state.drafts || {}).filter(hasText).length : 0;
  return projectState({ drafts, graded: rows.filter((r) => r.score !== null).length, finished: !!final });
}

// ---------------------------------------------------------------- topic steps

/**
 * The steps of a topic, in the order they are meant to be done:
 * lesson, each practice task, the challenge, the quiz.
 */
export function topicSteps(topic) {
  const practice = topic.practice || [];
  const states = itemStates([...practice.map((p) => p.id), topic.challenge?.id]);
  return [
    { key: 'lesson', kind: 'lesson', label: 'Lesson', tab: 'learn', state: lessonStateOf(topic) },
    ...practice.map((p, i) => ({ key: p.id, kind: 'practice', itemId: p.id, label: practice.length > 1 ? `Practice ${i + 1}` : 'Practice', title: p.title || null, tab: 'practice', state: states[p.id] })),
    ...(topic.challenge ? [{ key: 'challenge', kind: 'challenge', itemId: topic.challenge.id, label: 'Challenge', title: topic.challenge.title || null, tab: 'challenge', state: states[topic.challenge.id] }] : []),
    ...((topic.quiz || []).length ? [{ key: 'quiz', kind: 'quiz', label: 'Quiz', tab: 'quiz', state: quizStateOf(topic) }] : []),
  ].map((s) => ({ ...s, stateLabel: STATE_LABEL[s.state] }));
}

function stepRoute(topic, step, ctx) {
  if (step.kind === 'practice') return ctx === 'task' ? `/task/${step.itemId}` : `/topic/${topic.id}?tab=practice&task=${step.itemId}`;
  return `/topic/${topic.id}?tab=${step.tab}`;
}

function stepLabel(step) {
  if (step.kind === 'lesson') return 'Continue: the lesson';
  if (step.kind === 'practice') return `Next: ${step.label}${step.title ? ` · ${step.title}` : ''}`;
  if (step.kind === 'challenge') return 'Next: the challenge';
  return 'Next: the topic quiz';
}

/** The topic that follows this one on the learning path. */
function followingTopic(topic) {
  const suggested = engine.nextTopicInSkill(topic.skill);
  if (suggested && suggested.id !== topic.id) return suggested;
  return content.topics.find((t) => t.skill === topic.skill && t.order > topic.order) || null;
}

function afterTopic(topic, done) {
  const next = followingTopic(topic);
  if (next) return { label: `Next topic: ${next.title}`, to: `/topic/${next.id}?tab=learn`, hint: done ? `${topic.title} is complete.` : null, kind: 'topic' };
  return { label: 'Back to the learning path', to: `/learn/${topic.skill}`, hint: done ? `${topic.title} is complete.` : null, kind: 'path' };
}

/**
 * What to do next inside a topic, after the step `afterKey` (or from the start).
 * Looks forward only: the learner is never sent back to something they chose to leave.
 */
export function topicNext(topic, { afterKey = null, ctx = 'topic' } = {}) {
  const steps = topicSteps(topic);
  const from = afterKey ? steps.findIndex((s) => s.key === afterKey) + 1 : 0;
  const open = steps.slice(from).find((s) => !isDone(s.state));
  if (open) return { label: stepLabel(open), to: stepRoute(topic, open, ctx), hint: null, kind: open.kind, step: open.key };
  return afterTopic(topic, steps.every((s) => isDone(s.state)));
}

/** The next step after any activity. */
export function nextAfter(kind, id, ctx = 'topic') {
  if (kind === 'item') {
    const it = getItem(id);
    const topic = it && content.topicMap[it.topicId];
    if (!topic) return { label: 'Back to practice', to: '/practice', kind: 'library' };
    const key = topic.challenge && topic.challenge.id === it.id ? 'challenge' : it.source === 'tryit' ? 'lesson' : it.id;
    return topicNext(topic, { afterKey: key, ctx });
  }
  if (kind === 'lesson' || kind === 'quiz') {
    const topic = content.topicMap[id];
    if (!topic) return null;
    // a quiz that is not passed yet: practise first (the result screen says so too), not the next topic
    if (kind === 'quiz' && quizStateOf(topic) === STATE.EVALUATED) {
      const open = topicSteps(topic).find((s) => s.kind === 'practice' && !isDone(s.state));
      if (open) return { label: `Practise first: ${open.label}${open.title ? ` · ${open.title}` : ''}`, to: stepRoute(topic, open, ctx), hint: 'Then take the quiz again.', kind: 'practice', step: open.key };
      return { label: 'Re-read the lesson', to: `/topic/${topic.id}?tab=learn`, hint: 'Then take the quiz again.', kind: 'lesson', step: 'lesson' };
    }
    return topicNext(topic, { afterKey: kind, ctx });
  }
  if (kind === 'project') {
    const list = content.projects;
    const i = list.findIndex((p) => p.id === id);
    const nextOpen = [...list.slice(i + 1), ...list.slice(0, Math.max(0, i))].find((p) => !isDone(projectStateOf(p)));
    return nextOpen
      ? { label: `Next project: ${nextOpen.title}`, to: `/projects/${nextOpen.id}`, kind: 'project' }
      : { label: 'Back to projects', to: '/projects', kind: 'library' };
  }
  return null;
}
