// How much material each topic should have, so the learner can practise repeatedly without
// meeting the same exercise again. Used by the coverage report and the content validator.
//
//   small    a narrow topic                 20+ quiz questions, 1+ practice task
//   normal   most topics                    25-40 quiz questions, 2+ practice tasks, a challenge
//   core     topics analysts use every day  40-60 quiz questions, 3+ practice tasks, a challenge

export const TIERS = Object.freeze({
  small: { quizMin: 20, quizMax: 35, practiceMin: 1, challenge: false },
  normal: { quizMin: 25, quizMax: 45, practiceMin: 2, challenge: true },
  core: { quizMin: 40, quizMax: 60, practiceMin: 3, challenge: true },
});

export const TOPIC_TIER = Object.freeze({
  // Excel
  'xl-xlookup': 'core', 'xl-sumifs': 'core', 'xl-pivots': 'core',
  'xl-dashboards': 'small', 'xl-tables': 'small',
  // SQL
  'sql-joins': 'core', 'sql-groupby': 'core',
  'sql-union': 'small',
  // Power Query
  'pq-intro': 'small', 'pq-types': 'small', 'pq-split': 'small', 'pq-functions': 'small', 'pq-dynamic': 'small',
  // Power BI
  'pbi-dax': 'core', 'pbi-calculate': 'core',
  'pbi-intro': 'small', 'pbi-import': 'small', 'pbi-reports': 'small',
  // Analyst thinking
  'think-quality': 'core',
  'think-charts': 'small', 'think-tools': 'small',
});

export const tierOf = (topicId) => TOPIC_TIER[topicId] || 'normal';
export const targetOf = (topicId) => TIERS[tierOf(topicId)];

/** A topic's quiz should not be mostly one question format. */
export const MAX_SINGLE_FORMAT_SHARE = 0.7;
/** Minimum number of different kinds of question (concept, debugging, scenario...) per quiz bank. */
export const MIN_KINDS = 4;
/** Suggested difficulty range by topic level. */
export const DIFFICULTY_BY_LEVEL = Object.freeze({ Beginner: [1, 3], Intermediate: [2, 4], Advanced: [3, 5] });
