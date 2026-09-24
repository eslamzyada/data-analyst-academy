// Starts the app for testing on port 7701 with a separate progress database (never data/academy.db).
// The first start (or `--fresh`) fills it with the fixture learner from tools/fixture.js.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.PORT = process.env.PORT || '7701';
process.env.ACADEMY_DATA = process.env.ACADEMY_DATA || path.join(os.tmpdir(), 'academy-dev-data');
process.env.ACADEMY_REQUIRE_TEST_DATA = '1';

const dbFile = path.join(process.env.ACADEMY_DATA, 'academy.db');
if (process.argv.includes('--fresh') || !fs.existsSync(dbFile)) {
  const r = spawnSync(process.execPath, [path.join(here, 'fixture.js'), process.env.ACADEMY_DATA, '--force'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
await import('../server/index.js');
