// Writes the content coverage matrix to reports/content-coverage.md (+ .json) and prints a summary.
//   npm run coverage              current state
//   npm run coverage -- baseline  also saves it as reports/content-coverage-baseline.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, content } from '../server/content/index.js';
import { topicCoverage, skillTotals, coverageMarkdown } from './lib/coverage.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadContent(path.join(APP, 'data'));
const rows = topicCoverage(content);
const outDir = path.join(APP, 'reports');
fs.mkdirSync(outDir, { recursive: true });
const md = coverageMarkdown(content, rows);
fs.writeFileSync(path.join(outDir, 'content-coverage.md'), md);
fs.writeFileSync(path.join(outDir, 'content-coverage.json'), JSON.stringify({ totals: skillTotals(content, rows), topics: rows }, null, 1));
if (process.argv.includes('baseline')) fs.writeFileSync(path.join(outDir, 'content-coverage-baseline.md'), md.replace('# Content coverage', '# Content coverage (baseline, before the content expansion)'));

console.table(skillTotals(content, rows));
const weak = rows.filter((r) => r.weak.length);
console.log(`\n${weak.length} of ${rows.length} topics below target:`);
for (const r of weak) console.log(`  ${r.id.padEnd(22)} ${r.weak.join(', ')}`);
console.log(`\nWritten: ${path.join('reports', 'content-coverage.md')}`);
