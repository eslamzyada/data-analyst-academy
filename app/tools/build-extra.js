// Recomputes the expected answers (and any extra data files) added by the content expansion and
// merges them into data/answers.json, without regenerating the original databases and files.
//   node tools/build-extra.js
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from './lib.js';
import { buildExtra } from './data/extra.js';

const file = path.join(DATA, 'answers.json');
const answers = JSON.parse(fs.readFileSync(file, 'utf8'));
const extra = await buildExtra(answers);
let changed = 0;
for (const [k, v] of Object.entries(extra.answers)) {
  if (JSON.stringify(answers[k]) !== JSON.stringify(v)) changed++;
  answers[k] = v;
}
fs.writeFileSync(file, JSON.stringify(answers, null, 1));
console.log(`answers.json: ${Object.keys(extra.answers).length} extra answer sets, ${changed} changed.`);
