// A small headless-browser driver for the UI tests, with no extra packages: it starts the
// Edge or Chrome already installed on this computer and talks to it over the DevTools protocol.
// Needs Node's built-in WebSocket (run node with --experimental-websocket on Node 20).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.ACADEMY_TEST_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function findBrowser() {
  return CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ headless = true } = {}) {
  if (typeof WebSocket === 'undefined') throw new Error('No WebSocket in this Node. Run with: node --experimental-websocket');
  const exe = findBrowser();
  if (!exe) throw new Error('No Edge or Chrome found for the UI tests.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-ui-'));
  const args = [
    headless ? '--headless=new' : '', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-sync', '--mute-audio',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank',
  ].filter(Boolean);
  const proc = spawn(exe, args, { stdio: 'ignore' });

  // the browser writes its debugging port to a file in the profile folder
  const portFile = path.join(profile, 'DevToolsActivePort');
  let wsPath = null;
  for (let i = 0; i < 100 && !wsPath; i++) {
    await sleep(100);
    if (fs.existsSync(portFile)) {
      const [port, p] = fs.readFileSync(portFile, 'utf8').split('\n');
      if (port && p) wsPath = `ws://127.0.0.1:${port.trim()}${p.trim()}`;
    }
  }
  if (!wsPath) { proc.kill(); throw new Error('The browser did not start its debugging port.'); }

  const ws = new WebSocket(wsPath);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('Could not connect to the browser.')); });
  let seq = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`)); else resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Page.enable');
  await page('Runtime.enable');

  const evaluate = async (expression) => {
    const r = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`In page: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const waitFor = async (expression, { timeout = 8000, label = expression } = {}) => {
    const end = Date.now() + timeout;
    let last;
    while (Date.now() < end) {
      try { last = await evaluate(expression); if (last) return last; } catch { /* page may be navigating */ }
      await sleep(100);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  };
  const loaded = (timeout = 15000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { listeners.splice(listeners.indexOf(on), 1); reject(new Error('Page did not finish loading')); }, timeout);
    const on = (msg) => {
      if (msg.method === 'Page.loadEventFired' && msg.sessionId === sessionId) {
        clearTimeout(timer);
        listeners.splice(listeners.indexOf(on), 1);
        resolve();
      }
    };
    listeners.push(on);
  });
  const reload = async () => {
    const done = loaded();
    await page('Page.reload', { ignoreCache: true });
    await done;
  };

  return {
    evaluate,
    waitFor,
    /** Open a URL with a real page load, even when only the #fragment differs. */
    async goto(url) {
      const here = await evaluate('location.href').catch(() => '');
      if (here && here.split('#')[0] === url.split('#')[0]) {
        await evaluate(`history.replaceState(null, '', ${JSON.stringify(url)})`);
        await reload();
        return;
      }
      const done = loaded();
      await page('Page.navigate', { url });
      await done;
    },
    reload,
    /** In-app navigation, the way clicking a link would do it (no page load). */
    async route(hash) { await evaluate(`location.hash = ${JSON.stringify(hash)}`); await sleep(150); },
    /** Focus an element, then type into it as a keyboard would. */
    async type(selector, text, { replace = false } = {}) {
      await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, { label: `element ${selector}` });
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); ${replace ? 'el.select && el.select();' : 'if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);'} return true; })()`);
      await page('Input.insertText', { text });
    },
    /** Click the first button (or link) whose text matches. */
    async click(textOrRegex, { within = 'body' } = {}) {
      const re = textOrRegex instanceof RegExp ? textOrRegex.source : `^\\s*${textOrRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
      const flags = textOrRegex instanceof RegExp ? textOrRegex.flags : '';
      const ok = await waitFor(`(() => {
        const root = document.querySelector(${JSON.stringify(within)}) || document.body;
        const re = new RegExp(${JSON.stringify(re)}, ${JSON.stringify(flags)});
        const el = [...root.querySelectorAll('button, a')].find((b) => re.test(b.textContent.trim()) && !b.disabled);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      })()`, { label: `button ${textOrRegex}` });
      await sleep(150);
      return ok;
    },
    text: (selector = 'main') => evaluate(`(document.querySelector(${JSON.stringify(selector)}) || document.body).innerText`),
    /** Save a PNG of the visible page (or of one element, scrolled into view). */
    async screenshot(file, selector = null) {
      let clip;
      if (selector) {
        const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'start' }); const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
        if (box) clip = { ...box, scale: 1 };
      }
      const { data } = await page('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      return file;
    },
    async close() {
      try { await send('Browser.close'); } catch { /* already gone */ }
      try { ws.close(); } catch { /* ignore */ }
      await sleep(300);
      try { proc.kill(); } catch { /* ignore */ }
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* browser may still hold files */ }
    },
  };
}
