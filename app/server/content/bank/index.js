// Extra question and practice banks, kept out of the topic files so both stay readable.
// Each entry names the topic it belongs to; the loader attaches it at start-up.
import { EXCEL_BEGINNER } from './excel-beginner.js';
import { EXCEL_INTERMEDIATE } from './excel-intermediate.js';
import { EXCEL_ADVANCED } from './excel-advanced.js';
import { SQL_BEGINNER } from './sql-beginner.js';
import { SQL_INTERMEDIATE } from './sql-intermediate.js';
import { SQL_ADVANCED } from './sql-advanced.js';
import { PQ_BEGINNER } from './pq-beginner.js';
import { PQ_INTERMEDIATE } from './pq-intermediate.js';
import { PBI_BEGINNER } from './pbi-beginner.js';
import { PRACTICE } from './practice.js';
import { PBI_PRACTICE, PBI_CHALLENGES } from './pbi-practice.js';
import { PBI_QUIZ_A } from './pbi-quiz-a.js';
import { PBI_QUIZ_B } from './pbi-quiz-b.js';
import { PBI_QUIZ_C } from './pbi-quiz-c.js';
import { PBI_QUIZ_D } from './pbi-quiz-d.js';
import { THINK_PRACTICE } from './think-practice.js';
import { THINK_QUIZ_A } from './think-quiz-a.js';
import { THINK_QUIZ_B } from './think-quiz-b.js';
import { THINK_QUIZ_C } from './think-quiz-c.js';
import { THINK_QUIZ_D } from './think-quiz-d.js';
import { THINK_QUIZ_E } from './think-quiz-e.js';
import { PQ_PRACTICE, PQ_CHALLENGES } from './pq-practice.js';
import { PQ_QUIZ_A } from './pq-quiz-a.js';
import { PQ_QUIZ_B } from './pq-quiz-b.js';
import { PQ_QUIZ_C } from './pq-quiz-c.js';
import { PQ_QUIZ_D } from './pq-quiz-d.js';
import { EXCEL_PRACTICE } from './excel-practice-extra.js';
import { XL_QUIZ_A } from './xl-quiz-a.js';
import { XL_QUIZ_B } from './xl-quiz-b.js';
import { XL_QUIZ_C } from './xl-quiz-c.js';
import { XL_QUIZ_D } from './xl-quiz-d.js';
import { XL_QUIZ_E } from './xl-quiz-e.js';
import { XL_QUIZ_F } from './xl-quiz-f.js';
import { SQL_QUIZ_A } from './sql-quiz-a.js';
import { SQL_QUIZ_B } from './sql-quiz-b.js';
import { SQL_QUIZ_C } from './sql-quiz-c.js';
import { SQL_QUIZ_D } from './sql-quiz-d.js';
import { SQL_QUIZ_E } from './sql-quiz-e.js';

// Newer banks: every quality check in tools/validate-content.js is an error for these.
const strict = (list) => list.map((x) => Object.assign(x, { strict: true }));
const STRICT_QUIZ = [...PBI_QUIZ_A, ...PBI_QUIZ_B, ...PBI_QUIZ_C, ...PBI_QUIZ_D, ...THINK_QUIZ_A, ...THINK_QUIZ_B, ...THINK_QUIZ_C, ...THINK_QUIZ_D, ...THINK_QUIZ_E,
  ...PQ_QUIZ_A, ...PQ_QUIZ_B, ...PQ_QUIZ_C, ...PQ_QUIZ_D,
  ...XL_QUIZ_A, ...XL_QUIZ_B, ...XL_QUIZ_C, ...XL_QUIZ_D, ...XL_QUIZ_E, ...XL_QUIZ_F,
  ...SQL_QUIZ_A, ...SQL_QUIZ_B, ...SQL_QUIZ_C, ...SQL_QUIZ_D, ...SQL_QUIZ_E];
const STRICT_PRACTICE = [...PBI_PRACTICE, ...THINK_PRACTICE, ...PQ_PRACTICE, ...EXCEL_PRACTICE];
const STRICT_CHALLENGES = [...PBI_CHALLENGES, ...PQ_CHALLENGES];

export const BANK = [
  ...EXCEL_BEGINNER, ...EXCEL_INTERMEDIATE, ...EXCEL_ADVANCED,
  ...SQL_BEGINNER, ...SQL_INTERMEDIATE, ...SQL_ADVANCED,
  ...PQ_BEGINNER, ...PQ_INTERMEDIATE,
  ...PBI_BEGINNER,
  ...strict(STRICT_QUIZ),
];

export const PRACTICE_BANK = [...PRACTICE, ...strict(STRICT_PRACTICE)];
export const CHALLENGE_BANK = strict(STRICT_CHALLENGES);
