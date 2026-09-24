// One vocabulary for "how did the check go" and "where is this activity", shared by the server
// and the browser so they can never disagree.

/** What a single check of an answer concluded. */
export const OUTCOME = Object.freeze({
  CORRECT: 'CORRECT',                     // checked, right
  INCORRECT: 'INCORRECT',                 // checked, not right (including the learner's own syntax errors)
  EVALUATION_ERROR: 'EVALUATION_ERROR',   // the app failed to check it: never the learner's fault
  NOT_EVALUABLE: 'NOT_EVALUABLE',         // cannot be checked automatically (written answers, unsupported functions)
});

/** Where an activity (task, lesson, quiz, project) stands. */
export const STATE = Object.freeze({
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',             // work begun, nothing submitted yet
  SUBMITTED: 'submitted',                 // handed in, no verdict yet (being checked, not checkable, or self-check pending)
  EVALUATED: 'evaluated',                 // verdict given, not yet good enough
  COMPLETED: 'completed',                 // done: right, self-checked, passed, or handed in
});

export const STATE_LABEL = Object.freeze({
  'not-started': 'Not started',
  'in-progress': 'In progress',
  submitted: 'Submitted',
  evaluated: 'Try again',
  completed: 'Completed',
});

/** Only checked answers are evidence about the learner. */
export function isRecordable(outcome) {
  return outcome === OUTCOME.CORRECT || outcome === OUTCOME.INCORRECT;
}

/** The outcome of one grading result, from the flags the graders set. */
export function outcomeOf(r) {
  if (!r) return null;
  if (r.outcome) return r.outcome;
  if (r.correct) return OUTCOME.CORRECT;
  if (r.engineError || r.evaluationError) return OUTCOME.EVALUATION_ERROR;
  if (r.unsupported || r.selfCheck || r.needsReview) return OUTCOME.NOT_EVALUABLE;
  return OUTCOME.INCORRECT;
}

/**
 * The state of one task or question.
 *   hasAnswer     something has been typed or chosen
 *   submitting    a check is on its way
 *   result        the last check's result (with `outcome`), if any
 *   selfChecked   a written answer's self-check was saved
 *   selfMarked    the learner marked an unchecked answer: true = right, false = not right
 *   solvedBefore  the task was completed in an earlier sitting
 */
export function taskState({ hasAnswer = false, submitting = false, result = null, selfChecked = false, selfMarked = null, solvedBefore = false } = {}) {
  if (submitting) return STATE.SUBMITTED;
  const outcome = outcomeOf(result);
  if (outcome === OUTCOME.CORRECT || selfChecked || selfMarked === true) return STATE.COMPLETED;
  if (outcome === OUTCOME.INCORRECT || selfMarked === false) return solvedBefore ? STATE.COMPLETED : STATE.EVALUATED;
  if (outcome === OUTCOME.EVALUATION_ERROR || outcome === OUTCOME.NOT_EVALUABLE) return solvedBefore ? STATE.COMPLETED : STATE.SUBMITTED;
  if (solvedBefore) return STATE.COMPLETED;
  return hasAnswer ? STATE.IN_PROGRESS : STATE.NOT_STARTED;
}

/** A quiz is completed once finished with at least this share right; below that, "try again". */
export const QUIZ_PASS = 0.6;

export function quizState({ started = false, answered = 0, finished = false, score = null } = {}) {
  if (finished) return score !== null && score >= QUIZ_PASS ? STATE.COMPLETED : STATE.EVALUATED;
  if (answered > 0 || started) return STATE.IN_PROGRESS;
  return STATE.NOT_STARTED;
}

/** Projects are completed when the final report is handed in; checked steps before that are progress. */
export function projectState({ drafts = 0, graded = 0, finished = false } = {}) {
  if (finished) return STATE.COMPLETED;
  if (graded > 0 || drafts > 0) return STATE.IN_PROGRESS;
  return STATE.NOT_STARTED;
}

export function lessonState({ done = false, tried = false } = {}) {
  if (done) return STATE.COMPLETED;
  return tried ? STATE.IN_PROGRESS : STATE.NOT_STARTED;
}

export const isDone = (state) => state === STATE.COMPLETED;
