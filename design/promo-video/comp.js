'use strict';
/*
 * Serenity promo — a deterministic motion-graphics composition.
 * `render(t)` paints the frame at time t (seconds); render.mjs steps it at
 * 30 fps and screenshots each frame. Cut times come from timeline.json, which
 * the audio mix reads too, so picture and sound stay locked.
 */

// ---------------------------------------------------------------- constants
const SW = 600, SH = 1300, PW = 632, PH = 1332, BZ = 16, SB = 63, K = SW / 660;
const SCR = (n) => `/public/landing/screens/dark/${n}.webp`;
const ASSET = '/design/promo-video/build/assets/';
const ICON = '/public/icons/icon-1024.png';
const ALL_SCREENS = ['kapwa', 'home', 'player', 'meditations', 'stories', 'story', 'yoga', 'timer', 'program', 'sleep', 'discover', 'reflections'];

const stage = document.getElementById('stage');
const cam = document.getElementById('cam');

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, q) => a + (b - a) * q;
const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outSine: (x) => Math.sin((x * Math.PI) / 2),
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
  spring: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(9.5 * x)),
};
const prog = (t, t0, t1, e = E.outCubic) => e(clamp((t - t0) / (t1 - t0)));
const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi) * (1 - clamp((t - (b - fo)) / fo));

/** Keyframe track: keys = [[time, value(s), easeName], ...]; ease applies to the segment that starts at that key. */
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0, e] = keys[i];
      const [t1, v1] = keys[i + 1];
      if (t <= t1) {
        const q = (E[e] || E.inOutCubic)(clamp((t - t0) / (t1 - t0)));
        return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], q)) : lerp(v0, v1, q);
      }
    }
    return keys[keys.length - 1][1];
  };
}

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (n) => rng(n * 9301 + 49297)();

function el(tag, cls, parent, style, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  if (html != null) e.innerHTML = html;
  (parent || cam).appendChild(e);
  return e;
}
const px = (v) => `${v}px`;
const blur = (v) => (v > 0.25 ? `blur(${v.toFixed(2)}px)` : 'none');

// ---------------------------------------------------------------- brand mark
const PL = 'M105 10 A296 296 0 0 0 256 500 A296 296 0 0 0 105 10Z';
const PR = 'M407 10 A296 296 0 0 1 256 500 A296 296 0 0 1 407 10Z';
let uid = 0;
function markSvg(w, c1 = '#1D9FDA', c2 = '#61A644', c3 = '#10739A') {
  const id = `mk${uid++}`;
  return `<svg viewBox="22 6 468 498" width="${w}" height="${(w * 498) / 468}" style="display:block;overflow:visible">
    <defs><clipPath id="${id}"><path d="${PL}"/></clipPath></defs>
    <path class="pl" d="${PL}" fill="${c1}"/><path class="pr" d="${PR}" fill="${c2}"/>
    <path class="po" d="${PR}" fill="${c3}" clip-path="url(#${id})"/></svg>`;
}

// ---------------------------------------------------------------- text
function headline(parent, lines, { x = 80, y, size = 108, align = 'left', lh = 1.02 }) {
  const h = el('div', 'hl', parent, { top: px(y), fontSize: px(size), lineHeight: lh, textAlign: align });
  if (align === 'center') { h.style.left = '0'; h.style.right = '0'; } else h.style.left = px(x);
  const words = [];
  for (const L of lines) {
    const line = el('div', `line${L.g ? ' g' : ''}`, h);
    if (L.size) line.style.fontSize = px(L.size);
    if (L.ls) line.style.letterSpacing = L.ls;
    if (L.weight) line.style.fontWeight = L.weight;
    if (L.color) line.style.color = L.color;
    L.t.split(' ').forEach((w, i, arr) => {
      const s = el('span', 'w', line);
      s.textContent = w;
      words.push(s);
      if (i < arr.length - 1) line.appendChild(document.createTextNode(' '));
    });
  }
  return { h, words };
}
function animWords(words, t, tin, tout, { stag = 0.08, dur = 0.65, dy = 110, rot = 5 } = {}) {
  words.forEach((w, i) => {
    const a = prog(t, tin + i * stag, tin + i * stag + dur, E.outExpo);
    const b = tout == null ? 0 : prog(t, tout + i * 0.04, tout + i * 0.04 + 0.32, E.inCubic);
    const y = (1 - a) * dy - b * 70;
    w.style.transform = `translate3d(0,${y.toFixed(1)}px,0) rotate(${((1 - a) * rot).toFixed(2)}deg) scale(${(1 + b * 0.06).toFixed(3)})`;
    w.style.opacity = (a * (1 - b)).toFixed(3);
    w.style.filter = blur((1 - a) * 16 + b * 12);
  });
}
function chars(parent, text, cls, style) {
  const d = el('div', cls, parent, style);
  const cs = [...text].map((c) => { const s = el('span', 'c', d); s.textContent = c; return s; });
  return { d, cs };
}
function animChars(cs, t, tin, tout, { stag = 0.022, dur = 0.5, dy = 26 } = {}) {
  cs.forEach((c, i) => {
    const a = prog(t, tin + i * stag, tin + i * stag + dur, E.outCubic);
    const b = tout == null ? 0 : prog(t, tout + i * 0.008, tout + i * 0.008 + 0.28, E.inCubic);
    c.style.transform = `translate3d(0,${((1 - a) * dy - b * 30).toFixed(1)}px,0)`;
    c.style.opacity = (a * (1 - b)).toFixed(3);
    c.style.filter = blur((1 - a) * 8 + b * 8);
  });
}
function eyebrow(parent, text, x, y) {
  const d = el('div', 'eyebrow', parent, { left: px(x), top: px(y) });
  const bar = el('div', 'bar', d);
  const t = chars(d, text, '', {});
  return { d, bar, cs: t.cs };
}
function animEyebrow(e, t, tin, tout) {
  const a = prog(t, tin, tin + 0.5, E.outExpo);
  const b = prog(t, tout, tout + 0.3, E.inCubic);
  e.bar.style.transform = `scaleX(${(a * (1 - b)).toFixed(3)})`;
  animChars(e.cs, t, tin + 0.08, tout, { stag: 0.03, dur: 0.4, dy: 14 });
}

// ================================================================ BUILD
// ---------------------------------------------------------------- background
const bgL = el('div', 'layer', cam);
const bgBase = el('div', 'layer', bgL, { background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #121633 0%, #0A0C1C 60%, #06070F 100%)' });
const blobs = [
  { c: '29,159,218', s: 1500, x: 160, y: 380, ax: 140, ay: 90, f: 0.21 },
  { c: '97,166,68', s: 1300, x: 950, y: 1520, ax: 120, ay: 140, f: 0.17 },
  { c: '16,115,154', s: 1600, x: 860, y: 260, ax: 160, ay: 120, f: 0.13 },
  { c: '72,84,210', s: 1400, x: 120, y: 1650, ax: 110, ay: 100, f: 0.19 },
].map((b, i) => ({ ...b, i, d: el('div', 'blob', bgL, { width: px(b.s), height: px(b.s), left: px(-b.s / 2), top: px(-b.s / 2),
  background: `radial-gradient(circle, rgba(${b.c},0.55) 0%, rgba(${b.c},0.2) 32%, rgba(${b.c},0) 68%)` }) }));

const starsL = el('div', 'layer', cam);
const stars = [];
{ const r = rng(11); for (let i = 0; i < 150; i++) { const s = 1.5 + r() * 3.2; stars.push({ d: el('div', 'star', starsL, { left: px(r() * 1080), top: px(r() * 1500), width: px(s), height: px(s), boxShadow: s > 3.6 ? '0 0 8px rgba(180,220,255,.9)' : 'none' }), ph: r() * 6.28, sp: 1 + r() * 3 }); } }
const moon = el('div', 'abs', starsL, { left: '790px', top: '455px', width: '200px', height: '200px' });
el('div', 'abs', moon, { left: '-120px', top: '-120px', width: '440px', height: '440px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(140,195,255,0.30) 0%, rgba(140,195,255,0.10) 35%, rgba(140,195,255,0) 65%)' });
const crescent = el('div', 'abs', moon, { left: '22px', top: '22px', width: '156px', height: '156px', borderRadius: '50%',
  boxShadow: 'inset 34px -12px 0 0 #EEF4FF', filter: 'drop-shadow(0 0 20px rgba(170,215,255,0.8))' });
const SPARK = 'M12 0C12.9 8 16 11.1 24 12C16 12.9 12.9 16 12 24C11.1 16 8 12.9 0 12C8 11.1 11.1 8 12 0Z';
const sparkles = [[-70, 150, 34, 0], [190, -30, 26, 1.7], [215, 165, 18, 3.1], [40, -70, 20, 4.4], [-30, 20, 14, 2.2]].map(([x, y, sz, ph]) => ({
  ph, d: el('div', 'abs', moon, { left: px(x), top: px(y), width: px(sz), height: px(sz), filter: 'drop-shadow(0 0 8px rgba(190,225,255,0.9))' },
    `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" style="display:block"><path d="${SPARK}" fill="#F4F8FF"/></svg>`) }));

const dotsL = el('div', 'layer', cam);
const dots = [];
{ const r = rng(5); const cols = ['255,255,255', '29,159,218', '97,166,68', '125,214,155'];
  for (let i = 0; i < 38; i++) { const s = 4 + r() * 16; dots.push({ d: el('div', 'dot', dotsL, { width: px(s), height: px(s), background: `rgba(${cols[i % 4]},1)`, filter: s > 12 ? 'blur(3px)' : 'none' }), x: r() * 1080, y: r() * 1920, sp: 18 + r() * 50, o: 0.08 + r() * 0.3, ph: r() * 6.28 }); } }

const glowL = el('div', 'layer', cam);
const heroGlow = el('div', 'pglow', glowL, { width: '1300px', height: '1700px', marginLeft: '-650px', marginTop: '-850px',
  background: 'radial-gradient(ellipse at 50% 50%, rgba(29,159,218,0.42) 0%, rgba(97,166,68,0.16) 38%, rgba(0,0,0,0) 66%)' });

// ---------------------------------------------------------------- S1 breath
const s1 = el('div', 'scene', cam);
const s1Glow = el('div', 'abs', s1, { left: '-60px', top: '200px', width: '1200px', height: '1200px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(29,159,218,0.35) 0%, rgba(97,166,68,0.12) 40%, rgba(0,0,0,0) 68%)' });
const rings = [0, 1, 2, 3].map(() => el('div', 'abs', s1, { left: '240px', top: '500px', width: '600px', height: '600px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', boxSizing: 'border-box' }));
const s1Mark = el('div', 'abs', s1, { left: '380px', top: '630px', width: '320px', height: '341px', transformOrigin: '160px 221px' }, markSvg(320));
const s1pl = s1Mark.querySelector('.pl'), s1pr = s1Mark.querySelector('.pr'), s1po = s1Mark.querySelector('.po');
for (const pth of [s1pl, s1pr, s1po]) { pth.style.transformBox = 'view-box'; pth.style.transformOrigin = '256px 500px'; }
const s1Text = headline(s1, [{ t: 'Take a', size: 100 }, { t: 'slow breath', g: true, size: 128 }], { y: 1110, align: 'center', lh: 1.1 });
const s1Line2 = s1Text.h.children[1];
const s1Hint = chars(s1, 'inhale  ·  hold  ·  exhale', 'sub', { left: '0', right: '0', top: '1420px', textAlign: 'center', fontSize: '34px', letterSpacing: '0.18em', color: 'rgba(200,230,250,0.75)' });

// ---------------------------------------------------------------- phones
const phonesL = el('div', 'scene', cam, { perspective: '2400px', perspectiveOrigin: '50% 55%' });
const ICONS = `<svg width="34" height="22" viewBox="0 0 34 22"><rect x="0" y="14" width="6" height="8" rx="1.5" fill="#fff"/><rect x="9" y="10" width="6" height="12" rx="1.5" fill="#fff"/><rect x="18" y="5" width="6" height="17" rx="1.5" fill="#fff"/><rect x="27" y="0" width="6" height="22" rx="1.5" fill="#fff"/></svg>
<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M3 8.5a17 17 0 0 1 24 0"/><path d="M8 13.2a10 10 0 0 1 14 0"/><circle cx="15" cy="18.5" r="2.4" fill="#fff" stroke="none"/></svg>
<svg width="50" height="24" viewBox="0 0 50 24"><rect x="1" y="1" width="42" height="22" rx="7" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/><rect x="4" y="4" width="36" height="16" rx="4.5" fill="#fff"/><rect x="45" y="8" width="3.5" height="8" rx="1.5" fill="rgba(255,255,255,.45)"/></svg>`;

function makePhone(parent, screens) {
  const wrap = el('div', 'pw', parent);
  const L = 14, D = 4.2;
  for (let i = L; i >= 1; i--) {
    const s = el('div', `slab${i === L ? ' back' : ''}`, wrap);
    s.style.transform = `translateZ(${(-i * D).toFixed(1)}px)`;
    if (i === L) {
      const inner = el('div', 'inner', s);
      const c = el('div', 'cam', inner);
      for (const [lx, ly] of [[24, 24], [134, 24], [24, 134]]) el('div', 'lens', c, { left: px(lx), top: px(ly) });
      el('div', 'abs', c, { left: '160px', top: '160px', width: '40px', height: '40px', borderRadius: '50%', background: 'radial-gradient(circle, #fff6d8, #b9a66b 70%)' });
      el('div', 'logo', inner, {}, markSvg(170, '#E9ECF2', '#E9ECF2', '#9AA6B4'));
    } else {
      const f = Math.sin((i / L) * Math.PI);
      const l1 = Math.round(110 + f * 110), l2 = Math.round(70 + f * 70);
      s.style.background = `linear-gradient(135deg, rgb(${l1},${l1 + 2},${l1 + 8}) 0%, rgb(${l2},${l2 + 2},${l2 + 7}) 50%, rgb(${l1},${l1 + 2},${l1 + 8}) 100%)`;
    }
  }
  for (const [side, top, h] of [['left', 250, 64], ['left', 360, 120], ['left', 510, 120], ['right', 400, 190]]) {
    el('div', 'btn', wrap, { [side]: '-7px', top: px(top), height: px(h), transform: `translateZ(${-(L * D) / 2}px)` });
  }
  const front = el('div', 'front', wrap);
  const bez = el('div', 'bezel', front);
  const scr = el('div', 'screen', bez);
  const view = el('div', 'view', scr);
  const imgs = {};
  for (const n of screens) {
    const c = el('div', 'si', view);
    el('div', 'bleed', c, { backgroundImage: `url(${SCR(n)})` });
    const im = el('img', '', c);
    im.src = SCR(n);
    imgs[n] = c;
  }
  el('div', 'status', scr, {}, `<span>9:41</span><span class="icons">${ICONS}</span>`);
  const tap = el('div', 'tap', scr), tapdot = el('div', 'tapdot', scr);
  el('div', 'island', bez);
  const glare = el('div', 'glare', front);
  return { wrap, imgs, glare, tap, tapdot, pops: {} };
}

function addPop(ph, name, screen, [x0, y0, x1, y1], radius) {
  const d = el('div', 'pop', ph.wrap, {
    left: px(BZ + x0 * K), top: px(BZ + SB + y0 * K), width: px((x1 - x0) * K), height: px((y1 - y0) * K),
    borderRadius: typeof radius === 'string' ? radius : px(radius),
    backgroundImage: `url(${SCR(screen)})`, backgroundSize: `${SW}px auto`, backgroundPosition: `${-x0 * K}px ${-y0 * K}px`,
  });
  ph.pops[name] = d;
  return d;
}
function popV(t, tin, tout, dur = 0.6) {
  const a = E.spring(clamp((t - tin) / dur));
  const b = prog(t, tout, tout + 0.35, E.inOutCubic);
  return a * (1 - b);
}
function applyPop(d, v, z, dx = 0, dy = 0, rot = 0) {
  if (v <= 0.004) { d.style.opacity = '0'; return; }
  d.style.opacity = '1';
  d.style.transform = `translate3d(${(dx * v).toFixed(1)}px,${(dy * v).toFixed(1)}px,${(z * v).toFixed(1)}px) rotate(${(rot * v).toFixed(2)}deg) scale(${(1 + 0.07 * v).toFixed(3)})`;
  d.style.boxShadow = `0 ${(34 * v).toFixed(1)}px ${(70 * v).toFixed(1)}px rgba(0,0,0,${(0.6 * Math.min(v, 1)).toFixed(2)}), 0 0 0 ${(2 * Math.min(v, 1)).toFixed(2)}px rgba(255,255,255,0.14)`;
}
function setPhone(ph, s, visible = true) {
  if (!visible) { ph.wrap.style.visibility = 'hidden'; return; }
  ph.wrap.style.visibility = 'visible';
  const [x, y, z, rx, ry, rz, sc] = s;
  ph.wrap.style.transform = `translate3d(${(x - PW / 2).toFixed(2)}px,${(y - PH / 2).toFixed(2)}px,${z.toFixed(2)}px) rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
  const ryn = ((((ry + 180) % 360) + 360) % 360) - 180;
  ph.glare.style.backgroundPosition = `${(50 - ryn * 2.2 + rz * 1.5).toFixed(1)}% 0`;
}
function screenSeq(ph, seq, t) {
  let cur = 0;
  for (let i = 0; i < seq.length; i++) if (t >= seq[i].t) cur = i;
  const st = {};
  for (const n in ph.imgs) st[n] = { o: 0, x: 0, y: 0, dim: 0, z: 0 };
  const c = seq[cur];
  const q = c.d ? prog(t, c.t, c.t + c.d, E.inOutCubic) : 1;
  st[c.s] = { o: 1, x: 0, y: 0, dim: 0, z: 2 };
  if (cur > 0 && q < 1) {
    const prev = seq[cur - 1].s;
    if (c.type === 'slide') { st[prev] = { o: 1, x: -q * SW * 0.32, y: 0, dim: q * 0.65, z: 1 }; st[c.s].x = (1 - q) * SW; }
    else if (c.type === 'up') { st[prev] = { o: 1, x: 0, y: -q * 160, dim: q * 0.7, z: 1 }; st[c.s].y = (1 - q) * SH; }
    else if (c.type === 'fade') { st[prev] = { o: 1, x: 0, y: 0, dim: 0, z: 1 }; st[c.s].o = q; }
  }
  for (const n in ph.imgs) {
    const s = st[n], d = ph.imgs[n];
    d.style.opacity = s.o;
    d.style.zIndex = s.z;
    if (s.o > 0) {
      d.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
      d.style.filter = s.dim > 0.01 ? `brightness(${(1 - s.dim).toFixed(3)})` : 'none';
    }
  }
}
function tapAt(ph, t, t0, x, y) {
  const q = clamp((t - t0) / 0.55);
  const on = t >= t0 - 0.18 && q < 1;
  const cx = x * K, cy = SB + y * K;
  for (const d of [ph.tap, ph.tapdot]) { d.style.left = px(cx); d.style.top = px(cy); }
  if (!on) { ph.tap.style.opacity = '0'; ph.tapdot.style.opacity = '0'; return; }
  const pre = clamp((t - (t0 - 0.18)) / 0.18);
  ph.tapdot.style.opacity = (pre * (1 - q) * 0.9).toFixed(3);
  ph.tapdot.style.transform = `scale(${(1.3 - pre * 0.3 - q * 0.2).toFixed(3)})`;
  ph.tap.style.opacity = t >= t0 ? ((1 - q) * 0.9).toFixed(3) : '0';
  ph.tap.style.transform = `scale(${(0.4 + E.outCubic(q) * 1.4).toFixed(3)})`;
}

const sideL = makePhone(phonesL, ['program']);
const sideR = makePhone(phonesL, ['timer']);
const hero = makePhone(phonesL, ['home', 'meditations', 'player', 'stories', 'story', 'yoga', 'kapwa']);

addPop(hero, 'openheart', 'home', [34, 420, 576, 724], 30);
addPop(hero, 'row1', 'meditations', [34, 420, 626, 552], 26);
addPop(hero, 'row2', 'meditations', [34, 572, 626, 704], 26);
addPop(hero, 'row3', 'meditations', [34, 724, 626, 856], 26);
addPop(hero, 'ready', 'player', [222, 352, 438, 568], '50%');
addPop(hero, 'lighthouse', 'stories', [34, 276, 296, 536], 16);
addPop(hero, 'ferry', 'stories', [318, 276, 580, 536], 16);
addPop(hero, 'cover', 'story', [160, 108, 500, 446], 10);
addPop(hero, 'yogacard', 'yoga', [18, 230, 322, 622], 36);
addPop(hero, 'bubble', 'kapwa', [88, 336, 580, 528], 36);
addPop(hero, 'c1', 'kapwa', [26, 554, 226, 618], 30);
addPop(hero, 'c2', 'kapwa', [242, 554, 422, 618], 30);
addPop(hero, 'c3', 'kapwa', [26, 632, 236, 696], 30);
addPop(hero, 'c4', 'kapwa', [250, 632, 538, 696], 30);
addPop(sideR, 'fifteen', 'timer', [210, 110, 450, 300], 30);
addPop(sideL, 'mastery', 'program', [34, 124, 626, 456], 30);
const readyGlow = el('div', 'pglow', hero.wrap, { left: px(BZ + 330 * K - 200), top: px(BZ + SB + 460 * K - 200), width: '400px', height: '400px',
  background: 'radial-gradient(circle, rgba(47,224,203,0.55) 0%, rgba(29,159,218,0.25) 40%, rgba(0,0,0,0) 70%)', opacity: 0 });

const HERO_SEQ = [
  { t: 0, s: 'home' },
  { t: 6.05, s: 'meditations', type: 'slide', d: 0.45 },
  { t: 7.3, s: 'player', type: 'slide', d: 0.42 },
  { t: 9.43, s: 'stories' },
  { t: 10.85, s: 'story', type: 'slide', d: 0.42 },
  { t: 12.05, s: 'yoga', type: 'up', d: 0.5 },
  { t: 15.9, s: 'kapwa' },
];
const heroT = track([
  [3.6, [540, 2750, 0, 42, -32, 24, 0.82], 'outExpo'],
  [4.55, [540, 1235, 0, 12, -17, 7, 0.82], 'inOutSine'],
  [5.95, [560, 1210, 0, 9, -11, 4, 0.82], 'inOutCubic'],
  [6.5, [660, 1195, 0, 7, 15, -5, 0.82], 'inOutSine'],
  [9.0, [645, 1178, 0, 6, 11, -3, 0.82], 'inOutCubic'],
  [9.85, [525, 1215, 0, 9, -376, 6, 0.82], 'inOutSine'],
  [11.95, [532, 1200, 0, 8, -370, 4, 0.82], 'inOutCubic'],
  [12.55, [540, 1250, -60, 6, -360, 0, 0.74], 'inOutSine'],
  [15.3, [540, 1240, -60, 6, -363, 0, 0.74], 'inCubic'],
  [15.75, [540, 2800, 0, 34, -372, -12, 0.74], 'lin'],
  [16.45, [540, 2800, 0, 34, -372, -12, 0.82], 'outExpo'],
  [17.3, [565, 1290, 0, 11, -374, 5, 0.82], 'inOutSine'],
  [18.25, [552, 1268, 0, 9, -368, 3, 0.82], 'inExpo'],
  [18.75, [540, 1120, 1100, 0, -360, 0, 0.82], 'lin'],
]);
const sideLT = track([
  [12.3, [540, 1250, -80, 6, 0, 0, 0.74], 'outBack'],
  [13.0, [232, 1225, -300, 6, 30, -15, 0.66], 'inOutSine'],
  [15.15, [224, 1215, -300, 6, 25, -13, 0.66], 'inCubic'],
  [15.55, [540, 1250, -80, 6, 0, 0, 0.74], 'lin'],
]);
const sideRT = track([
  [12.3, [540, 1250, -80, 6, 0, 0, 0.74], 'outBack'],
  [13.0, [848, 1225, -300, 6, -30, 15, 0.66], 'inOutSine'],
  [15.15, [856, 1215, -300, 6, -25, 13, 0.66], 'inCubic'],
  [15.55, [540, 1250, -80, 6, 0, 0, 0.74], 'lin'],
]);

// ---------------------------------------------------------------- floating chips (S3)
const chipsL = el('div', 'layer', cam);
const MOOD_Y = 860, MOOD_STEP = 96;
const mline = el('div', 'mline', chipsL, { left: '79px', top: px(MOOD_Y + 30), height: px(MOOD_STEP * 3) });
const CHIPS = ['Focus', 'Sleep', 'Anxiety', 'Happiness'].map((label, i) => {
  const d = el('div', 'mood', chipsL, { left: '72px', top: px(MOOD_Y + i * MOOD_STEP) });
  const b = el('span', 'bullet', d);
  el('span', '', d).textContent = label;
  return { d, b };
});

// ---------------------------------------------------------------- Kapwa (S6)
const kapL = el('div', 'layer', cam);
const kRays = el('div', 'abs', kapL, { width: '1800px', height: '1800px', borderRadius: '50%',
  background: 'repeating-conic-gradient(from 0deg, rgba(125,214,155,0.16) 0deg 6deg, rgba(29,159,218,0) 6deg 18deg)',
  WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 62%)', maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0) 62%)' });
const kGlow = el('div', 'abs', kapL, { width: '1100px', height: '1100px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(47,224,203,0.45) 0%, rgba(29,159,218,0.2) 35%, rgba(0,0,0,0) 65%)' });
const kRings = [0, 1].map(() => el('div', 'abs', kapL, { width: '700px', height: '700px', borderRadius: '50%', border: '4px solid rgba(125,214,155,0.7)', boxSizing: 'border-box' }));
const kapwa = el('img', 'abs', kapL, { width: '620px', height: 'auto' });
kapwa.src = `${ASSET}kapwa.png`;
const KAP_W = 620, KAP_H = (620 * 1033) / 1105;
const kapT = track([
  [15.6, [540, 1010, 0, -140], 'lin'],
  [15.62, [540, 1010, 0.05, -140], 'outBack'],
  [16.15, [540, 1010, 1, 0], 'inOutSine'],
  [16.55, [540, 990, 1.02, 6], 'inOutCubic'],
  [17.2, [850, 340, 0.4, 12], 'inOutSine'],
  [18.25, [845, 330, 0.42, 4], 'inBack'],
  [18.6, [845, 330, 0, -60], 'lin'],
]);

// ---------------------------------------------------------------- wall (S7)
const s7 = el('div', 'scene', cam, { perspective: '2200px', perspectiveOrigin: '50% 42%' });
const wall = el('div', '', s7, {});
wall.id = 'wall';
const COLS = 9, TILE_STEP = 755, SET = 6 * TILE_STEP;
const WALL_NAMES = ['kapwa', 'home', 'player', 'meditations', 'stories', 'story', 'yoga', 'timer', 'program', 'sleep', 'discover', 'reflections'];
const cols = [];
for (let j = 0; j < COLS; j++) {
  const c = el('div', 'col', wall, { left: px((j - 4) * 370 - 165) });
  for (let k = -8; k < 10; k++) {
    const tile = el('div', 'tile', c, { top: px(k * TILE_STEP - 357) });
    const im = el('img', '', tile);
    im.src = SCR(WALL_NAMES[(((k + (j - 4) * 5) % 12) + 120) % 12]);
  }
  cols.push({ c, speed: (j % 2 ? -1 : 1) * (150 + ((j * 37) % 60)), phase: j === 4 ? 0 : hash(j) * SET });
}
const s7Shade = el('div', 'layer', s7, { background: 'radial-gradient(ellipse 95% 30% at 50% 43%, rgba(8,10,24,0.94) 0%, rgba(8,10,24,0.78) 50%, rgba(8,10,24,0) 100%)' });
const s7Text = headline(s7, [
  { t: 'Everything', size: 124 },
  { t: 'calm', g: true, size: 260, lh: 0.95 },
  { t: 'in one place', size: 76, ls: '0.02em', weight: 500 },
], { y: 590, align: 'center', lh: 1.08 });

// ---------------------------------------------------------------- headlines (S2–S6)
const textL = el('div', 'layer', cam);
const brand = el('div', '', textL, {}, `${markSvg(50, '#F4F5F9', '#F4F5F9', '#C6D2DC')}<span>serenity</span>`);
brand.id = 'brand';
const brandMark = brand.querySelector('svg'), brandWord = brand.querySelector('span');
const SCN = [
  { a: 3.6, b: 6.0, eb: 'Introducing', lines: [{ t: 'Meet' }, { t: 'Serenity', g: true }], sub: 'Meditation  ·  Sleep  ·  Yoga  ·  Calm' },
  { a: 6.0, b: 9.0, eb: '01  ·  Meditate', lines: [{ t: 'Guided' }, { t: 'meditations', g: true }], sub: 'For every mood, any time of day' },
  { a: 9.0, b: 12.0, eb: '02  ·  Sleep', lines: [{ t: 'Sleep' }, { t: 'stories', g: true }], sub: 'That help you drift off' },
  { a: 12.0, b: 15.6, eb: '03  ·  Move & sit', lines: [{ t: 'Gentle yoga' }, { t: '& quiet sits', g: true }], sub: 'Poses, timers and programs' },
  { a: 15.6, b: 18.6, eb: '04  ·  Guide', lines: [{ t: 'Meet' }, { t: 'Kapwa', g: true }], sub: 'Your built-in Serenity guide' },
].map((s) => ({
  ...s,
  e: eyebrow(textL, s.eb, 80, 178),
  h: headline(textL, s.lines, { x: 76, y: 228, size: 116 }),
  s: chars(textL, s.sub, 'sub', { left: '82px', top: '500px' }),
}));

// ---------------------------------------------------------------- end card (S8)
const s8 = el('div', 'scene', cam, { perspective: '1400px' });
s8.id = 's8';
const s8b1 = el('div', 'blob', s8, { width: '1400px', height: '1400px', left: '-700px', top: '-700px', background: 'radial-gradient(circle, rgba(29,159,218,0.22) 0%, rgba(29,159,218,0) 65%)' });
const s8b2 = el('div', 'blob', s8, { width: '1300px', height: '1300px', left: '-650px', top: '-650px', background: 'radial-gradient(circle, rgba(97,166,68,0.2) 0%, rgba(97,166,68,0) 65%)' });
const s8Rings = [0, 1, 2].map(() => el('div', 'abs', s8, { left: '240px', top: '420px', width: '600px', height: '600px', borderRadius: '50%', border: '3px solid rgba(29,159,218,0.5)', boxSizing: 'border-box' }));
const s8Inner = el('div', 'layer', s8);
const iconBox = el('div', 'abs', s8Inner, { left: '390px', top: '570px', width: '300px', height: '300px', borderRadius: '68px', overflow: 'hidden', background: '#000', boxShadow: '0 44px 90px rgba(24,26,46,0.38), 0 10px 24px rgba(24,26,46,0.25)' });
const iconImg = el('img', '', iconBox, { width: '300px', height: '300px', display: 'block' });
iconImg.src = ICON;
const iconShine = el('div', 'abs', iconBox, { top: '-40px', bottom: '-40px', width: '120px', background: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))', transform: 'skewX(-18deg)' });
const word = chars(s8Inner, 'serenity', 'wordmark', { top: '930px', fontSize: '176px' });
const tag = headline(s8Inner, [{ t: 'Calm Starts Here' }], { y: 1150, align: 'center', size: 66 });
tag.h.style.textTransform = 'none';
tag.h.style.color = '#181A2E';
tag.words[0].style.fontWeight = '600';
tag.words[1].style.fontWeight = '300';
tag.words[2].style.fontWeight = '300';
const ANDROID = '<svg viewBox="0 0 24 24"><path d="M17.523 15.341c-.551 0-.999-.449-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .551-.448 1-.999 1m-11.046 0c-.551 0-.999-.449-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .551-.448 1-.999 1m11.405-6.02l1.997-3.459a.416.416 0 00-.152-.568.416.416 0 00-.568.152l-2.022 3.503C15.59 8.244 13.853 7.851 12 7.851s-3.59.393-5.137 1.099L4.841 5.447a.416.416 0 00-.568-.152.416.416 0 00-.152.568l1.997 3.459C2.689 11.187.343 14.659 0 18.761h24c-.343-4.102-2.689-7.574-6.118-9.44"/></svg>';
const APPLE = '<svg viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>';
const cta = el('div', 'cta', s8Inner, { top: '1290px' }, `<span class="os">${ANDROID}${APPLE}</span><span class="ctxt"><small>Available on</small><b>Android &amp; iPhone</b></span>`);
const ctaShine = el('div', 'shine', cta);

// ---------------------------------------------------------------- overlays
const glitchL = el('div', 'layer', cam);
const gbars = Array.from({ length: 18 }, () => el('div', 'gbar', glitchL));
const streak = el('div', 'streak', cam);
const flash = el('div', '', cam);
flash.id = 'flash';
const grain = el('div', '', stage);
grain.id = 'grain';
const vignette = el('div', '', stage);
vignette.id = 'vignette';

// ================================================================ RENDER
const CUTS = [6.0, 9.0, 12.0, 15.6, 18.6];
const SHAKES = [[3.6, 16], [15.6, 14], [21.95, 12]];

function render(t) {
  const f = Math.round(t * 30);

  // ---- camera shake
  let sx = 0, sy = 0;
  for (const [t0, amp] of SHAKES) {
    const q = (t - t0) / 0.4;
    if (q >= 0 && q < 1) { const a = amp * Math.pow(1 - q, 2); sx += (hash(f * 3 + 1) - 0.5) * 2 * a; sy += (hash(f * 7 + 2) - 0.5) * 2 * a; }
  }
  cam.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;

  // ---- background
  const auroraIn = prog(t, 0, 1.2, E.outCubic);
  const night = win(t, 9.0, 12.1, 0.6, 0.5);
  const kap = win(t, 15.6, 18.7, 0.4, 0.4);
  blobs.forEach((b) => {
    const x = b.x + Math.sin(t * b.f * 2 + b.i) * b.ax;
    const y = b.y + Math.cos(t * b.f * 1.6 + b.i * 2) * b.ay;
    let o = auroraIn * 0.9;
    if (b.i === 0 || b.i === 1) o *= 1 - night * 0.55;
    if (b.i === 3) o *= 0.6 + night * 0.6;
    if (b.i === 1) o *= 1 + kap * 0.5;
    b.d.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(1 + Math.sin(t * 0.5 + b.i) * 0.08).toFixed(3)})`;
    b.d.style.opacity = o.toFixed(3);
  });
  const starO = 0.25 * auroraIn * (1 - prog(t, 3.0, 3.6)) + night + 0.15 * win(t, 12.0, 18.6, 0.5, 0.5);
  starsL.style.opacity = clamp(starO).toFixed(3);
  if (starO > 0.01) stars.forEach((s) => { s.d.style.opacity = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))).toFixed(3); });
  moon.style.opacity = night.toFixed(3);
  if (night > 0.01) {
    moon.style.transform = `translate3d(0,${((1 - prog(t, 9.0, 10.2, E.outCubic)) * 140 - (t - 9) * 8).toFixed(1)}px,0) scale(${(0.7 + 0.3 * prog(t, 9.0, 10.0, E.outBack)).toFixed(3)})`;
    crescent.style.transform = `rotate(${(-28 + Math.sin(t * 0.8) * 6).toFixed(2)}deg)`;
    sparkles.forEach((sp) => {
      const tw = 0.5 + 0.5 * Math.sin(t * 3.2 + sp.ph);
      sp.d.style.transform = `scale(${(0.35 + 0.75 * tw).toFixed(3)}) rotate(${(tw * 45).toFixed(1)}deg)`;
      sp.d.style.opacity = (0.35 + 0.65 * tw).toFixed(3);
    });
  }
  dots.forEach((d) => {
    const y = ((((d.y - t * d.sp) % 2000) + 2000) % 2000) - 40;
    const x = d.x + Math.sin(t * 0.6 + d.ph) * 30;
    d.d.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    d.d.style.opacity = (d.o * auroraIn * (0.6 + 0.4 * Math.sin(t * 1.3 + d.ph))).toFixed(3);
  });

  // ---- S1
  const s1Out = prog(t, 3.42, 3.72, E.lin);
  s1.style.opacity = (1 - s1Out).toFixed(3);
  s1.style.visibility = t < 3.75 ? 'visible' : 'hidden';
  if (t < 3.75) {
    const zoom = prog(t, 3.0, 3.62, E.inExpo);
    const breathe = 1 + Math.sin(Math.max(0, t - 1.2) * 1.9) * 0.025;
    s1Mark.style.transform = `scale(${((1 + zoom * 26) * breathe).toFixed(4)})`;
    const a1 = prog(t, 0.25, 1.15, E.outBack), a2 = prog(t, 0.35, 1.25, E.outBack);
    s1pl.style.transform = `translate(${(-150 * (1 - a1)).toFixed(1)}px, ${(40 * (1 - a1)).toFixed(1)}px) rotate(${(-38 * (1 - a1)).toFixed(2)}deg)`;
    s1pr.style.transform = `translate(${(150 * (1 - a2)).toFixed(1)}px, ${(40 * (1 - a2)).toFixed(1)}px) rotate(${(38 * (1 - a2)).toFixed(2)}deg)`;
    s1pl.style.opacity = clamp(a1 * 1.5).toFixed(3);
    s1pr.style.opacity = clamp(a2 * 1.5).toFixed(3);
    s1po.style.opacity = prog(t, 1.0, 1.4).toFixed(3);
    s1Glow.style.opacity = (prog(t, 0.2, 1.4) * (0.8 + 0.2 * Math.sin(t * 1.9))).toFixed(3);
    s1Glow.style.transform = `scale(${(0.8 + prog(t, 0.2, 3.0, E.outSine) * 0.35 + zoom * 2).toFixed(3)})`;
    rings.forEach((r, i) => {
      const ph = (((t - 0.3) * 0.38 + i / 4) % 1 + 1) % 1;
      const o = Math.sin(ph * Math.PI) * 0.4 * prog(t, 0.3, 1.0) * (1 - zoom);
      r.style.transform = `scale(${(0.5 + ph * 1.25).toFixed(3)})`;
      r.style.opacity = o.toFixed(3);
    });
    animWords(s1Text.words, t, 0.7, 2.92, { stag: 0.13, dur: 0.8 });
    s1Line2.style.letterSpacing = `${lerp(0.16, 0.0, prog(t, 1.0, 2.9, E.outCubic)).toFixed(3)}em`;
    animChars(s1Hint.cs, t, 1.5, 2.85, { stag: 0.03 });
  }

  // ---- phones
  const heroVis = t >= 3.6 && t < 18.76;
  const hs = heroT(t);
  setPhone(hero, hs, heroVis);
  const heroFade = prog(t, 18.5, 18.75, E.lin);
  hero.wrap.style.opacity = heroFade > 0 ? (1 - heroFade).toFixed(3) : '';
  heroGlow.style.transform = `translate3d(${hs[0].toFixed(1)}px,${(hs[1] - 60).toFixed(1)}px,0) scale(${(0.9 + Math.sin(t * 1.4) * 0.05).toFixed(3)})`;
  heroGlow.style.opacity = (heroVis ? clamp((1650 - hs[1]) / 500) * (1 - heroFade) * 0.9 : 0).toFixed(3);
  if (heroVis) {
    screenSeq(hero, HERO_SEQ, t);
    const P = hero.pops;
    applyPop(P.openheart, popV(t, 4.65, 5.7), 120, 0, -10, -2);
    applyPop(P.row1, popV(t, 6.6, 7.12), 90, -16);
    applyPop(P.row2, popV(t, 6.72, 7.16), 110, 16);
    applyPop(P.row3, popV(t, 6.84, 7.2), 90, -16);
    const rv = popV(t, 7.8, 8.85, 0.7);
    applyPop(P.ready, rv * (1 + 0.05 * Math.sin((t - 7.8) * 5)), 150);
    readyGlow.style.opacity = (rv * (0.7 + 0.3 * Math.sin((t - 7.8) * 5))).toFixed(3);
    readyGlow.style.transform = `translateZ(${(140 * rv).toFixed(1)}px) scale(${(0.8 + rv * 0.5 + 0.08 * Math.sin((t - 7.8) * 5)).toFixed(3)})`;
    applyPop(P.lighthouse, popV(t, 10.0, 10.72), 140, -30, -20, -4);
    applyPop(P.ferry, popV(t, 10.15, 10.76), 110, 30, -10, 4);
    applyPop(P.cover, popV(t, 11.3, 11.82), 130, 0, -20);
    applyPop(P.yogacard, popV(t, 13.3, 15.0, 0.7), 150, -40, -30, -3);
    applyPop(P.bubble, popV(t, 17.1, 18.2), 120, 10, -20);
    applyPop(P.c1, popV(t, 17.35, 18.22), 180, -150, 30, -4);
    applyPop(P.c2, popV(t, 17.47, 18.24), 160, 150, 10, 4);
    applyPop(P.c3, popV(t, 17.59, 18.26), 200, -170, 60, -3);
    applyPop(P.c4, popV(t, 17.71, 18.28), 170, 140, 70, 3);
    tapAt(hero, t, 8.4, 330, 1112);
  }
  const sideVis = t >= 12.3 && t < 15.55;
  const orbit = Math.sin((t - 12) * 0.9) * 4;
  const l = sideLT(t), r = sideRT(t);
  setPhone(sideL, [l[0], l[1], l[2], l[3], l[4] + orbit, l[5], l[6]], sideVis);
  setPhone(sideR, [r[0], r[1], r[2], r[3], r[4] + orbit, r[5], r[6]], sideVis);
  if (sideVis) {
    screenSeq(sideL, [{ t: 0, s: 'program' }], t);
    screenSeq(sideR, [{ t: 0, s: 'timer' }], t);
    applyPop(sideR.pops.fifteen, popV(t, 13.75, 15.0), 150, 20, -20, 3);
    applyPop(sideL.pops.mastery, popV(t, 14.4, 15.05), 140, -20, -20, -3);
  }

  // ---- moods list
  chipsL.style.visibility = t > 7.3 && t < 9.1 ? 'visible' : 'hidden';
  mline.style.transform = `scaleY(${(prog(t, 7.45, 8.1, E.outCubic) * (1 - prog(t, 8.6, 8.9, E.inCubic))).toFixed(3)})`;
  CHIPS.forEach((c, i) => {
    const t0 = 7.45 + i * 0.1;
    const a = prog(t, t0, t0 + 0.6, E.outExpo);
    const b = prog(t, 8.62 + i * 0.04, 8.9 + i * 0.04, E.inCubic);
    c.d.style.opacity = (a * (1 - b)).toFixed(3);
    c.d.style.transform = `translate3d(${((1 - a) * -80 - b * 40).toFixed(1)}px,0,0)`;
    c.d.style.filter = blur((1 - a) * 10 + b * 8);
    c.b.style.transform = `scale(${E.spring(clamp((t - t0) / 0.6)).toFixed(3)})`;
  });

  // ---- Kapwa
  kapL.style.visibility = t >= 15.55 && t < 18.65 ? 'visible' : 'hidden';
  if (t >= 15.55 && t < 18.65) {
    const [kx, ky, ks, kr] = kapT(t);
    const fl = Math.sin(t * 2.2) * 10;
    kapwa.style.transform = `translate3d(${(kx - KAP_W / 2).toFixed(1)}px,${(ky - KAP_H / 2 + fl).toFixed(1)}px,0) rotate(${kr.toFixed(2)}deg) scale(${ks.toFixed(4)})`;
    const burst = win(t, 15.6, 17.0, 0.25, 0.6);
    kRays.style.transform = `translate3d(${(kx - 900).toFixed(1)}px,${(ky - 900).toFixed(1)}px,0) rotate(${((t - 15.6) * 24).toFixed(2)}deg) scale(${(0.5 + ks * 0.7).toFixed(3)})`;
    kRays.style.opacity = (burst * 0.95).toFixed(3);
    kGlow.style.transform = `translate3d(${(kx - 550).toFixed(1)}px,${(ky - 550).toFixed(1)}px,0) scale(${(0.3 + ks * 0.8).toFixed(3)})`;
    kGlow.style.opacity = clamp(ks * 1.1).toFixed(3);
    kRings.forEach((rg, i) => {
      const q = clamp((t - 15.62 - i * 0.14) / 0.9);
      rg.style.transform = `translate3d(${(kx - 350).toFixed(1)}px,${(ky - 350).toFixed(1)}px,0) scale(${(0.3 + E.outCubic(q) * 1.6).toFixed(3)})`;
      rg.style.opacity = (q > 0 && q < 1 ? (1 - q) * 0.8 : 0).toFixed(3);
    });
  }

  // ---- headlines
  const brandV = win(t, 3.75, 21.6, 0.5, 0.05);
  brand.style.opacity = brandV.toFixed(3);
  brand.style.transform = `translate3d(${((1 - prog(t, 3.75, 4.4, E.outExpo)) * 40).toFixed(1)}px,0,0)`;
  for (const s of SCN) {
    const on = t > s.a - 0.1 && t < s.b + 0.2;
    for (const n of [s.e.d, s.h.h, s.s.d]) n.style.visibility = on ? 'visible' : 'hidden';
    if (!on) continue;
    const tin = s.a + (s.a === 3.6 ? 0.25 : 0.12);
    const tout = s.b - 0.34;
    animEyebrow(s.e, t, tin, tout);
    animWords(s.h.words, t, tin + 0.06, tout);
    animChars(s.s.cs, t, tin + 0.45, tout);
  }

  // ---- S7 wall
  const s7on = t >= 18.45 && t < 22.0;
  s7.style.visibility = s7on ? 'visible' : 'hidden';
  if (s7on) {
    const dol = prog(t, 18.6, 19.9, E.outExpo);
    const push = prog(t, 20.9, 21.65, E.inExpo);
    const S = lerp(1.9, 0.86, dol) + push * 0.22;
    const rx = lerp(0, 26, dol) - push * 6;
    const rz = lerp(0, -15, dol) - push * 5;
    wall.style.transform = `translateY(${(lerp(0, 40, dol)).toFixed(1)}px) scale(${S.toFixed(4)}) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
    const tt = t - 18.6;
    const extra = push * push * 1.6;
    cols.forEach((c) => {
      const off = c.speed * (tt + extra) + c.phase;
      const sh = ((((off + SET / 2) % SET) + SET) % SET) - SET / 2;
      c.c.style.transform = `translate3d(0,${sh.toFixed(1)}px,0)`;
    });
    s7.style.opacity = prog(t, 18.45, 18.72, E.lin).toFixed(3);
    s7Shade.style.opacity = prog(t, 19.0, 19.6).toFixed(3);
    wall.style.filter = blur(prog(t, 19.05, 19.7, E.inOutCubic) * 5 * (1 - prog(t, 21.1, 21.5)));
    animWords(s7Text.words, t, 19.25, null, { stag: 0.14, dur: 0.75, dy: 140 });
    s7.style.filter = push > 0.05 ? `blur(${(push * 3).toFixed(2)}px)` : 'none';
  }

  // ---- glitch 21.6 → 22.0
  const gOn = t >= 21.52 && t < 22.0;
  glitchL.style.visibility = gOn ? 'visible' : 'hidden';
  if (s7on) {
    if (t >= 21.52) {
      const j = (hash(f * 13) - 0.5) * 90;
      s7.style.transform = `translate3d(${j.toFixed(1)}px,0,0)`;
      s7Text.words.forEach((w) => { w.style.textShadow = `${(-14 + hash(f) * 6).toFixed(1)}px 0 rgba(255,40,110,0.75), ${(14 - hash(f + 5) * 6).toFixed(1)}px 0 rgba(40,230,255,0.75)`; });
    } else {
      s7.style.transform = 'none';
      s7Text.words.forEach((w) => { w.style.textShadow = 'none'; });
    }
  }
  if (gOn) {
    const cl = ['#1D9FDA', '#61A644', '#F4F5F9', '#181A2E', '#2FE0CB', '#FFFFFF'];
    gbars.forEach((b, i) => {
      const r1 = hash(f * 31 + i * 7), r2 = hash(f * 17 + i * 3), r3 = hash(f * 5 + i * 11);
      const show = r3 < 0.62;
      b.style.display = show ? 'block' : 'none';
      if (!show) return;
      b.style.top = px(Math.floor(r1 * 1920));
      b.style.height = px(6 + Math.floor(r2 * 110));
      b.style.left = px(Math.floor((r2 - 0.3) * 600));
      b.style.width = px(300 + Math.floor(r3 * 1100));
      b.style.background = cl[(i + f) % cl.length];
      b.style.opacity = (0.55 + r1 * 0.45).toFixed(2);
    });
  }

  // ---- S8 end card
  const s8on = t >= 21.62;
  s8.style.visibility = s8on ? 'visible' : 'hidden';
  if (s8on) {
    const flick = t < 21.9 ? (hash(f * 19) < 0.5 ? 1 : 0) : 1;
    s8.style.opacity = String(flick);
    if (t < 21.9) {
      const top = Math.floor(hash(f * 23) * 1400);
      s8.style.clipPath = `inset(${top}px 0 ${Math.max(0, 1920 - top - 200 - hash(f * 29) * 700).toFixed(0)}px 0)`;
    } else s8.style.clipPath = 'none';
    s8b1.style.transform = `translate3d(${(260 + Math.sin(t * 0.7) * 80).toFixed(1)}px,${(560 + Math.cos(t * 0.5) * 60).toFixed(1)}px,0)`;
    s8b2.style.transform = `translate3d(${(820 + Math.cos(t * 0.6) * 80).toFixed(1)}px,${(1500 + Math.sin(t * 0.8) * 60).toFixed(1)}px,0)`;
    s8Rings.forEach((rg, i) => {
      const ph = (((t - 22.0) * 0.45 + i / 3) % 1 + 1) % 1;
      rg.style.transform = `scale(${(0.55 + ph * 1.1).toFixed(3)})`;
      rg.style.opacity = (Math.sin(ph * Math.PI) * 0.5 * prog(t, 22.1, 22.8)).toFixed(3);
    });
    const ia = E.spring(clamp((t - 21.95) / 0.75));
    const iy = (1 - prog(t, 21.95, 22.6, E.outExpo)) * 120;
    iconBox.style.transform = `translate3d(0,${iy.toFixed(1)}px,0) rotateY(${((1 - prog(t, 21.95, 22.7, E.outCubic)) * 75).toFixed(2)}deg) scale(${(0.25 + 0.75 * ia).toFixed(4)})`;
    iconBox.style.opacity = clamp((t - 21.95) / 0.12).toFixed(3);
    const sh = prog(t, 22.55, 23.15, E.inOutCubic);
    iconShine.style.left = px(-160 + sh * 480);
    animChars(word.cs, t, 22.25, null, { stag: 0.045, dur: 0.6, dy: 70 });
    animWords(tag.words, t, 22.85, null, { stag: 0.12, dur: 0.6, dy: 50, rot: 0 });
    const ca = E.spring(clamp((t - 23.25) / 0.7));
    cta.style.transform = `translate3d(-50%,${((1 - ca) * 40).toFixed(1)}px,0) scale(${(0.6 + 0.4 * ca).toFixed(4)})`;
    cta.style.opacity = clamp((t - 23.25) / 0.15).toFixed(3);
    ctaShine.style.left = px(-200 + prog(t, 23.6, 24.3, E.inOutCubic) * 1000);
    const settle = prog(t, 22.0, 25.0, E.lin);
    s8Inner.style.transform = `scale(${(1 + settle * 0.035).toFixed(4)})`;
  }

  // ---- streaks at cuts
  let st = null;
  for (const c of CUTS) if (t >= c - 0.1 && t < c + 0.45) st = c;
  if (st != null) {
    const q = prog(t, st - 0.1, st + 0.45, E.inOutCubic);
    streak.style.display = 'block';
    streak.style.left = px(-900 + q * 2700);
    streak.style.opacity = Math.sin(q * Math.PI).toFixed(3);
  } else streak.style.display = 'none';

  // ---- flash
  let fl = 0;
  fl += Math.max(0, 1 - Math.abs(t - 21.93) / 0.12) * 0.9;
  fl += Math.max(0, 1 - Math.abs(t - 15.62) / 0.15) * 0.35;
  flash.style.opacity = fl.toFixed(3);

  // ---- finish
  grain.style.backgroundImage = `url(${ASSET}grain-${f % 6}.png)`;
  grain.style.opacity = s8on && t > 21.9 ? '0.04' : '0.075';
  vignette.style.opacity = s8on && t > 21.9 ? '0.25' : '1';
}

// ================================================================ READY
async function ready() {
  const weights = [300, 400, 500, 600, 700];
  await Promise.all(weights.map((w) => document.fonts.load(`${w} 100px Poppins`)));
  await document.fonts.ready;
  const urls = new Set([ICON, `${ASSET}kapwa.png`, ...ALL_SCREENS.map(SCR), ...[0, 1, 2, 3, 4, 5].map((i) => `${ASSET}grain-${i}.png`)]);
  await Promise.all([...urls].map((u) => new Promise((res) => { const im = new Image(); im.onload = () => im.decode().then(res, res); im.onerror = res; im.src = u; window.__keep = (window.__keep || []).concat(im); })));
  await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = r; im.onerror = r; }))));
  render(0);
  return true;
}
window.render = render;
window.whenReady = ready();
