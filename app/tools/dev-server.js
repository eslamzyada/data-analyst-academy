// Starts the app for testing with a separate progress database (never data/academy.db).
//   node tools/dev-server.js                the fixture learner, on port 7701 (first start or --fresh builds it)
//   node tools/dev-server.js --new-learner  a brand-new learner on port 7702, emptied on every start
//                                           (to see onboarding and the first sessions as a newcomer does)
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertTestDataDir } from '../server/safety.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const newLearner = process.argv.includes('--new-learner');
process.env.PORT = process.env.PORT || (newLearner ? '7702' : '7701');
process.env.ACADEMY_DATA = process.env.ACADEMY_DATA || path.join(os.tmpdir(), newLearner ? 'academy-dev-new-learner' : 'academy-dev-data');
process.env.ACADEMY_REQUIRE_TEST_DATA = '1';

// refuses (throws) if ACADEMY_DATA names the learner's real progress folder, before anything is touched
assertTestDataDir(process.env.ACADEMY_DATA, 'the dev server');
const dbFile = path.join(process.env.ACADEMY_DATA, 'academy.db');
if (newLearner) {
  if (fs.existsSync(dbFile)) fs.rmSync(dbFile);
} else if (process.argv.includes('--fresh') || !fs.existsSync(dbFile)) {
  const r = spawnSync(process.execPath, [path.join(here, 'fixture.js'), process.env.ACADEMY_DATA, '--force'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
await import('../server/index.js');
