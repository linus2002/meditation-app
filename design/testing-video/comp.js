'use strict';
/*
 * "Serenity is ready for internal testing" — explainer video.
 * 0–15.6 s: a showreel-style motion intro on a 120 BPM grid (flat colour
 * fields, stroke-drawn mark, stretch type, an easing study, shape morphs,
 * a truchet wave, 3D dots, word punches, lockup). After that, the explainer
 * follows the voice-over; its times come from timeline.json.
 * render(t) paints the frame at t seconds; render.mjs steps it at 30 fps.
 */
const W = 1920, H = 1080;
const ASSET = '/design/testing-video/build/assets/';
const SCR = (n) => `/public/landing/screens/dark/${n}.webp`;
const ICON = '/public/icons/icon-1024.png';
const C = { mist: '#F4F5F9', blue: '#1D9FDA', green: '#61A644', mid: '#181A2E', teal: '#10739A', night: '#0B0D1F' };
const URL_TEXT = 'meditation-app-iota-six.vercel.app/get';

const stage = document.getElementById('stage');
const cam = document.getElementById('cam');
let TL, V = {}, B = {};

// ================================================================ helpers
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, q) => a + (b - a) * q;
const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inBack: (x) => { const c1 = 1.70158; return (c1 + 1) * x * x * x - c1 * x * x; },
  outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
  spring: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(9.5 * x)),
};
const prog = (t, t0, t1, e = E.outCubic) => e(clamp((t - t0) / (t1 - t0)));
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
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
const fx = (v, d = 2) => Number(v).toFixed(d);
const blur = (v) => (v > 0.25 ? `blur(${fx(v)}px)` : 'none');
/** Scene/layer toggle. display (not visibility) so children that set their own visibility stay hidden too. */
const vis = (e, on) => { e.style.display = on ? '' : 'none'; };

function chars(parent, text, cls, style) {
  const d = el('div', cls, parent, style);
  const cs = [...text].map((ch) => { const s = el('span', 'c', d); s.textContent = ch; return s; });
  return { d, cs };
}
function animChars(cs, t, tin, tout, { stag = 0.022, dur = 0.5, dy = 26, bl = 8 } = {}) {
  cs.forEach((c, i) => {
    const a = prog(t, tin + i * stag, tin + i * stag + dur, E.outCubic);
    const b = tout == null ? 0 : prog(t, tout + i * 0.006, tout + i * 0.006 + 0.28, E.inCubic);
    c.style.transform = `translate3d(0,${fx((1 - a) * dy - b * 24, 1)}px,0)`;
    c.style.opacity = fx(a * (1 - b), 3);
    c.style.filter = blur((1 - a) * bl + b * bl);
  });
}
function wordsEl(parent, lines, cls, style) {
  const d = el('div', cls, parent, style);
  const ws = [];
  lines.forEach((L) => {
    const line = el('div', '', d);
    L.t.split(' ').forEach((w, i, arr) => {
      const s = el('span', `w${L.g ? ' grad' : ''}`, line);
      s.textContent = w;
      ws.push(s);
      if (i < arr.length - 1) line.appendChild(document.createTextNode(' '));
    });
  });
  return { d, ws };
}
function animWords(ws, t, tin, tout, { stag = 0.07, dur = 0.65, dy = 70 } = {}) {
  ws.forEach((w, i) => {
    const a = prog(t, tin + i * stag, tin + i * stag + dur, E.outExpo);
    const b = tout == null ? 0 : prog(t, tout + i * 0.025, tout + i * 0.025 + 0.32, E.inCubic);
    w.style.transform = `translate3d(0,${fx((1 - a) * dy - b * 50, 1)}px,0)`;
    w.style.opacity = fx(a * (1 - b), 3);
    w.style.filter = blur((1 - a) * 14 + b * 10);
  });
}
/** Generic in/out for one element: slide + fade + blur. */
function show(e, t, tin, tout, { dy = 40, dx = 0, s0 = 1, bl = 12, dur = 0.6, odur = 0.35, ease = E.outExpo } = {}) {
  const a = prog(t, tin, tin + dur, ease);
  const b = tout == null ? 0 : prog(t, tout, tout + odur, E.inCubic);
  const v = a * (1 - b);
  if (v <= 0.002) { e.style.visibility = 'hidden'; return 0; }
  e.style.visibility = 'visible';
  e.style.opacity = fx(Math.min(1, v * 1.2), 3);
  e.style.transform = `translate3d(${fx(dx * (1 - a))}px,${fx(dy * (1 - a) - b * dy * 0.5)}px,0) scale(${fx(s0 + (1 - s0) * a, 4)})`;
  e.style.filter = blur((1 - a) * bl + b * bl * 0.6);
  return v;
}

const PL = 'M105 10 A296 296 0 0 0 256 500 A296 296 0 0 0 105 10Z';
const PR = 'M407 10 A296 296 0 0 1 256 500 A296 296 0 0 1 407 10Z';
let uid = 0;
function markSvg(w, c1 = C.blue, c2 = C.green, c3 = C.teal) {
  const id = `mk${uid++}`;
  return `<svg viewBox="22 6 468 498" width="${w}" height="${(w * 498) / 468}" style="display:block;overflow:visible">
    <defs><clipPath id="${id}"><path d="${PL}"/></clipPath></defs>
    <path class="pl" d="${PL}" fill="${c1}"/><path class="pr" d="${PR}" fill="${c2}"/><path class="po" d="${PR}" fill="${c3}" clip-path="url(#${id})"/></svg>`;
}
const svg = (w, h, body, vb = '0 0 24 24', extra = '') => `<svg width="${w}" height="${h}" viewBox="${vb}" ${extra}>${body}</svg>`;
const ICO = {
  check: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  person: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.2" fill="currentColor"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  pencil: '<path d="M4 20l4.5-1 10-10-3.5-3.5-10 10z M13.5 6.5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z M11.5 13.5L20 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.2C1.6 7.6 3.6 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.4 0 5.4 3.1 4.2 6.3C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="2"/>',
  wave: '<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z M5 19l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  android: '<path d="M17.523 15.341c-.551 0-.999-.449-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .551-.448 1-.999 1m-11.046 0c-.551 0-.999-.449-.999-1s.448-.999.999-.999c.551 0 .999.448.999.999 0 .551-.448 1-.999 1m11.405-6.02l1.997-3.459a.416.416 0 00-.152-.568.416.416 0 00-.568.152l-2.022 3.503C15.59 8.244 13.853 7.851 12 7.851s-3.59.393-5.137 1.099L4.841 5.447a.416.416 0 00-.568-.152.416.416 0 00-.152.568l1.997 3.459C2.689 11.187.343 14.659 0 18.761h24c-.343-4.102-2.689-7.574-6.118-9.44" fill="currentColor"/>',
  apple: '<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="currentColor"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  building: '<path d="M4 20V5l8-2v17M12 8l8 2v10M3 20h18M7 8h2M7 12h2M7 16h2M15 13h2M15 16h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  lotus: '<path d="M12 18c-3-2-4.5-5-4.5-8C9.5 11 11 12.5 12 14c1-1.5 2.5-3 4.5-4 0 3-1.5 6-4.5 8z M12 18c-4 0-7.5-2-9-5 2.5 0 4.5.8 6 2 M12 18c4 0 7.5-2 9-5-2.5 0-4.5.8-6 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
};
const icon = (name, size, color = 'currentColor') => `<span style="display:flex;color:${color}">${svg(size, size, ICO[name])}</span>`;

// ================================================================ HUD
const hud = el('div', 'hud', stage);
for (const [l, t, bl, bt] of [[1, 1, 1, 1], [0, 1, 0, 1], [1, 0, 1, 0], [0, 0, 0, 0]]) {
  el('div', 'br', hud, { [l ? 'left' : 'right']: '36px', [t ? 'top' : 'bottom']: '36px', [l ? 'borderLeftWidth' : 'borderRightWidth']: '2px', [t ? 'borderTopWidth' : 'borderBottomWidth']: '2px' });
}
el('div', 't', hud, { left: '78px', top: '52px' }, '<span style="font-weight:600">serenity</span><span class="dim">internal testing — 2026</span>');
const hudTR = el('div', 't', hud, { right: '78px', top: '52px' });
const hudBL = el('div', 't', hud, { left: '78px', bottom: '52px' }, '<span class="tc"></span><span class="dim">30 fps</span>');
const hudTC = hudBL.querySelector('.tc');
const hudBR = el('div', 't', hud, { right: '78px', bottom: '52px' });
const hudBar = el('div', 'bar', hud);
let hudKey = '';

// ================================================================ BODY BACKGROUND (under the intro)
const bodyBg = el('div', 'layer', cam, { background: 'radial-gradient(ellipse 120% 90% at 50% 40%, #121633 0%, #0B0D1F 60%, #06070F 100%)' });
const glowA = el('div', 'glow', bodyBg, { width: '1500px', height: '1500px', left: '-750px', top: '-750px', background: 'radial-gradient(circle, rgba(29,159,218,0.34) 0%, rgba(29,159,218,0.1) 35%, rgba(0,0,0,0) 66%)' });
const glowB = el('div', 'glow', bodyBg, { width: '1400px', height: '1400px', left: '-700px', top: '-700px', background: 'radial-gradient(circle, rgba(97,166,68,0.26) 0%, rgba(97,166,68,0.08) 35%, rgba(0,0,0,0) 66%)' });
const bodyL = el('div', 'layer', cam);

// ================================================================ INTRO
const introL = el('div', 'layer', cam);
const scene = (bg) => el('div', 'scene', introL, { background: bg });

// ---- i0: stroke-drawn mark (0–1.5)
const i0 = scene(C.mid);
const i0svg = el('div', 'abs', i0, { left: '660px', top: '240px', width: '600px', height: '600px' }, `
<svg width="600" height="600" viewBox="0 0 600 600">
  <defs><path id="ring" d="M300 300 m-238 0 a238 238 0 1 1 476 0 a238 238 0 1 1 -476 0"/></defs>
  <circle class="ring" cx="300" cy="300" r="270" fill="none" stroke="${C.mist}" stroke-width="1.5"/>
  <g class="ticks">${Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return `<circle cx="${fx(300 + Math.cos(a) * 205)}" cy="${fx(300 + Math.sin(a) * 205)}" r="${i % 3 ? 2 : 3.5}" fill="${C.mist}"/>`; }).join('')}</g>
  <g class="tring"><text font-family="Poppins" font-size="17" font-weight="400" fill="${C.mist}" fill-opacity="0.6" letter-spacing="3"><textPath href="#ring">serenity  ·  ready for internal testing  ·  serenity  ·  ready for internal testing  ·  </textPath></text></g>
  <g transform="translate(300 300) scale(0.36) translate(-256 -255)">
    <path class="dpl" d="${PL}" fill="${C.blue}" fill-opacity="0" stroke="${C.mist}" stroke-width="7"/>
    <path class="dpr" d="${PR}" fill="${C.green}" fill-opacity="0" stroke="${C.mist}" stroke-width="7"/>
  </g>
  <circle class="cdot" cx="300" cy="300" r="12" fill="${C.blue}"/>
</svg>`);
const i0ring = i0svg.querySelector('.ring'), i0ticks = i0svg.querySelector('.ticks'), i0tring = i0svg.querySelector('.tring');
const i0pl = i0svg.querySelector('.dpl'), i0pr = i0svg.querySelector('.dpr'), i0dot = i0svg.querySelector('.cdot');
let PETAL_LEN = 1400;

// ---- i1: stretch wordmark (1.5–3.0)
const i1 = scene(C.blue);
const i1word = chars(i1, 'serenity', 'word', { top: '300px', fontSize: '300px', color: C.mist });
i1word.cs.forEach((c) => { c.style.transformOrigin = '50% 85%'; });
const i1sub = chars(i1, 'ready for internal testing', 'word', { top: '660px', fontSize: '58px', fontWeight: '300', letterSpacing: '0', color: C.mist });

// ---- i2: easing study (3.0–5.5)
const i2 = scene(C.mist);
const i2title = chars(i2, 'Six ways to slow down.', 'abs', { left: '160px', top: '150px', fontSize: '66px', fontWeight: '500', color: C.mid, letterSpacing: '-0.02em', whiteSpace: 'nowrap' });
const i2note = el('div', 'abs', i2, { right: '160px', top: '182px', fontSize: '21px', fontWeight: '400', color: 'rgba(24,26,46,0.55)', whiteSpace: 'nowrap' }, 'same distance  ·  same duration (1.2s)');
const EASES = [E.lin, E.inOutCubic, E.outExpo, E.outBack, E.outElastic, E.outBounce];
const ROWS = ['meditate', 'breathe', 'sleep', 'move', 'talk to kapwa', 'reflect'];
const DOTC = [C.mid, C.blue, C.green, C.mid, C.blue, C.green];
const TRACK_X0 = 780, TRACK_X1 = 1740;
el('div', 'abs', i2, { left: px(TRACK_X0 - 6), top: '262px', fontSize: '20px', fontWeight: '600', color: C.mid }, 'a');
el('div', 'abs', i2, { left: px(TRACK_X1 - 5), top: '262px', fontSize: '20px', fontWeight: '600', color: C.mid }, 'b');
const i2rows = ROWS.map((label, i) => {
  const y = 310 + i * 96;
  const pts = Array.from({ length: 41 }, (_, k) => { const x = k / 40; const v = EASES[i](x); return `${fx(4 + x * 62)},${fx(44 - v * 36)}`; }).join(' ');
  const row = el('div', 'row', i2, { top: px(y - 30) }, `<div class="n">0${i + 1}</div><div class="l">${label}</div>
    <div class="curve">${svg(70, 50, `<path d="M4 44H66M4 8H66" stroke="rgba(24,26,46,0.2)" stroke-dasharray="2 3"/><polyline points="${pts}" fill="none" stroke="${C.mid}" stroke-width="2.2" stroke-linejoin="round"/>`, '0 0 70 50')}</div>`);
  const tr = el('div', 'track', i2, { left: px(TRACK_X0), top: px(y), width: px(TRACK_X1 - TRACK_X0) });
  const dot = el('div', 'dot', i2, { background: DOTC[i], left: px(TRACK_X0), top: px(y) });
  return { row, tr, dot, y };
});

// ---- i3: shape morph (5.5–7.5)
const i3 = scene(C.teal);
const i3svg = el('div', 'abs', i3, { left: '0', top: '0', width: '1920px', height: '1080px' },
  `<svg width="1920" height="1080"><path class="shape" fill="${C.mist}"/>${Array.from({ length: 12 }, () => `<circle class="od" r="9" fill="${C.mist}"/>`).join('')}</svg>`);
const i3shape = i3svg.querySelector('.shape');
const i3dots = [...i3svg.querySelectorAll('.od')];
const i3mark = el('div', 'abs', i3, { left: px(960 - 220), top: px(540 - 234), width: '440px', height: '468px', transformOrigin: '220px 300px' }, markSvg(440));
const i3capL = el('div', 'abs', i3, { left: '220px', top: '520px', fontSize: '24px', fontWeight: '500', color: 'rgba(244,245,249,0.8)', whiteSpace: 'nowrap' });
const i3capR = el('div', 'abs', i3, { right: '220px', top: '520px', fontSize: '24px', fontWeight: '400', color: 'rgba(244,245,249,0.6)', whiteSpace: 'nowrap' }, 'spring  ·  0.28s');
const SHAPES = ['circle', 'triangle', 'star', 'heart', 'serenity'];
const MORPH_T = [5.45, 5.9, 6.3, 6.7, 7.1];
const NANG = 240;
let RADII = null;

// ---- i4: truchet wave (7.5–9.0)
const i4 = scene(C.mid);
const tiles = [];
{
  const r = rng(3);
  for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
    const d = el('div', 'tile', i4, { left: px(col * 96), top: px(row * 96 - 36), color: C.mist },
      svg(96, 96, '<path d="M48 0A48 48 0 0 1 0 48M96 48A48 48 0 0 0 48 96" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>', '0 0 96 96'));
    tiles.push({ d, col, row, base: r() < 0.5 ? 0 : 90, hue: (col * 7 + row * 3) % 3, last: '' });
  }
}
const i4win = el('div', 'abs', i4, { left: '960px', top: '540px', width: '0', height: '0', border: `3px solid ${C.mist}`, boxSizing: 'border-box', background: '#0E1022' });

// ---- i5: 3D dots (8.6–10.5)
const i5 = scene('#0E1022');
const i5c = el('canvas', '', i5, {});
i5c.width = W; i5c.height = H;
const i5ctx = i5c.getContext('2d');
const i5cap = el('div', 'abs', i5, { left: '0', right: '0', top: '870px', textAlign: 'center', fontSize: '26px', fontWeight: '400', color: 'rgba(244,245,249,0.7)' });
const NP = 900;
const SPH = [], TOR = [];
for (let i = 0; i < NP; i++) {
  const y = 1 - (i / (NP - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
  SPH.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  const u = ((i % 45) / 45) * Math.PI * 2, v = (Math.floor(i / 45) / 20) * Math.PI * 2;
  TOR.push([(1 + 0.42 * Math.cos(v)) * Math.cos(u) * 0.78, 0.42 * Math.sin(v) * 0.78, (1 + 0.42 * Math.cos(v)) * Math.sin(u) * 0.78]);
}

// ---- i6: word punches (10.5–12.5)
const i6 = scene(C.mist);
const PUNCH = [
  { t: 10.5, w: 'breathe', bg: C.mist, fg: C.mid },
  { t: 10.75, w: 'in.', bg: C.mid, fg: C.mist, dot: C.green },
  { t: 11.0, w: 'breathe', bg: C.blue, fg: C.mist, wide: true },
  { t: 11.25, w: 'out.', bg: C.green, fg: C.mid, dot: C.blue },
  { t: 11.5, w: 'never', bg: C.mist, fg: C.mid, rows: true },
  { t: 12.0, w: 'rushed.', bg: C.mid, fg: C.mist, dot: C.green, line: true },
];
const i6rows = Array.from({ length: 6 }, (_, k) => el('div', 'abs', i6, { left: '-200px', top: px(-40 + k * 190), fontSize: '170px', fontWeight: '600', letterSpacing: '-0.03em', whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: `2px ${C.mid}`, lineHeight: '1' }, 'never never never never never never'));
const i6word = el('div', 'word', i6, { top: '330px', fontSize: '380px' });
const i6line = el('div', 'abs', i6, { left: '460px', top: '790px', height: '6px', width: '0', background: C.green, borderRadius: '3px' });
let i6cur = -1;

// ---- i7: lockup (12.5–15.6)
const i7 = scene(C.blue);
const i7burst = el('div', 'abs', i7, { left: '660px', top: '240px', width: '600px', height: '600px' },
  `<svg width="600" height="600" viewBox="0 0 600 600">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<line class="bl" x1="${fx(300 + Math.cos(a) * 120)}" y1="${fx(300 + Math.sin(a) * 120)}" x2="${fx(300 + Math.cos(a) * 280)}" y2="${fx(300 + Math.sin(a) * 280)}" stroke="${C.mist}" stroke-width="4" stroke-linecap="round"/>`; }).join('')}</svg>`);
const i7lines = [...i7burst.querySelectorAll('.bl')];
const i7parts = Array.from({ length: 14 }, (_, i) => el('div', 'abs', i7, { width: px(8 + (i % 3) * 5), height: px(8 + (i % 3) * 5), borderRadius: '50%', background: i % 2 ? C.mist : C.green, left: '960px', top: '470px' }));
const i7lock = el('div', 'abs', i7, { left: '0', top: '0', display: 'flex', alignItems: 'center' });
const i7mark = el('div', '', i7lock, { width: '150px', height: '160px', flex: 'none' }, markSvg(150, C.mist, C.mist, '#BFD6E6'));
const i7wrap = el('div', '', i7lock, { overflow: 'hidden', height: '220px', display: 'flex', alignItems: 'center' });
const i7word = el('span', '', i7wrap, { paddingLeft: '40px', fontSize: '196px', fontWeight: '600', letterSpacing: '-0.035em', color: C.mist, whiteSpace: 'nowrap', lineHeight: '1' }, 'serenity');
const i7sub = chars(i7, 'ready for internal testing', 'abs', { top: '610px', fontSize: '60px', fontWeight: '300', color: C.mist, whiteSpace: 'nowrap' });
const i7rule = el('div', 'abs', i7, { top: '712px', height: '2px', background: C.mist, width: '0' });
const i7row = el('div', 'abs', i7, { top: '736px', fontSize: '22px', fontWeight: '500', color: 'rgba(244,245,249,0.9)', whiteSpace: 'nowrap', display: 'flex', gap: '22px', alignItems: 'center' },
  'Getmeds Incorporated<span style="opacity:.6">·</span>2MG Incorporated<span style="opacity:.6">·</span>free during testing<span style="opacity:.6">·</span>Android &amp; iPhone');
let WORD_W = 760, LOCK_X = 0;

// ================================================================ PHONE
const ICONS = `<svg width="34" height="22" viewBox="0 0 34 22"><rect x="0" y="14" width="6" height="8" rx="1.5" fill="#fff"/><rect x="9" y="10" width="6" height="12" rx="1.5" fill="#fff"/><rect x="18" y="5" width="6" height="17" rx="1.5" fill="#fff"/><rect x="27" y="0" width="6" height="22" rx="1.5" fill="#fff"/></svg>
<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M3 8.5a17 17 0 0 1 24 0"/><path d="M8 13.2a10 10 0 0 1 14 0"/><circle cx="15" cy="18.5" r="2.4" fill="#fff" stroke="none"/></svg>
<svg width="50" height="24" viewBox="0 0 50 24"><rect x="1" y="1" width="42" height="22" rx="7" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><rect x="4" y="4" width="36" height="16" rx="4.5" fill="#fff"/><rect x="45" y="8" width="3.5" height="8" rx="1.5" fill="rgba(255,255,255,.55)"/></svg>`;
const phoneL = el('div', 'layer', bodyL, { perspective: '2000px' });
const phoneGlow = el('div', 'glow', phoneL, { width: '1100px', height: '1100px', left: '-550px', top: '-550px', background: 'radial-gradient(circle, rgba(29,159,218,0.35) 0%, rgba(97,166,68,0.12) 38%, rgba(0,0,0,0) 66%)' });
const pw = el('div', 'pw', phoneL);
for (let i = 14; i >= 1; i--) {
  const s = el('div', 'slab', pw, { transform: `translateZ(${fx(-i * 4.2, 1)}px)` });
  const f = Math.sin((i / 14) * Math.PI), l1 = Math.round(110 + f * 110), l2 = Math.round(70 + f * 70);
  s.style.background = i === 14 ? '#1a1c22' : `linear-gradient(135deg, rgb(${l1},${l1 + 2},${l1 + 8}) 0%, rgb(${l2},${l2 + 2},${l2 + 7}) 50%, rgb(${l1},${l1 + 2},${l1 + 8}) 100%)`;
}
const pFront = el('div', 'front', pw);
const pBezel = el('div', 'bezel', pFront);
const pScreen = el('div', 'screen', pBezel);
const PSCREENS = ['home', 'meditations', 'program', 'timer', 'stories', 'story', 'yoga', 'kapwa', 'reflections'];
const pImgs = {};
for (const n of PSCREENS) {
  const c = el('div', 'si', pScreen);
  el('div', 'bleed', c, { backgroundImage: `url(${SCR(n)})` });
  el('img', '', c).src = SCR(n);
  pImgs[n] = c;
}
// custom breathing screen
const breath = el('div', 'si', pScreen, { background: 'radial-gradient(ellipse at 50% 45%, #13324a 0%, #070b14 70%)' });
pImgs.breath = breath;
el('div', 'abs', breath, { left: '0', right: '0', top: '120px', textAlign: 'center', fontSize: '24px', fontWeight: '400', color: 'rgba(255,255,255,0.6)' }, 'Breathing');
el('div', 'abs', breath, { left: '0', right: '0', top: '156px', textAlign: 'center', fontSize: '40px', fontWeight: '600' }, 'Box breathing');
el('div', 'abs', breath, { left: '0', right: '0', top: '232px', display: 'flex', justifyContent: 'center', gap: '14px' },
  ['Box', '4-7-8', 'Calm'].map((c, i) => `<div style="padding:12px 26px;border-radius:24px;font-size:22px;font-weight:500;${i === 0 ? 'background:linear-gradient(95deg,#1D9FDA,#61A644)' : 'background:rgba(255,255,255,0.1)'}">${c}</div>`).join(''));
const bRing = el('div', 'abs', breath, { left: '100px', top: '420px', width: '400px', height: '400px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', boxSizing: 'border-box' });
const bCircle = el('div', 'abs', breath, { left: '100px', top: '420px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, rgba(61,189,245,0.95), rgba(29,159,218,0.7) 45%, rgba(97,166,68,0.65) 100%)', boxShadow: '0 0 80px rgba(61,189,245,0.45)' });
const bLabel = el('div', 'abs', breath, { left: '0', right: '0', top: '590px', textAlign: 'center', fontSize: '44px', fontWeight: '600' });
const bCount = el('div', 'abs', breath, { left: '0', right: '0', top: '648px', textAlign: 'center', fontSize: '28px', fontWeight: '400', color: 'rgba(255,255,255,0.75)' });
el('div', 'abs', breath, { left: '0', right: '0', top: '940px', textAlign: 'center', fontSize: '24px', fontWeight: '400', color: 'rgba(255,255,255,0.6)' }, 'Follow the circle');
el('div', 'status', pScreen, {}, `<span>9:41</span><span class="icons">${ICONS}</span>`);
el('div', 'island', pBezel);
const pGlare = el('div', 'glare', pFront);
let PHONE_SEQ = [];

function phoneScreens(t) {
  let cur = 0;
  for (let i = 0; i < PHONE_SEQ.length; i++) if (t >= PHONE_SEQ[i].t) cur = i;
  const c = PHONE_SEQ[cur];
  const q = prog(t, c.t, c.t + 0.42, E.inOutCubic);
  for (const n in pImgs) { pImgs[n].style.opacity = '0'; pImgs[n].style.zIndex = '0'; }
  const on = pImgs[c.s];
  on.style.opacity = '1'; on.style.zIndex = '2';
  on.style.transform = `translate3d(${fx(cur > 0 ? (1 - q) * 600 : 0)}px,0,0)`;
  on.style.filter = 'none';
  if (cur > 0 && q < 1) {
    const p = pImgs[PHONE_SEQ[cur - 1].s];
    p.style.opacity = '1'; p.style.zIndex = '1';
    p.style.transform = `translate3d(${fx(-q * 190)}px,0,0)`;
    p.style.filter = `brightness(${fx(1 - q * 0.6, 3)})`;
  }
}
function setPhone(x, y, rx, ry, rz, sc, o = 1) {
  if (o <= 0.002) { phoneL.style.visibility = 'hidden'; return; }
  phoneL.style.visibility = 'visible';
  pw.style.transform = `translate3d(${fx(x - 316)}px,${fx(y - 666)}px,0) rotateZ(${fx(rz, 3)}deg) rotateY(${fx(ry, 3)}deg) rotateX(${fx(rx, 3)}deg) scale(${fx(sc, 4)})`;
  phoneL.style.opacity = o < 0.999 ? fx(o, 3) : '';
  pGlare.style.backgroundPosition = `${fx(50 - ry * 2.2 + rz * 1.5, 1)}% 0`;
  phoneGlow.style.transform = `translate3d(${fx(x)}px,${fx(y)}px,0)`;
  phoneGlow.style.opacity = fx(o * 0.9, 3);
}

// ================================================================ BODY SCENES
function block(parent, { x = 160, y = 170, eyebrow, live, title, lead, leadW = 680 }) {
  const eb = el('div', 'abs eyebrow', parent, { left: px(x), top: px(y) }, `${live ? '<span class="live"></span>' : ''}<span>${eyebrow}</span>`);
  const tt = wordsEl(parent, title, 'abs title', { left: px(x - 4), top: px(y + 52) });
  const ld = lead ? el('div', 'abs lead', parent, { left: px(x), top: px(y + 70 + title.length * 92), width: px(leadW) }, lead) : null;
  return { eb, tt, ld, live: eb.querySelector('.live') };
}
function animBlock(b, t, tin, tout) {
  show(b.eb, t, tin, tout, { dy: 20 });
  animWords(b.tt.ws, t, tin + 0.08, tout);
  if (b.ld) show(b.ld, t, tin + 0.35, tout, { dy: 24 });
  if (b.live) b.live.style.boxShadow = `0 0 0 ${fx(((t * 1.2) % 1) * 16, 1)}px rgba(97,166,68,${fx(0.6 * (1 - ((t * 1.2) % 1)), 3)})`;
}

// ---- welcome
const sWel = el('div', 'layer', bodyL);
const wel = block(sWel, { y: 210, eyebrow: 'Internal testing  ·  now open', live: true, title: [{ t: 'Serenity is ready' }, { t: 'for internal testing', g: true }],
  lead: 'Our meditation and wellbeing app is open to every team member at' });
const companyRow = el('div', 'abs', sWel, { left: '160px', top: '640px', display: 'flex', gap: '24px' });
const COMPANIES = ['Getmeds Incorporated', '2MG Incorporated'].map((n) => el('div', 'pill', companyRow, {}, `${icon('building', 30, '#7FD0F5')}<span>${n}</span>`));

// ---- benefits
const sBen = el('div', 'layer', bodyL);
const ben = block(sBen, { y: 170, eyebrow: 'Why Serenity', title: [{ t: 'Everyday calm,' }, { t: 'built in', g: true }] });
const BENEFITS = [['leaf', 'Manage everyday stress', 'Guided practices for busy days'], ['moon', 'Sleep better', 'Stories, sounds and a sleep log'], ['sun', 'Build healthier routines', 'Goals, check-ins and streaks']]
  .map(([ic, a, b], i) => {
    const c = el('div', 'card', sBen, { left: px(150 + i * 550), top: '500px', width: '520px', height: '275px', padding: '40px 44px' },
      `<div class="ic" style="width:76px;height:76px;background:linear-gradient(135deg,rgba(29,159,218,.35),rgba(97,166,68,.3))">${icon(ic, 40, '#fff')}</div>
       <div style="font-size:33px;font-weight:600;line-height:1.2;margin-top:30px">${a}</div><div style="font-size:25px;font-weight:300;line-height:1.4;color:rgba(255,255,255,.72);margin-top:10px">${b}</div>`);
    return c;
  });
const freeBadge = el('div', 'abs', sBen, { left: '1340px', top: '190px', width: '380px', height: '220px', textAlign: 'center', borderRadius: '36px', background: 'linear-gradient(135deg,#61A644,#1D9FDA)', boxShadow: '0 30px 80px rgba(97,166,68,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  '<div style="font-size:30px;font-weight:400">completely</div><div style="font-size:84px;font-weight:600;line-height:1">free</div><div style="font-size:26px;font-weight:400;opacity:.9;margin-top:6px">during testing</div>');

// ---- install
const sIns = el('div', 'layer', bodyL);
const ins = block(sIns, { y: 150, eyebrow: 'Getting started', title: [{ t: 'Install Serenity' }] });
const urlPill = el('div', 'abs url', sIns, { left: '160px', top: '330px' }, `${icon('link', 34, '#7FD0F5')}<span class="ut"></span><span class="cur" style="width:3px;height:38px;background:#fff;margin-left:-12px"></span>`);
const urlText = urlPill.querySelector('.ut'), urlCur = urlPill.querySelector('.cur');
function osCard(x, ic, name, steps) {
  const c = el('div', 'card', sIns, { left: px(x), top: '470px', width: '760px', height: '410px', padding: '44px 48px' },
    `<div style="display:flex;align-items:center;gap:22px">${icon(ic, 54, '#fff')}<div style="font-size:44px;font-weight:600">${name}</div></div>
     <div class="steps" style="margin-top:34px;display:flex;flex-direction:column;gap:22px">${steps.map((s, i) => `<div class="step"><b>${i + 1}</b><span>${s}</span></div>`).join('')}</div>`);
  return { c, steps: [...c.querySelectorAll('.step')] };
}
const andCard = osCard(160, 'android', 'Android', ['Open the link', 'Download the app', 'Install and open Serenity']);
const iosCard = osCard(1000, 'apple', 'iPhone', ['Open the link in Safari', 'Tap Share', 'Add to Home Screen']);
const insNote = el('div', 'abs', sIns, { left: '160px', top: '920px', fontSize: '30px', fontWeight: '400', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }, 'Then create your account and start exploring.');

// ---- features
const sFea = el('div', 'layer', bodyL);
const fea = block(sFea, { y: 140, eyebrow: 'Explore Serenity', title: [{ t: 'What you can do' }] });
const FEATS = ['Meditation & mindfulness', 'Breathing exercises', 'Sleep & relaxation', 'Gentle yoga & movement', 'Kapwa, your companion', 'Mood, goals & streaks', 'Monthly insights', 'Reflections & more'];
const feats = FEATS.map((f, i) => el('div', 'abs feat', sFea, { left: '160px', top: px(318 + i * 76) }, `<span class="fd"></span><span>${f}</span>`));
const langs = [['English', false], ['Filipino', true], ['Hindi', true]].map(([n, beta], i) => el('div', 'abs pill', sFea, { left: '800px', top: px(420 + i * 110) },
  `<span>${n}</span>${beta ? '<span class="beta" style="font-size:20px;font-weight:500;padding:6px 14px;border-radius:14px;background:rgba(97,166,68,.3);color:#B7E89F">beta</span>' : ''}`));
const streakCard = el('div', 'card', sFea, { left: '760px', top: '340px', width: '420px', height: '230px', padding: '30px 34px' },
  `<div style="font-size:26px;font-weight:600">Gentle streak</div>
   <div style="display:flex;gap:14px;margin-top:26px">${Array.from({ length: 7 }, (_, i) => `<div class="sd" style="width:38px;height:38px;border-radius:50%;${i === 3 ? 'border:3px solid rgba(255,255,255,.35);box-sizing:border-box' : 'background:linear-gradient(135deg,#1D9FDA,#61A644)'}"></div>`).join('')}</div>
   <div style="font-size:21px;font-weight:400;color:rgba(255,255,255,.7);margin-top:24px;line-height:1.35">one missed day a week<br>won't break your streak</div>`);
const streakDots = [...streakCard.querySelectorAll('.sd')];
const insightCard = el('div', 'card', sFea, { left: '760px', top: '610px', width: '420px', height: '250px', padding: '30px 34px' },
  `<div style="font-size:26px;font-weight:600">Monthly insights</div>
   <div style="display:flex;align-items:flex-end;gap:12px;height:120px;margin-top:22px">${[0.45, 0.6, 0.4, 0.75, 0.65, 0.9, 0.7, 1].map((h, i) => `<div class="ib" data-h="${h}" style="flex:1;border-radius:8px;background:${i % 2 ? '#61A644' : '#1D9FDA'};height:0"></div>`).join('')}</div>
   <div style="display:flex;justify-content:space-between;font-size:19px;color:rgba(255,255,255,.6);margin-top:12px"><span>minutes</span><span>mood</span><span>sleep</span></div>`);
const insightBars = [...insightCard.querySelectorAll('.ib')];
const EXTRAS = [['heart', 'Favorites'], ['wave', 'Custom sound mixes'], ['download', 'Offline downloads'], ['bell', 'Reminders'], ['moon', 'Light & dark modes']]
  .map(([ic, n], i) => el('div', 'abs pill', sFea, { left: '780px', top: px(320 + i * 104), fontSize: '28px' }, `${icon(ic, 30, '#7FD0F5')}<span>${n}</span>`));

// ---- test
const sTes = el('div', 'layer', bodyL);
const tes = block(sTes, { y: 170, eyebrow: 'Before a wider release', title: [{ t: 'Help us test', g: false }, { t: 'everything', g: true }] });
const CHECKS = ['Features and navigation', 'Design and readability', 'Speed and audio playback', 'Meditations, stories and yoga', "Kapwa's replies", 'Your phone and screen size']
  .map((n, i) => {
    const d = el('div', 'chk', sTes, { left: px(i < 3 ? 160 : 1000), top: px(490 + (i % 3) * 130) }, `<div class="box">${svg(34, 34, '<path class="ck" d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="22" stroke-dashoffset="22"/>')}</div><span>${n}</span>`);
    return { d, box: d.querySelector('.box'), ck: d.querySelector('.ck'), lb: d.querySelector('span') };
  });

// ---- feedback
const sFee = el('div', 'layer', bodyL);
const fee = block(sFee, { y: 150, eyebrow: 'Help & Support', title: [{ t: 'Send feedback in the app' }] });
const STEPS = [['person', 'Profile'], ['help', 'Help & Support'], ['flag', 'Raise a Concern'], ['pencil', 'Describe it'], ['image', 'Attach up to<br>3 screenshots'], ['send', 'Submit']];
const NODE_X = STEPS.map((_, i) => 285 + i * 270);
const feeLine = el('div', 'abs', sFee, { left: px(NODE_X[0]), top: '548px', width: px(NODE_X[5] - NODE_X[0]), height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.14)' });
const feeFill = el('div', 'abs', sFee, { left: px(NODE_X[0]), top: '548px', width: '0', height: '4px', borderRadius: '2px', background: 'linear-gradient(90deg,#1D9FDA,#61A644)' });
const nodes = STEPS.map(([ic, n], i) => {
  const d = el('div', 'node', sFee, { left: px(NODE_X[i] - 115), top: '498px' }, `<div class="ring">${icon(ic, 46, '#fff')}</div><div class="lb">${n}</div>`);
  return { d, ring: d.querySelector('.ring') };
});
const feeTip = el('div', 'abs', sFee, { left: '160px', top: '860px', fontSize: '28px', fontWeight: '400', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }, 'Tip: say what you were doing, and what you expected to happen.');

// ---- screenshot tips
const sSho = el('div', 'layer', bodyL);
const sho = block(sSho, { y: 170, eyebrow: 'Screenshot tips', title: [{ t: 'Show us the' }, { t: 'full picture', g: true }] });
function listCard(x, ic, col, head, items) {
  return el('div', 'card', sSho, { left: px(x), top: '520px', width: '760px', height: '360px', padding: '44px 48px' },
    `<div style="display:flex;align-items:center;gap:20px"><div class="ic" style="width:64px;height:64px;border-radius:50%;background:${col}">${icon(ic, 36, '#fff')}</div><div style="font-size:40px;font-weight:600">${head}</div></div>
     <div style="margin-top:30px;display:flex;flex-direction:column;gap:18px;font-size:30px;font-weight:400;color:rgba(255,255,255,.85)">${items.map((s) => `<div>${s}</div>`).join('')}</div>`);
}
const doCard = listCard(160, 'check', 'rgba(97,166,68,0.85)', 'Do', ['Keep screenshots original', 'Capture the full screen', 'Add a short description']);
const dontCard = listCard(1000, 'x', 'rgba(229,72,77,0.75)', 'Leave out', ['Cropping, edits or markings', 'Passwords and private details']);

// ---- IT reply
const sIt = el('div', 'layer', bodyL);
const itB = block(sIt, { y: 260, eyebrow: 'IT Department', title: [{ t: 'We read' }, { t: 'every message', g: true }],
  lead: "Every concern, suggestion and idea is reviewed, and we'll reply in the app when we need more detail.", leadW: 640 });
const chat = el('div', 'card', sIt, { left: '960px', top: '250px', width: '800px', height: '600px' });
el('div', 'abs', chat, { left: '40px', top: '32px', fontSize: '26px', fontWeight: '600' }, 'Raise a Concern');
el('div', 'abs', chat, { left: '40px', top: '72px', fontSize: '21px', fontWeight: '400', color: 'rgba(255,255,255,0.55)' }, 'Help & Support');
const bubUser = el('div', 'bubble', chat, { right: '40px', top: '150px', background: 'linear-gradient(95deg,#1D9FDA,#178BC2)' }, "The sleep timer didn't fade out on my phone.");
const typing = el('div', 'bubble', chat, { left: '40px', top: '340px', background: 'rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }, '<i></i><i></i><i></i>');
const typingDots = [...typing.querySelectorAll('i')];
typingDots.forEach((d) => Object.assign(d.style, { width: '12px', height: '12px', borderRadius: '50%', background: '#fff', display: 'block' }));
const bubIt = el('div', 'bubble', chat, { left: '40px', top: '320px', background: 'rgba(255,255,255,0.1)' },
  '<div style="font-size:20px;font-weight:600;color:#9BE27A;margin-bottom:6px">IT Department</div>Thanks for flagging this! Which phone are you using?');

// ---- close
const sClo = el('div', 'layer', bodyL);
const clo = block(sClo, { y: 330, eyebrow: 'No experience needed', title: [{ t: 'Explore at your' }, { t: 'own pace', g: true }] });
const endL = el('div', 'layer', sClo);
const endLock = el('div', 'abs', endL, { left: '0', right: '0', top: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '34px' },
  `${markSvg(120)}<span style="font-size:150px;font-weight:600;letter-spacing:-0.035em;line-height:1">serenity</span>`);
const endLine = el('div', 'abs', endL, { left: '0', right: '0', top: '520px', textAlign: 'center', fontSize: '48px', fontWeight: '500' }, "Let's make Serenity better, <span class=\"grad\">together.</span>");
const endUrl = el('div', 'abs', endL, { left: '0', right: '0', top: '640px', display: 'flex', justifyContent: 'center' }, `<div class="url">${icon('link', 34, '#7FD0F5')}<span>${URL_TEXT}</span></div>`);
const endSig = el('div', 'abs', endL, { left: '0', right: '0', top: '800px', textAlign: 'center', fontSize: '26px', fontWeight: '400', color: 'rgba(255,255,255,0.7)' }, 'Linus  ·  IT Department Development Team');

// overlays
const wipe = el('div', 'layer', cam, { background: C.blue, visibility: 'hidden' });
const flash = el('div', '', cam); flash.id = 'flash';
const grain = el('div', '', stage); grain.id = 'grain';
stage.appendChild(hud);

// ================================================================ RENDER
function tc(t) {
  const f = Math.floor(t * 30 + 1e-6);
  const s = Math.floor(f / 30), ff = f % 30;
  return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}
const lightBg = (t) => (t >= 3.0 && t < 5.5) || (t >= 10.5 && t < 10.75) || (t >= 11.25 && t < 12.0);

function renderIntro(t) {
  const f = Math.round(t * 30);
  // i0
  vis(i0, t < 1.5);
  if (t < 1.5) {
    const ex = prog(t, 1.28, 1.5, E.inBack);
    i0svg.style.transform = `scale(${fx(1 - ex, 4)}) rotate(${fx(ex * 60)}deg)`;
    i0dot.setAttribute('r', fx(12 * E.spring(clamp((t - 0.05) / 0.4)) * (1 - prog(t, 0.6, 0.8)), 2));
    const rr = prog(t, 0.1, 0.8, E.outExpo);
    i0ring.setAttribute('r', fx(30 + rr * 240));
    i0ring.setAttribute('stroke-opacity', fx(0.6 - rr * 0.35, 3));
    const draw = prog(t, 0.3, 0.95, E.inOutCubic);
    for (const pth of [i0pl, i0pr]) {
      pth.setAttribute('stroke-dashoffset', fx(PETAL_LEN * (1 - draw)));
      pth.setAttribute('fill-opacity', fx(prog(t, 0.85, 1.1), 3));
      pth.setAttribute('stroke-opacity', fx(1 - prog(t, 1.0, 1.2), 3));
    }
    i0ticks.setAttribute('opacity', fx(prog(t, 0.55, 0.8), 3));
    i0ticks.setAttribute('transform', `rotate(${fx(t * 40)} 300 300)`);
    i0tring.setAttribute('opacity', fx(prog(t, 0.7, 1.0), 3));
    i0tring.setAttribute('transform', `rotate(${fx(-t * 25)} 300 300)`);
  }
  // i1
  vis(i1, t >= 1.5 && t < 3.0);
  if (t >= 1.5 && t < 3.0) {
    i1word.cs.forEach((c, i) => {
      const a = E.outElastic(clamp((t - 1.5 - i * 0.035) / 0.7));
      const w = Math.max(0, Math.sin(Math.PI * clamp((t - 2.15 - i * 0.045) / 0.3)));
      const ex = prog(t, 2.8 + i * 0.012, 2.95 + i * 0.012, E.inCubic);
      const sy = Math.max(0, a * (1 - 0.18 * w) * (1 - ex));
      const sx = (1 + (1 - Math.min(a, 1)) * 0.6) * (1 + 0.38 * w);
      c.style.transform = `scale(${fx(sx, 3)},${fx(sy, 3)})`;
      c.style.opacity = t < 1.5 + i * 0.035 ? '0' : '1';
    });
    animChars(i1sub.cs, t, 1.95, 2.78, { stag: 0.018 });
  }
  // i2
  vis(i2, t >= 3.0 && t < 5.5);
  if (t >= 3.0 && t < 5.5) {
    animChars(i2title.cs, t, 3.02, 5.05, { stag: 0.014, dy: 30 });
    show(i2note, t, 3.2, 5.05, { dy: 10 });
    const merge = prog(t, 5.12, 5.48, E.inOutCubic);
    i2rows.forEach((r, i) => {
      show(r.row, t, 3.08 + i * 0.05, 5.02, { dx: -40, dy: 0 });
      show(r.tr, t, 3.12 + i * 0.05, 5.02, { dx: 0, dy: 0, bl: 0 });
      const q = clamp((t - 3.6) / 1.2);
      const v = EASES[i](q);
      const vel = Math.abs(EASES[i](clamp(q + 0.02)) - EASES[i](clamp(q - 0.02))) / 0.04 / 1.2;
      const sxx = 1 + Math.min(1.6, vel * 0.55);
      let x = lerp(TRACK_X0, TRACK_X1, v), y = r.y;
      x = lerp(x, 960, merge); y = lerp(y, 540, merge);
      r.dot.style.left = px(x); r.dot.style.top = px(y);
      r.dot.style.transform = `scale(${fx(sxx * (t < 3.15 ? E.spring(clamp((t - 3.0) / 0.3)) : 1), 3)},${fx(1 / Math.sqrt(sxx), 3)})`;
      r.dot.style.background = merge > 0.6 ? C.blue : DOTC[i];
      r.dot.style.opacity = fx(prog(t, 3.1 + i * 0.05, 3.3 + i * 0.05), 3);
    });
  }
  // i3
  vis(i3, t >= 5.5 && t < 7.5);
  if (t >= 5.5 && t < 7.5 && RADII) {
    let k = 0;
    for (let i = 0; i < MORPH_T.length; i++) if (t >= MORPH_T[i]) k = i;
    const q = E.spring(clamp((t - MORPH_T[k]) / 0.32));
    const from = RADII[Math.max(0, k - 1)], to = RADII[k];
    const grow = k === 0 ? prog(t, 5.45, 5.75, E.outBack) : 1;
    const R = 230 * grow;
    const rot = (k - 1 + q) * 0;
    let d = '';
    for (let a = 0; a < NANG; a++) {
      const th = (a / NANG) * Math.PI * 2 + rot;
      const r = lerp(from[a], to[a], k === 0 ? 1 : q) * R;
      d += `${a ? 'L' : 'M'}${fx(960 + Math.cos(th) * r, 1)} ${fx(540 + Math.sin(th) * r, 1)}`;
    }
    i3shape.setAttribute('d', `${d}Z`);
    const zoom = prog(t, 7.22, 7.5, E.inExpo);
    const mk = prog(t, 7.1, 7.22);
    i3shape.setAttribute('fill-opacity', fx(1 - mk, 3));
    i3mark.style.opacity = fx(mk, 3);
    i3mark.style.transform = `scale(${fx(1 + zoom * 9, 3)})`;
    const pulse = Math.exp(-Math.max(0, t - MORPH_T[k]) * 6);
    i3dots.forEach((c, i) => {
      const a = (i / 12) * Math.PI * 2 + t * 0.9;
      const rr = (330 + pulse * 40) * prog(t, 5.5, 5.9, E.outBack);
      c.setAttribute('cx', fx(960 + Math.cos(a) * rr, 1));
      c.setAttribute('cy', fx(540 + Math.sin(a) * rr, 1));
      c.setAttribute('r', fx(7 + pulse * 6, 2));
      c.setAttribute('opacity', fx(1 - zoom, 3));
    });
    i3capL.textContent = `shape 0${k + 1} / 05  ·  ${SHAPES[k]}`;
    i3capL.style.opacity = i3capR.style.opacity = fx(prog(t, 5.6, 5.8) * (1 - zoom), 3);
  }
  // i4
  vis(i4, t >= 7.5 && t < 9.05);
  if (t >= 7.5 && t < 9.05) {
    const wave = (t - 7.55) / 1.0 * 1.4 - 0.25;
    for (const tl of tiles) {
      const dd = (tl.col + tl.row) / 31;
      const p = clamp((wave - dd) * 5);
      const e = E.inOutCubic(p);
      tl.d.style.transform = `rotate(${fx(tl.base + 90 * e, 1)}deg)`;
      const band = Math.sin(Math.PI * p);
      const col = band > 0.25 ? (tl.hue === 0 ? C.blue : tl.hue === 1 ? C.green : '#7FD0F5') : C.mist;
      if (col !== tl.last) { tl.d.style.color = col; tl.last = col; }
    }
    const wv = prog(t, 8.55, 9.0, E.inOutCubic);
    i4win.style.width = px(lerp(0, 2000, wv)); i4win.style.height = px(lerp(0, 1160, wv));
    i4win.style.left = px(960 - lerp(0, 1000, wv)); i4win.style.top = px(540 - lerp(0, 580, wv));
    i4win.style.borderRadius = px(lerp(0, 40, wv));
  }
  // i5
  vis(i5, t >= 8.98 && t < 10.5);
  if (t >= 8.98 && t < 10.5) {
    const ctx = i5ctx;
    ctx.clearRect(0, 0, W, H);
    const m1 = prog(t, 9.3, 9.75, E.inOutCubic), m2 = prog(t, 10.0, 10.3, E.inOutCubic);
    const col = prog(t, 10.32, 10.5, E.inBack);
    const breathe = 1 + 0.12 * Math.sin((t - 9) * 4);
    const R = 300 * breathe * (1 - col) * prog(t, 8.98, 9.3, E.outBack);
    const ay = t * 1.1, ax = 0.45;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    for (let i = 0; i < NP; i++) {
      const a = SPH[i], b = TOR[i];
      const m = m1 * (1 - m2);
      let x = lerp(a[0], b[0], m), y = lerp(a[1], b[1], m), z = lerp(a[2], b[2], m);
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const pz = 1 / (1 + z2 * 0.35);
      const depth = (z2 + 1) / 2;
      ctx.globalAlpha = 0.25 + 0.75 * (1 - depth);
      ctx.fillStyle = i % 7 === 0 ? C.blue : i % 11 === 0 ? C.green : C.mist;
      ctx.beginPath();
      ctx.arc(960 + x1 * R * pz, 520 + y2 * R * pz, (1.3 + 2.6 * (1 - depth)) * pz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    i5cap.textContent = t < 9.75 ? 'breathe in' : 'breathe out';
    i5cap.style.opacity = fx(prog(t, 9.1, 9.3) * (1 - col), 3);
  }
  // i6
  vis(i6, t >= 10.5 && t < 12.5);
  if (t >= 10.5 && t < 12.5) {
    let k = 0;
    for (let i = 0; i < PUNCH.length; i++) if (t >= PUNCH[i].t) k = i;
    const P = PUNCH[k];
    if (k !== i6cur) {
      i6cur = k;
      i6.style.background = P.bg;
      i6word.style.color = P.fg;
      i6word.innerHTML = P.dot ? `${P.w.slice(0, -1)}<span style="color:${P.dot}">.</span>` : P.w;
      i6rows.forEach((r) => { r.style.display = P.rows ? 'block' : 'none'; });
    }
    const kk = t - P.t;
    const s = 1.16 - 0.16 * E.outExpo(clamp(kk / 0.22));
    const sxw = P.wide ? lerp(0.7, 1.45, E.outExpo(clamp(kk / 0.25))) : 1;
    i6word.style.transform = `scale(${fx(s * sxw, 4)},${fx(s, 4)})`;
    if (P.rows) i6rows.forEach((r, j) => { r.style.transform = `translate3d(${fx((j % 2 ? -1 : 1) * (kk * 900) - (j % 2 ? 0 : 400))}px,0,0)`; r.style.opacity = j === 2 ? '0' : '0.9'; });
    i6line.style.width = px(P.line ? lerp(0, 1000, prog(t, 12.05, 12.4, E.outExpo)) : 0);
  }
  // i7
  vis(i7, t >= 12.5 && t < 15.62);
  if (t >= 12.5) {
    const k = t - 12.5;
    i7lines.forEach((ln, i) => {
      const q = clamp((k - i * 0.005) / 0.45);
      ln.setAttribute('stroke-opacity', fx(q > 0 && q < 1 ? 1 - q : 0, 3));
      ln.setAttribute('transform', `translate(300 300) scale(${fx(0.6 + E.outCubic(q) * 0.8, 3)}) translate(-300 -300)`);
    });
    i7parts.forEach((p, i) => {
      const a = (i / 14) * Math.PI * 2 + 0.3, q = clamp(k / 0.9), d = E.outCubic(q) * (260 + (i % 4) * 70);
      p.style.transform = `translate3d(${fx(Math.cos(a) * d)}px,${fx(Math.sin(a) * d)}px,0) scale(${fx(1 - q, 3)})`;
    });
    const ms = E.spring(clamp(k / 0.5));
    const reveal = prog(t, 12.85, 13.35, E.outExpo);
    const ww = WORD_W * reveal;
    const total = 150 + ww;
    LOCK_X = 960 - total / 2;
    const ex = prog(t, 15.1, 15.4, E.inCubic);
    i7lock.style.transform = `translate3d(${fx(LOCK_X)}px,${fx(360 - ex * 40)}px,0)`;
    i7lock.style.opacity = fx(1 - ex, 3);
    i7mark.style.transform = `scale(${fx(ms, 4)}) rotate(${fx((1 - ms) * -40)}deg)`;
    i7wrap.style.width = px(ww);
    const wx = 960 - (150 + WORD_W) / 2 + 150 + 40;
    i7sub.d.style.left = px(wx);
    animChars(i7sub.cs, t, 13.15, 15.1, { stag: 0.016 });
    i7rule.style.left = px(wx);
    i7rule.style.width = px(lerp(0, WORD_W - 40, prog(t, 13.45, 13.9, E.inOutCubic)) * (1 - ex));
    i7row.style.left = px(wx);
    show(i7row, t, 13.75, 15.08, { dy: 14 });
  }
  // wipe into the explainer
  const wp = prog(t, 15.2, 15.62, E.inOutCubic);
  if (t >= 15.2 && t < 15.65) { vis(wipe, true); wipe.style.transform = `translate3d(0,${fx(-wp * 1080)}px,0)`; vis(i7, false); } else vis(wipe, false);
  if (t >= 15.62) vis(i7, false);
  vis(introL, t < 15.62);
  // flash on the lockup hit
  flash.style.opacity = fx(Math.max(0, 1 - Math.abs(t - 12.5) / 0.1) * 0.5 + Math.max(0, 1 - Math.abs(t - 1.5) / 0.08) * 0.25, 3);
}

function renderBody(t) {
  const bs = TL.introEnd;
  vis(bodyBg, t >= 15.1);
  vis(bodyL, t >= 15.2);
  if (t < 15.1) return;
  glowA.style.transform = `translate3d(${fx(420 + Math.sin(t * 0.21) * 180)}px,${fx(300 + Math.cos(t * 0.17) * 120)}px,0)`;
  glowB.style.transform = `translate3d(${fx(1500 + Math.cos(t * 0.19) * 160)}px,${fx(820 + Math.sin(t * 0.23) * 120)}px,0)`;

  const sc = (id, pre = 0.4) => V[id].at - pre;
  const tin = { wel: bs + 0.2, ben: sc('benefits', 0.35), ins: sc('install'), fea: sc('meditate'), tes: sc('test'), fee: sc('feedback'), sho: sc('shots', 0.35), it: sc('it', 0.35), clo: sc('close') };
  const out = (next) => next - 0.38;
  const win = (a, b) => t >= a - 0.05 && t < b + 0.5;

  // welcome
  vis(sWel, win(tin.wel, out(tin.ben)));
  if (win(tin.wel, out(tin.ben))) {
    animBlock(wel, t, tin.wel, out(tin.ben));
    COMPANIES.forEach((c, i) => show(c, t, B[i ? 'company2' : 'company1'], out(tin.ben), { dy: 30, s0: 0.9 }));
  }
  // benefits
  vis(sBen, win(tin.ben, out(tin.ins)));
  if (win(tin.ben, out(tin.ins))) {
    animBlock(ben, t, tin.ben, out(tin.ins));
    BENEFITS.forEach((c, i) => show(c, t, B[`benefit${i + 1}`], out(tin.ins), { dy: 60, s0: 0.94 }));
    const fv = E.spring(clamp((t - B.free) / 0.6));
    const fo = prog(t, out(tin.ins), out(tin.ins) + 0.3, E.inCubic);
    freeBadge.style.visibility = t >= B.free && fo < 1 ? 'visible' : 'hidden';
    freeBadge.style.transform = `rotate(${fx((1 - fv) * -18 - 4)}deg) scale(${fx(0.3 + 0.7 * fv - fo * 0.2, 4)})`;
    freeBadge.style.opacity = fx(clamp((t - B.free) / 0.1) * (1 - fo), 3);
  }
  // install
  vis(sIns, win(tin.ins, out(tin.fea)));
  if (win(tin.ins, out(tin.fea))) {
    animBlock(ins, t, tin.ins, out(tin.fea));
    show(urlPill, t, tin.ins + 0.3, out(tin.fea), { dy: 20 });
    const n = Math.round(URL_TEXT.length * prog(t, V.install.at + 0.25, V.install.at + 1.6, E.lin));
    urlText.textContent = URL_TEXT.slice(0, n);
    urlCur.style.opacity = Math.floor(t * 3) % 2 ? '0.2' : '1';
    show(andCard.c, t, B.android, out(tin.fea), { dy: 60, s0: 0.95 });
    show(iosCard.c, t, B.iphone, out(tin.fea), { dy: 60, s0: 0.95 });
    const hl = (steps, t0, span) => steps.forEach((s, i) => {
      const on = t >= t0 + i * span;
      s.style.color = on ? '#fff' : 'rgba(255,255,255,0.55)';
      s.querySelector('b').style.background = on ? 'linear-gradient(135deg,#1D9FDA,#61A644)' : 'rgba(255,255,255,0.1)';
    });
    hl(andCard.steps, B.android + 0.3, 0.75);
    hl(iosCard.steps, B.iphone + 0.3, 0.9);
    show(insNote, t, V.install.at + V.install.dur - 0.6, out(tin.fea), { dy: 16 });
  }
  // features
  vis(sFea, win(tin.fea, out(tin.tes)));
  let phoneOn = false;
  if (win(tin.fea, out(tin.tes))) {
    animBlock(fea, t, tin.fea, out(tin.tes));
    const ACT = [V.meditate.at - 0.1, V.breathe.at - 0.1, V.sleep.at - 0.1, V.yoga.at - 0.1, V.kapwa.at - 0.1, V.track.at - 0.1, B.insights, B.extras];
    let act = -1;
    ACT.forEach((a, i) => { if (t >= a) act = i; });
    feats.forEach((f, i) => {
      show(f, t, tin.fea + 0.3 + i * 0.06, out(tin.tes), { dx: -40, dy: 0 });
      const on = i === act;
      const k = on ? prog(t, ACT[i], ACT[i] + 0.3) : 0;
      f.style.color = on ? '#fff' : i < act ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.38)';
      f.style.translate = `${fx(k * 16)}px 0`;
      const d = f.querySelector('.fd');
      d.style.background = on ? 'linear-gradient(135deg,#3DBDF5,#61A644)' : 'rgba(255,255,255,0.35)';
      d.style.boxShadow = on ? '0 0 16px rgba(61,189,245,0.8)' : 'none';
      d.style.transform = `scale(${fx(1 + k * 0.5, 3)})`;
    });
    langs.forEach((l, i) => show(l, t, B.langs + i * 0.45, V.track.at - 0.4, { dx: 60, dy: 0, s0: 0.9 }));
    show(streakCard, t, B.streak, B.extras - 0.2, { dx: 60, dy: 0 });
    streakDots.forEach((d, i) => { d.style.transform = `scale(${fx(E.spring(clamp((t - B.streak - 0.2 - i * 0.07) / 0.4)), 3)})`; });
    show(insightCard, t, B.insights, B.extras - 0.2, { dx: 60, dy: 0 });
    insightBars.forEach((b, i) => { b.style.height = px(120 * Number(b.dataset.h) * prog(t, B.insights + 0.2 + i * 0.05, B.insights + 0.7 + i * 0.05, E.outBack)); });
    EXTRAS.forEach((x, i) => show(x, t, B.extras + 0.1 + i * 0.28, out(tin.tes), { dx: 60, dy: 0, s0: 0.92 }));
    phoneOn = true;
  }
  // phone: welcome (home screen) and features
  const pIn1 = prog(t, tin.wel + 0.1, tin.wel + 1.1, E.outExpo), pOut1 = prog(t, out(tin.ben) - 0.1, out(tin.ben) + 0.35, E.inCubic);
  const pIn2 = prog(t, tin.fea + 0.1, tin.fea + 1.0, E.outExpo), pOut2 = prog(t, out(tin.tes), out(tin.tes) + 0.35, E.inCubic);
  const drift = Math.sin(t * 0.8) * 3;
  if (t < tin.fea - 0.1) {
    setPhone(1430, 555 + (1 - pIn1) * 700 + pOut1 * 700, 8, -20 + drift, 4, 0.56, pIn1 > 0 && pOut1 < 1 ? 1 : 0);
  } else {
    setPhone(1460 + (1 - pIn2) * 400 + pOut2 * 400, 560, 6, -16 + drift, 3, 0.62, pIn2 > 0 && pOut2 < 1 ? 1 : 0);
  }
  if (phoneL.style.visibility === 'visible') {
    phoneScreens(t);
    if (t >= V.breathe.at - 0.2 && t < V.sleep.at + 0.5) {
      const cyc = ((t - V.breathe.at) % 3.6 + 3.6) % 3.6, ph = Math.floor(cyc / 0.9), q = (cyc % 0.9) / 0.9;
      const sz = ph === 0 ? lerp(0.62, 1, E.inOutSine(q)) : ph === 1 ? 1 : ph === 2 ? lerp(1, 0.62, E.inOutSine(q)) : 0.62;
      bCircle.style.transform = `scale(${fx(sz, 4)})`;
      bLabel.textContent = ['inhale', 'hold', 'exhale', 'hold'][ph];
      bCount.textContent = `${Math.min(4, Math.floor(q * 4) + 1)}`;
    }
  }
  // test
  vis(sTes, win(tin.tes, out(tin.fee)));
  if (win(tin.tes, out(tin.fee))) {
    animBlock(tes, t, tin.tes, out(tin.fee));
    CHECKS.forEach((c, i) => {
      show(c.d, t, tin.tes + 0.45 + i * 0.07, out(tin.fee), { dy: 30 });
      const tk = B[`t${i + 1}`];
      const k = prog(t, tk, tk + 0.35, E.outCubic);
      c.ck.setAttribute('stroke-dashoffset', fx(22 * (1 - k)));
      c.box.style.background = k > 0 ? `linear-gradient(135deg, rgba(29,159,218,${fx(k, 2)}), rgba(97,166,68,${fx(k, 2)}))` : 'transparent';
      c.box.style.borderColor = k > 0 ? 'transparent' : 'rgba(255,255,255,0.3)';
      c.box.style.transform = `scale(${fx(1 + 0.18 * Math.sin(Math.PI * k), 3)})`;
      c.lb.style.color = k > 0.5 ? '#fff' : 'rgba(255,255,255,0.65)';
    });
  }
  // feedback
  vis(sFee, win(tin.fee, out(tin.sho)));
  if (win(tin.fee, out(tin.sho))) {
    animBlock(fee, t, tin.fee, out(tin.sho));
    show(feeLine, t, tin.fee + 0.3, out(tin.sho), { dy: 0, bl: 0 });
    let act = -1;
    nodes.forEach((n, i) => {
      show(n.d, t, tin.fee + 0.35 + i * 0.06, out(tin.sho), { dy: 40, s0: 0.85 });
      const tk = B[`f${i + 1}`];
      if (t >= tk) act = i;
      const k = prog(t, tk, tk + 0.4, E.outBack);
      n.ring.style.background = k > 0 ? 'linear-gradient(135deg,#1D9FDA,#61A644)' : 'rgba(255,255,255,0.06)';
      n.ring.style.borderColor = k > 0 ? 'transparent' : 'rgba(255,255,255,0.2)';
      n.ring.style.transform = `scale(${fx(1 + 0.15 * Math.sin(Math.PI * clamp((t - tk) / 0.4)), 3)})`;
      n.ring.style.boxShadow = k > 0 ? `0 0 ${fx(30 * k)}px rgba(61,189,245,0.45)` : 'none';
    });
    const fillTo = act < 0 ? 0 : NODE_X[act] - NODE_X[0];
    const prevTo = act <= 0 ? 0 : NODE_X[act - 1] - NODE_X[0];
    const kk = act < 0 ? 0 : prog(t, B[`f${act + 1}`] - 0.3, B[`f${act + 1}`], E.inOutCubic);
    feeFill.style.width = px(lerp(prevTo, fillTo, kk));
    feeFill.style.opacity = feeLine.style.opacity;
    show(feeTip, t, B.f5 + 0.2, out(tin.sho), { dy: 16 });
  }
  // screenshot tips
  vis(sSho, win(tin.sho, out(tin.it)));
  if (win(tin.sho, out(tin.it))) {
    animBlock(sho, t, tin.sho, out(tin.it));
    show(doCard, t, tin.sho + 0.5, out(tin.it), { dy: 60, s0: 0.95 });
    show(dontCard, t, B.dont, out(tin.it), { dy: 60, s0: 0.95 });
  }
  // it
  vis(sIt, win(tin.it, out(tin.clo)));
  if (win(tin.it, out(tin.clo))) {
    animBlock(itB, t, tin.it, out(tin.clo));
    show(chat, t, tin.it + 0.2, out(tin.clo), { dx: 80, dy: 0 });
    show(bubUser, t, V.it.at + 0.3, out(tin.clo), { dy: 30, s0: 0.9 });
    const ty = t >= V.it.at + 1.0 && t < B.reply + 0.25;
    typing.style.visibility = ty ? 'visible' : 'hidden';
    typingDots.forEach((d, i) => { d.style.opacity = fx(0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 0.9)), 3); });
    show(bubIt, t, B.reply + 0.25, out(tin.clo), { dy: 30, s0: 0.9 });
  }
  // close
  vis(sClo, t >= tin.clo - 0.05);
  if (t >= tin.clo - 0.05) {
    animBlock(clo, t, tin.clo, B.together - 0.3);
    const e0 = B.together + 0.1;
    show(endLock, t, e0, null, { dy: 50, s0: 0.9, dur: 0.8 });
    show(endLine, t, e0 + 0.35, null, { dy: 30 });
    show(endUrl, t, e0 + 0.7, null, { dy: 30 });
    show(endSig, t, e0 + 1.0, null, { dy: 20 });
    const fade = prog(t, TL.duration - 0.7, TL.duration, E.inOutSine);
    sClo.style.opacity = fx(1 - fade * 0.85, 3);
  }
}

function renderHud(t) {
  const light = lightBg(t);
  hud.style.color = light || (t >= 11.25 && t < 11.5) ? C.mid : C.mist;
  hudTC.textContent = tc(t);
  let ch = TL.chapters[0], ci = 0;
  TL.chapters.forEach((c, i) => { if (t >= c.at) { ch = c; ci = i; } });
  const intro = t < TL.introEnd;
  const beat = Math.floor(t / 0.5) % 4, bar = Math.min(8, Math.floor(t / 2) + 1);
  const key = intro ? `i${beat}${bar}` : `b${ci}`;
  if (key !== hudKey) {
    hudKey = key;
    hudTR.textContent = ch.label;
    hudBR.innerHTML = intro
      ? `<span class="dim">120 bpm</span><span>${[0, 1, 2, 3].map((i) => `<i class="sq${i === beat ? ' on' : ''}"></i>`).join('')}</span><span>bar ${bar}/8</span>`
      : `<span class="dim">chapter</span><span>${TL.chapters.map((_, i) => `<i class="sq${i <= ci ? ' on' : ''}"></i>`).join('')}</span><span>${ci + 1}/${TL.chapters.length}</span>`;
  }
  hudBar.style.width = px((W - 72) * clamp(t / TL.duration));
  hud.style.opacity = fx(prog(t, 0.1, 0.5) * (1 - prog(t, TL.duration - 0.6, TL.duration)), 3);
}

function render(t) {
  const f = Math.round(t * 30);
  renderIntro(t);
  renderBody(t);
  renderHud(t);
  let sx = 0, sy = 0;
  for (const [t0, amp] of [[1.5, 8], [12.5, 10]]) {
    const q = (t - t0) / 0.3;
    if (q >= 0 && q < 1) { const a = amp * (1 - q) ** 2; sx += (hash(f * 3 + 1) - 0.5) * 2 * a; sy += (hash(f * 7 + 2) - 0.5) * 2 * a; }
  }
  cam.style.transform = `translate3d(${fx(sx, 1)}px,${fx(sy, 1)}px,0)`;
  grain.style.backgroundImage = `url(${ASSET}grain-${f % 6}.png)`;
}

// ================================================================ READY
function sampleRadii() {
  const ns = 'http://www.w3.org/2000/svg';
  const tmp = document.createElementNS(ns, 'svg');
  document.body.appendChild(tmp);
  const samplePath = (d, n, cx, cy, s) => {
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); tmp.appendChild(p);
    const L = p.getTotalLength();
    return Array.from({ length: n }, (_, i) => { const q = p.getPointAtLength((i / n) * L); return [(q.x - cx) * s, (q.y - cy) * s]; });
  };
  const poly = (k, R, r2, rot = -Math.PI / 2) => Array.from({ length: k * (r2 ? 2 : 1) }, (_, i) => { const a = rot + (i / (k * (r2 ? 2 : 1))) * Math.PI * 2; const rr = r2 && i % 2 ? r2 : R; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
  const heart = Array.from({ length: 200 }, (_, i) => { const u = (i / 200) * Math.PI * 2; return [16 * Math.sin(u) ** 3 / 15, -(13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 15 + 0.1]; });
  const shapes = {
    circle: [poly(120, 1)],
    triangle: [poly(3, 1.3, 0, -Math.PI / 2).map(([x, y]) => [x, y + 0.15])],
    star: [poly(5, 1.25, 0.55)],
    heart: [heart],
    serenity: [samplePath(PL, 160, 256, 280, 1 / 230), samplePath(PR, 160, 256, 280, 1 / 230)],
  };
  PETAL_LEN = samplePathLen(PL);
  function samplePathLen(d) { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); tmp.appendChild(p); return p.getTotalLength(); }
  const ray = (polys, th) => {
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = 0;
    for (const pg of polys) for (let i = 0; i < pg.length; i++) {
      const [ax, ay] = pg[i], [bx, by] = pg[(i + 1) % pg.length];
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const tt = (ax * ey - ay * ex) / den, s = (ax * dy - ay * dx) / den;
      if (tt > 0 && s >= 0 && s <= 1 && tt > best) best = tt;
    }
    return best;
  };
  RADII = SHAPES.map((n) => Array.from({ length: NANG }, (_, a) => ray(shapes[n], (a / NANG) * Math.PI * 2)));
  tmp.remove();
}

async function ready() {
  TL = await (await fetch('/design/testing-video/timeline.json')).json();
  for (const v of TL.vo) V[v.id] = v;
  B = TL.beats;
  PHONE_SEQ = [
    { t: 0, s: 'home' },
    { t: V.meditate.at - 0.3, s: 'meditations' }, { t: B.programs, s: 'program' }, { t: B.timer, s: 'timer' },
    { t: V.breathe.at - 0.15, s: 'breath' }, { t: V.sleep.at - 0.15, s: 'stories' }, { t: B.sleeptimer, s: 'story' },
    { t: V.yoga.at - 0.15, s: 'yoga' }, { t: V.kapwa.at - 0.15, s: 'kapwa' }, { t: V.track.at - 0.15, s: 'reflections' },
  ];
  await Promise.all([300, 400, 500, 600].map((w) => document.fonts.load(`${w} 100px Poppins`)));
  await document.fonts.ready;
  const urls = [ICON, ...PSCREENS.map(SCR), ...[0, 1, 2, 3, 4, 5].map((i) => `${ASSET}grain-${i}.png`)];
  window.__keep = [];
  await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => im.decode().then(res, res); im.onerror = res; im.src = u; window.__keep.push(im); })));
  await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = r; im.onerror = r; }))));
  sampleRadii();
  for (const p of [i0pl, i0pr]) p.setAttribute('stroke-dasharray', fx(PETAL_LEN));
  i7wrap.style.width = 'auto';
  WORD_W = i7word.getBoundingClientRect().width + 2;
  render(0);
  return true;
}
window.render = render;
window.whenReady = ready();
