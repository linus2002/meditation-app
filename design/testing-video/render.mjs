/**
 * Renders the composition (index.html + comp.js) frame by frame in headless
 * Chrome over the DevTools protocol — no npm dependencies.
 *
 * Run from the project root:
 *   node design/testing-video/render.mjs                    # all frames
 *   node design/testing-video/render.mjs --at 1.2,4.6,8.4   # stills (seconds) for checking
 * Frames land in design/testing-video/build/frames/ as JPEGs.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'design/testing-video');
const TL = JSON.parse(readFileSync(path.join(DIR, 'timeline.json'), 'utf8'));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]] : a), []));
const OUT = args.out ? path.resolve(args.out) : path.join(DIR, 'build', args.at ? 'stills' : 'frames');
const WORKERS = Number(args.workers ?? Math.max(2, Math.min(6, os.cpus().length - 2)));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PAGE = `http://127.0.0.1:${server.address().port}/design/testing-video/index.html`;

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      }
    };
    this.open = new Promise((r) => (this.ws.onopen = r));
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function worker(w, frames) {
  const port = 9400 + w;
  const prof = path.join(os.tmpdir(), `serenity-testing-chrome-${w}`);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', `--window-size=${TL.width},${TL.height}`, '--force-device-scale-factor=1', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); } catch { await wait(150); }
  }
  const c = new CDP(target.webSocketDebuggerUrl);
  await c.open;
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: TL.width, height: TL.height, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: PAGE });
  for (let i = 0; i < 200; i++) {
    const r = await c.send('Runtime.evaluate', { expression: 'typeof window.whenReady' });
    if (r.result.value === 'object') break;
    await wait(100);
  }
  const rr = await c.send('Runtime.evaluate', { expression: 'window.whenReady', awaitPromise: true });
  if (rr.exceptionDetails) throw new Error(JSON.stringify(rr.exceptionDetails));
  for (const { f, t, name } of frames) {
    const ev = await c.send('Runtime.evaluate', { expression: `render(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, awaitPromise: true });
    if (ev.exceptionDetails) throw new Error(`t=${t}: ${ev.exceptionDetails.exception?.description ?? ev.exceptionDetails.text}`);
    const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
    done++;
    if (done % 30 === 0 || args.at) process.stdout.write(`\r${done}/${total} frames`);
  }
  proc.kill();
}

mkdirSync(OUT, { recursive: true });
let list;
if (args.at) list = String(args.at).split(',').map((s) => ({ f: 0, t: Number(s), name: `t${Number(s).toFixed(2)}.jpg` }));
else {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const n = Math.round(TL.duration * TL.fps);
  list = Array.from({ length: n }, (_, f) => ({ f, t: f / TL.fps, name: `f${String(f).padStart(4, '0')}.jpg` }));
}
let done = 0;
const total = list.length;
const nW = Math.min(WORKERS, list.length);
const t0 = Date.now();
await Promise.all(Array.from({ length: nW }, (_, w) => worker(w, list.filter((_, i) => i % nW === w))));
console.log(`\nrendered ${total} frames with ${nW} workers in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${OUT}`);
server.close();
