// Keeps tests, fixtures and generated content away from the learner's real progress.
//
// The real progress file is app/data/academy.db. Anything started by a test tool sets
// ACADEMY_REQUIRE_TEST_DATA=1, and then the server refuses to open that folder at all.
//
// A test run may only use a folder inside the system's temporary folder. Knowing "the real
// folder" is not enough: the learner's installed copy and the development worktree are two
// checkouts, so a server started from one does not know the other's app/data. Every test tool
// already works in os.tmpdir(), so anything else is refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REAL_DATA_DIR = path.join(APP_DIR, 'data');

const norm = (p) => {
  const abs = path.resolve(p);
  let real = abs;
  try { real = fs.realpathSync.native(abs); } catch { /* may not exist yet */ }
  return process.platform === 'win32' ? real.toLowerCase() : real;
};

/** True when `dir` is the folder that holds the learner's real progress. */
export function isRealDataDir(dir) {
  return norm(dir) === norm(REAL_DATA_DIR);
}

/** True when `dir` is inside the system's temporary folder (where every test keeps its data). */
export function isTempDir(dir, tmp = os.tmpdir()) {
  const d = norm(dir);
  const t = norm(tmp);
  return d !== t && d.startsWith(t.endsWith(path.sep) ? t : t + path.sep);
}

/** Why `dir` may not be used by a test, or null when it may. */
function refusal(dir) {
  if (isRealDataDir(dir)) return "that folder holds the learner's real progress";
  if (!isTempDir(dir)) return `test data must live in a temporary folder (inside ${os.tmpdir()}), and this is not one`;
  return null;
}

/** Throws when a test, fixture or content tool is about to use a folder that could hold real progress. */
export function assertTestDataDir(dir, who = 'this tool') {
  if (!dir) throw new Error(`${who}: no data folder given`);
  const why = refusal(dir);
  if (why) throw new Error(`${who} refused to use ${dir}: ${why}. Use a temporary folder.`);
  return dir;
}

/** The server's own check, before anything is opened. */
export function guardServerDataDir(dir, env = process.env) {
  const testRun = env.ACADEMY_REQUIRE_TEST_DATA === '1' || env.ACADEMY_TEST_FAULTS === '1';
  const why = testRun ? refusal(dir) : null;
  if (why) {
    return `Refusing to start: this is a test run (ACADEMY_REQUIRE_TEST_DATA / ACADEMY_TEST_FAULTS) but ${why} (${dir}). Set ACADEMY_DATA to a temporary folder.`;
  }
  return null;
}
