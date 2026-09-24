// Data and expected answers added by the content expansion. Runs at the end of
// tools/build-data.js, and on its own (node tools/build-extra.js) without rebuilding the rest.
// Every generator here is seeded, so its output is the same on every run.
import { pbiAnswers } from './answers-pbi.js';
import { thinkAnswers } from './answers-think.js';
import { pqAnswers } from './answers-pq.js';
import { buildPqExtraFiles } from './pq-extra.js';
import { excelAnswers } from './answers-excel.js';
import { buildExcelExtraFiles } from './excel-extra.js';
import { buildAssessFiles } from './assess-extra.js';
import { analystAnswers } from './answers-analyst.js';

// Seeded file builders run first; their results are handed to the answer sources.
export const EXTRA_FILE_BUILDERS = [
  ['pq', buildPqExtraFiles],
  ['excel', buildExcelExtraFiles],
  ['assess', buildAssessFiles],
];

export const EXTRA_ANSWER_SOURCES = [
  ['Power BI pack', pbiAnswers],
  ['Analyst thinking', thinkAnswers],
  ['Power Query files', (built, known) => pqAnswers(built.pq, known)],
  ['Excel files', (built, known) => excelAnswers(built.excel, known)],
  ['Real Analyst work', (built) => analystAnswers(built)],
];

/**
 * Builds the extra data files and returns { answers }.
 * known: the original answers (answers.json, or the ones build-data.js just computed), used for cross-checks.
 */
export async function buildExtra(known) {
  const built = {};
  for (const [name, fn] of EXTRA_FILE_BUILDERS) built[name] = await fn();
  const answers = {};
  for (const [name, fn] of EXTRA_ANSWER_SOURCES) {
    const got = await fn(built, known);
    for (const k of Object.keys(got)) {
      if (k in answers) throw new Error(`${name}: answer key ${k} is defined twice`);
      answers[k] = got[k];
    }
  }
  return { answers };
}
