// Packages the app for release: what it needs to run, never the learner's progress.
//   npm run build && npm run package
// Writes ../release/data-analyst-academy-<version>.zip and a .sha256 file next to it.
//
// The package is built from an allow-list (launcher, server, shared, built client, practice data,
// production dependencies), then checked: nothing private (academy.db, backups, .env, reports, the
// archive) may be inside, and everything needed must be. The check proves itself on a planted
// academy.db before it is trusted. Last, the app is started from the unzipped package on a
// throw-away progress folder and must answer.
//
// RELEASE_VERSION=1.2.0 (set by the release workflow from the tag) must equal package.json's version;
// without it the label is <version>-dev.<commit>.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(APP, '..');
const OUT = path.join(REPO, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));

// thrown (not process.exit) so the temporary folders and the test server are always cleaned up
class PackageError extends Error {}
const fail = (msg) => { throw new PackageError(msg); };
process.on('uncaughtException', (e) => {
  console.error(e instanceof PackageError ? `\nPACKAGE FAILED: ${e.message}` : e);
  process.exit(1);
});
const git = (...args) => { const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };

// ------------------------------------------------------------------ what goes in
const INCLUDE = [
  'Start Data Analyst Academy.cmd', 'README.md', 'README.txt',
  'app/package.json', 'app/package-lock.json', 'app/.nvmrc', 'app/academy.ico',
  'app/server', 'app/shared', 'app/client/dist',
  'app/data/answers.json', 'app/data/files', 'app/data/practice',
];
const REQUIRED = [
  'Start Data Analyst Academy.cmd', 'app/server/index.js', 'app/client/dist/index.html', 'app/data/answers.json',
  'app/data/practice/cedarline.db', 'app/data/practice/hr.db', 'app/data/practice/restaurant.db',
  'app/node_modules/express/package.json', 'app/node_modules/sql.js/package.json',
];
// never in a package: the learner's progress and anything private, local or development-only
const FORBIDDEN = [
  [/(^|\/)academy\.db($|\.)/i, "the learner's progress database"],
  [/(^|\/)backups?\//i, 'a backup folder'],
  [/(^|\/)\.env($|\.)/i, 'an environment/secrets file'],
  [/\.(pem|key|pfx)$/i, 'a key or certificate'],
  [/^app\/reports\//, 'reports written about the learner'],
  [/(^|\/)old-version\//, 'the archive (personal progress notes)'],
  [/(^|\/)source-backup/i, 'a source backup'],
  [/(^|\/)graphify-out\//, 'a local tool cache'],
  [/(^|\/)\.git\//, 'git metadata'],
  [/(^|\/)\.claude\//, 'local Claude settings'],
  [/^app\/node_modules\/(vite|typescript|react|@vitejs)\//, 'a development-only dependency'],
];

function listFiles(root) {
  const out = [];
  const walk = (abs, rel) => {
    for (const f of fs.readdirSync(abs).sort()) {
      const a = path.join(abs, f);
      const r = rel ? `${rel}/${f}` : f;
      if (fs.lstatSync(a).isDirectory()) walk(a, r); else out.push(r);
    }
  };
  walk(root, '');
  return out;
}

/** Everything wrong with a package tree; an empty list means it is fit to ship. */
function problemsIn(root) {
  const files = listFiles(root);
  const problems = [];
  for (const f of files) for (const [re, what] of FORBIDDEN) if (re.test(f)) problems.push(`contains ${what}: ${f}`);
  const have = new Set(files);
  for (const r of REQUIRED) if (!have.has(r)) problems.push(`missing ${r}`);
  return { files, problems };
}

// The check must be able to fail: plant a progress file (and leave out the server) in a scratch tree.
{
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-pkgprobe-'));
  try {
    fs.mkdirSync(path.join(probe, 'app', 'data'), { recursive: true });
    fs.writeFileSync(path.join(probe, 'app', 'data', 'academy.db'), 'planted');
    const { problems } = problemsIn(probe);
    if (!problems.some((p) => /progress database/.test(p)) || !problems.some((p) => /missing app\/server\/index\.js/.test(p))) {
      fail('the package check did not notice a planted academy.db or a missing server: it cannot be trusted');
    }
  } finally { fs.rmSync(probe, { recursive: true, force: true }); }
}

// ------------------------------------------------------------------ version and label
// the commit actually checked out (in a workflow_run, GITHUB_SHA can name a later commit)
const commit = git('rev-parse', 'HEAD') || process.env.GITHUB_SHA || 'unknown';
const commitDate = git('log', '-1', '--format=%cI') || '2026-01-01T00:00:00Z';
let label;
if (process.env.RELEASE_VERSION) {
  const v = process.env.RELEASE_VERSION.replace(/^v/, '');
  if (v !== pkg.version) fail(`the release tag says ${v} but app/package.json says ${pkg.version}. Bump the version in a PR first.`);
  label = v;
} else {
  label = `${pkg.version}-dev.${commit.slice(0, 7)}`;
}
const name = `data-analyst-academy-${label}`;

if (!fs.existsSync(path.join(APP, 'client', 'dist', 'index.html'))) fail('the client is not built. Run npm run build first.');

// ------------------------------------------------------------------ stage
const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-package-'));
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-package-run-'));
let server = null;
try {
  const stage = path.join(stageRoot, name);
  for (const rel of INCLUDE) {
    const src = path.join(REPO, rel);
    if (!fs.existsSync(src)) fail(`${rel} is missing from the working tree`);
    fs.cpSync(src, path.join(stage, rel), { recursive: true });
  }
  console.log('Installing production dependencies into the package…');
  const npm = spawnSync('npm ci --omit=dev --ignore-scripts --no-audit --no-fund', { cwd: path.join(stage, 'app'), shell: true, encoding: 'utf8' });
  if (npm.status !== 0) fail(`npm ci --omit=dev failed:\n${(npm.stderr || npm.stdout).slice(-2000)}`);
  const info = {
    name: 'data-analyst-academy', version: pkg.version, label, commit, commitDate,
    note: 'No learner progress is included. The app creates app/data/academy.db on first start.',
  };
  fs.writeFileSync(path.join(stage, 'BUILD-INFO.json'), `${JSON.stringify(info, null, 2)}\n`);

  const { files, problems } = problemsIn(stage);
  if (problems.length) fail(`the package is not fit to ship:\n  ${problems.join('\n  ')}`);

  // ---------------------------------------------------------------- zip (same content + commit -> same zip)
  const zip = new JSZip();
  const date = new Date(commitDate);
  // createFolders: false, or JSZip adds folder entries stamped with the current time
  for (const f of files) zip.file(`${name}/${f}`, fs.readFileSync(path.join(stage, f)), { date, createFolders: false });
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  fs.mkdirSync(OUT, { recursive: true });
  const zipFile = path.join(OUT, `${name}.zip`);
  fs.writeFileSync(zipFile, buf);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  fs.writeFileSync(`${zipFile}.sha256`, `${hash}  ${name}.zip\n`);

  // ---------------------------------------------------------------- start the app from the unzipped package
  const unzipped = await JSZip.loadAsync(buf);
  for (const [n, e] of Object.entries(unzipped.files)) {
    const dest = path.join(runRoot, ...n.split('/'));
    if (e.dir) { fs.mkdirSync(dest, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, await e.async('nodebuffer'));
  }
  const again = problemsIn(path.join(runRoot, name));
  if (again.problems.length) fail(`the unzipped package is not fit to ship:\n  ${again.problems.join('\n  ')}`);
  const progress = path.join(runRoot, 'progress');
  const PORT = 7797;
  let log = '';
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: path.join(runRoot, name, 'app'),
    env: { ...process.env, PORT: String(PORT), ACADEMY_DATA: progress, ACADEMY_REQUIRE_TEST_DATA: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => { log += d; });
  server.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${PORT}`;
  let up = false;
  for (let i = 0; i < 100 && !up; i++) {
    try { up = (await fetch(`${base}/api/health`)).ok; } catch { await new Promise((r) => setTimeout(r, 150)); }
  }
  if (!up) fail(`the packaged app did not start:\n${log.slice(-2000)}`);
  const page = await (await fetch(`${base}/`)).text();
  const home = await (await fetch(`${base}/api/home`)).json();
  const asset = (page.match(/src="(\/assets\/[^"]+\.js)"/) || [])[1];
  const script = asset ? await fetch(`${base}${asset}`) : null;
  if (!/<div id="root">/.test(page) || !script || !script.ok) fail('the packaged app does not serve its pages');
  if (!Array.isArray(home.skills) || home.skills.length !== 5) fail(`the packaged app's home data is wrong: ${JSON.stringify(home).slice(0, 300)}`);
  if (!fs.existsSync(path.join(progress, 'academy.db'))) fail('the packaged app did not create its own progress file');

  const mb = (buf.length / 1048576).toFixed(1);
  console.log(`\n${path.relative(REPO, zipFile)}  ${mb} MB, ${files.length} files`);
  console.log(`sha256 ${hash}`);
  console.log('Checked: no progress, backups, secrets, reports or dev dependencies inside; the app starts from the unzipped package and serves its pages.');
} finally {
  if (server) { const done = new Promise((r) => server.once('exit', r)); server.kill(); await Promise.race([done, new Promise((r) => setTimeout(r, 4000))]); }
  fs.rmSync(stageRoot, { recursive: true, force: true });
  fs.rmSync(runRoot, { recursive: true, force: true });
}
