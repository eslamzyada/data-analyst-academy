// Rebuilds every practice database, downloadable file and answer key into a temporary folder and
// compares the result with app/data. The build is seeded, so the same source must give the same
// data: a difference means the content changed (or a generator stopped being deterministic).
// Answer keys are never overwritten here; a changed key is reported by name, before and after.
//   npm run check:repro
// Zip and xlsx files are compared by the files inside them (names and bytes), because a zip also
// stores the time it was written. Everything else must match byte for byte.
// The rebuild never touches app/data: build-data.js writes where ACADEMY_BUILD_DATA points.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMITTED = path.join(APP, 'data');
// what the data build produces; everything else in app/data (the learner's progress) is not compared
const OUTPUTS = ['answers.json', 'files', 'practice'];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function listOutputs(root) {
  const out = new Map();
  const walk = (abs, rel) => {
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const f of fs.readdirSync(abs).sort()) walk(path.join(abs, f), `${rel}/${f}`);
    } else out.set(rel.slice(1), abs);
  };
  for (const o of OUTPUTS) walk(path.join(root, o), `/${o}`);
  return out;
}

const isZip = (name) => /\.(zip|xlsx)$/i.test(name);

/** A zip's content without its timestamps: entry name -> hash of the uncompressed bytes (a zip or
 *  xlsx inside it is compared by its own content in turn, e.g. the workbook in a capstone pack). */
async function zipContent(buf, prefix = '') {
  const zip = await JSZip.loadAsync(buf);
  const entries = {};
  for (const name of Object.keys(zip.files).sort()) {
    const e = zip.files[name];
    if (e.dir) { entries[prefix + name] = 'dir'; continue; }
    const bytes = await e.async('nodebuffer');
    if (isZip(name)) Object.assign(entries, await zipContent(bytes, `${prefix}${name}!`));
    else entries[prefix + name] = sha(bytes);
  }
  return entries;
}

async function sameFile(a, b) {
  const ba = fs.readFileSync(a);
  const bb = fs.readFileSync(b);
  if (ba.equals(bb)) return { same: true };
  if (!isZip(a)) return { same: false, why: `bytes differ (${ba.length} vs ${bb.length} bytes)` };
  const [za, zb] = [await zipContent(ba), await zipContent(bb)];
  const names = [...new Set([...Object.keys(za), ...Object.keys(zb)])].sort();
  const diff = names.filter((n) => za[n] !== zb[n]);
  return diff.length ? { same: false, why: `inside the zip: ${diff.slice(0, 6).join(', ')}${diff.length > 6 ? ` (+${diff.length - 6})` : ''}` } : { same: true };
}

function answerChanges(committedFile, builtFile) {
  const before = JSON.parse(fs.readFileSync(committedFile, 'utf8'));
  const after = JSON.parse(fs.readFileSync(builtFile, 'utf8'));
  const show = (v) => { const s = JSON.stringify(v); return s.length > 160 ? `${s.slice(0, 160)}…` : s; };
  const lines = [];
  for (const k of Object.keys(before)) if (!(k in after)) lines.push(`  removed  ${k}`);
  for (const k of Object.keys(after)) if (!(k in before)) lines.push(`  added    ${k} = ${show(after[k])}`);
  for (const k of Object.keys(after)) {
    if (k in before && JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      lines.push(`  changed  ${k}\n    committed: ${show(before[k])}\n    rebuilt:   ${show(after[k])}`);
    }
  }
  return { keys: Object.keys(after).length, lines };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-repro-'));
let failed = false;
try {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(APP, 'tools', 'build-data.js')], {
    cwd: APP, env: { ...process.env, ACADEMY_BUILD_DATA: tmp }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`The data build failed (exit ${r.status}):\n${(r.stderr || r.stdout || '').slice(-3000)}`);
    process.exitCode = 1;
  } else {
    const committed = listOutputs(COMMITTED);
    const built = listOutputs(tmp);
    const problems = [];
    for (const rel of committed.keys()) if (!built.has(rel)) problems.push(`not produced by the build (stale?): data/${rel}`);
    for (const rel of built.keys()) if (!committed.has(rel)) problems.push(`produced by the build but not in app/data: data/${rel}`);
    let compared = 0;
    for (const [rel, abs] of built) {
      if (!committed.has(rel)) continue;
      compared++;
      const res = await sameFile(committed.get(rel), abs);
      if (!res.same) problems.push(`differs: data/${rel}: ${res.why}`);
    }
    const ans = answerChanges(path.join(COMMITTED, 'answers.json'), path.join(tmp, 'answers.json'));
    console.log(`Rebuilt in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${built.size} files, ${compared} compared, ${ans.keys} answer keys.`);
    if (ans.lines.length) {
      console.log(`\nAnswer keys that a rebuild would change (${ans.lines.length}):\n${ans.lines.join('\n')}`);
    }
    if (problems.length) {
      failed = true;
      console.log(`\n${problems.length} difference(s) between a fresh rebuild and app/data:\n${problems.map((p) => `  ${p}`).join('\n')}`);
      console.log('\nIf the content change is intended, run npm run build:data, review every changed answer key, and commit the result.');
    } else {
      console.log('Reproducible: a fresh rebuild matches app/data (every answer key identical).');
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (failed) process.exitCode = 1;
