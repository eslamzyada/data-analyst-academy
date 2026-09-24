// Keeps tests, fixtures and generated content away from the learner's real progress.
//
// The real progress file is app/data/academy.db. Anything started by a test tool sets
// ACADEMY_REQUIRE_TEST_DATA=1, and then the server refuses to open that folder at all.
import fs from 'node:fs';
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

/** Throws when a test, fixture or content tool is about to use the real progress folder. */
export function assertTestDataDir(dir, who = 'this tool') {
  if (!dir) throw new Error(`${who}: no data folder given`);
  if (isRealDataDir(dir)) throw new Error(`${who} refused to use ${dir}: that folder holds the learner's real progress. Use a temporary folder.`);
  return dir;
}

/** The server's own check, before anything is opened. */
export function guardServerDataDir(dir, env = process.env) {
  const testRun = env.ACADEMY_REQUIRE_TEST_DATA === '1' || env.ACADEMY_TEST_FAULTS === '1';
  if (testRun && isRealDataDir(dir)) {
    return `Refusing to start: this is a test run (ACADEMY_REQUIRE_TEST_DATA / ACADEMY_TEST_FAULTS) but the data folder is the real progress folder (${dir}). Set ACADEMY_DATA to a temporary folder.`;
  }
  return null;
}
