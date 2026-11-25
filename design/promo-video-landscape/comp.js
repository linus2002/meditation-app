'use strict';
/*
 * Serenity promo, 16:9 — deterministic motion-graphics composition.
 * Beat structure follows the reference edit: glow + logo intro, a phone that
 * tumbles in and opens the app, a whip into floating UI in 3D space, a
 * word-by-word tagline, the glow collapsing into the logo, and a quiet outro.
 * render(t) paints the frame at t seconds; render.mjs steps it at 30 fps.
 */
const W = 1920, H = 1080;
const PW = 632, PH = 1332;
const ASSET = '/design/promo-video-landscape/build/assets/';
const ART = (n) => `${ASSET}${n}.jpg`;
const ICON = '/public/icons/icon-1024.png';

const stage = document.getElementById('stage');
const cam = document.getElementById('cam');

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, q) => a + (b - a) * q;
const E = {
  lin: (x) => x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  spring: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(9.5 * x)),
};
const prog = (t, t0, t1, e = E.outCubic) => e(clamp((t - t0) / (t1 - t0)));
const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / fi) * (1 - clamp((t - (b - fo)) / fo));
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
const fx = (v, d = 2) => v.toFixed(d);

const PL = 'M105 10 A296 296 0 0 0 256 500 A296 296 0 0 0 105 10Z';
const PR = 'M407 10 A296 296 0 0 1 256 500 A296 296 0 0 1 407 10Z';
let uid = 0;
function markSvg(w, c1 = '#1D9FDA', c2 = '#61A644', c3 = '#10739A') {
  const id = `mk${uid++}`;
  return `<svg viewBox="22 6 468 498" width="${w}" height="${(w * 498) / 468}" style="display:block;overflow:visible">
    <defs><clipPath id="${id}"><path d="${PL}"/></clipPath></defs>
    <path d="${PL}" fill="${c1}"/><path d="${PR}" fill="${c2}"/><path d="${PR}" fill="${c3}" clip-path="url(#${id})"/></svg>`;
}

// ================================================================ BUILD
// ---------------------------------------------------------------- glows
const glowL = el('div', 'layer', cam);
const mainGlow = el('div', 'glow', glowL, { width: '2600px', height: '1600px',
  background: 'radial-gradient(ellipse at center, rgba(70,190,245,1) 0%, rgba(29,159,218,0.85) 16%, rgba(20,120,180,0.45) 36%, rgba(10,60,100,0.18) 52%, rgba(0,0,0,0) 68%)' });
const accentGlow = el('div', 'glow', glowL, { width: '1500px', height: '1100px',
  background: 'radial-gradient(ellipse at center, rgba(97,166,68,0.55) 0%, rgba(97,166,68,0.18) 35%, rgba(0,0,0,0) 65%)' });
const warmGlow = el('div', 'glow', glowL, { width: '1500px', height: '700px', left: '210px', top: '190px',
  background: 'radial-gradient(ellipse at center, rgba(244,245,249,0.42) 0%, rgba(214,226,240,0.16) 35%, rgba(0,0,0,0) 68%)', opacity: 0 });
const core = el('div', 'glow', glowL, { width: '420px', height: '420px', left: '750px', top: '330px',
  background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,235,255,0.95) 12%, rgba(61,189,245,0.7) 30%, rgba(29,159,218,0) 62%)', opacity: 0 });
const halo = el('div', 'glow', glowL, { width: '560px', height: '560px', left: '680px', top: '260px',
  background: 'radial-gradient(circle, rgba(2,6,14,0.92) 0%, rgba(2,6,14,0.7) 34%, rgba(2,6,14,0) 66%)', opacity: 0 });

// ---------------------------------------------------------------- phone
const phoneL = el('div', 'scene', cam, { perspective: '1800px' });
const ICONS = `<svg width="34" height="22" viewBox="0 0 34 22"><rect x="0" y="14" width="6" height="8" rx="1.5" fill="#fff"/><rect x="9" y="10" width="6" height="12" rx="1.5" fill="#fff"/><rect x="18" y="5" width="6" height="17" rx="1.5" fill="#fff"/><rect x="27" y="0" width="6" height="22" rx="1.5" fill="#fff"/></svg>
<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M3 8.5a17 17 0 0 1 24 0"/><path d="M8 13.2a10 10 0 0 1 14 0"/><circle cx="15" cy="18.5" r="2.4" fill="#fff" stroke="none"/></svg>
<svg width="50" height="24" viewBox="0 0 50 24"><rect x="1" y="1" width="42" height="22" rx="7" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><rect x="4" y="4" width="36" height="16" rx="4.5" fill="#fff"/><rect x="45" y="8" width="3.5" height="8" rx="1.5" fill="rgba(255,255,255,.55)"/></svg>`;
const wrap = el('div', 'pw', phoneL);
{
  const L = 14, D = 4.2;
  for (let i = L; i >= 1; i--) {
    const s = el('div', `slab${i === L ? ' back' : ''}`, wrap);
    s.style.transform = `translateZ(${fx(-i * D, 1)}px)`;
    if (i === L) {
      const inner = el('div', 'inner', s);
      const c = el('div', 'cam', inner);
      for (const [lx, ly] of [[24, 24], [134, 24], [24, 134]]) el('div', 'lens', c, { left: px(lx), top: px(ly) });
      el('div', 'logo', inner, {}, markSvg(170, '#E9ECF2', '#E9ECF2', '#9AA6B4'));
    } else {
      const f = Math.sin((i / L) * Math.PI);
      const l1 = Math.round(110 + f * 110), l2 = Math.round(70 + f * 70);
      s.style.background = `linear-gradient(135deg, rgb(${l1},${l1 + 2},${l1 + 8}) 0%, rgb(${l2},${l2 + 2},${l2 + 7}) 50%, rgb(${l1},${l1 + 2},${l1 + 8}) 100%)`;
    }
  }
  for (const [side, top, h] of [['left', 250, 64], ['left', 360, 120], ['left', 510, 120], ['right', 400, 190]]) {
    el('div', 'btn', wrap, { [side]: '-7px', top: px(top), height: px(h), transform: `translateZ(${-(14 * 4.2) / 2}px)` });
  }
}
const front = el('div', 'front', wrap);
const bezel = el('div', 'bezel', front);
const screen = el('div', 'screen', bezel);
const view = el('div', 'view', screen);
el('div', 'wall', view);
const home = el('div', 'home', view);
const lock = el('div', 'lock', view);
el('div', 'status', screen, {}, `<span>9:41</span><span class="icons">${ICONS}</span>`);
const tapring = el('div', 'tapring', screen);
const island = el('div', 'island', bezel);
const glare = el('div', 'glare', front);

// lock screen
el('div', 'date', lock, {}, 'Monday, 6 May');
el('div', 'time', lock, {}, '9:41');
el('div', 'qa', lock, { left: '60px' }, '<svg width="40" height="40" viewBox="0 0 24 24"><path d="M9 2h6v5l-2 3v11h-2V10L9 7z" fill="#fff"/></svg>');
el('div', 'qa', lock, { right: '60px' }, '<svg width="42" height="42" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="3" fill="#fff"/><circle cx="12" cy="13.5" r="3.6" fill="#333"/><rect x="8" y="4" width="8" height="4" rx="1.5" fill="#fff"/></svg>');
el('div', 'bar', lock);

// home screen
const GLYPH = {
  camera: ['linear-gradient(160deg,#e9eaee,#9a9ca3)', '<rect x="3" y="7" width="18" height="13" rx="3" fill="#2b2d33"/><circle cx="12" cy="13.5" r="4" fill="#cfd2d8"/><circle cx="12" cy="13.5" r="2.2" fill="#2b2d33"/><rect x="8" y="4" width="8" height="4" rx="1.5" fill="#2b2d33"/>'],
  photos: ['#ffffff', ['#F5A623', '#F8E71C', '#7ED321', '#50E3C2', '#4A90E2', '#BD10E0', '#E5484D'].map((c, i) => { const a = (i / 7) * Math.PI * 2; return `<circle cx="${fx(12 + Math.cos(a) * 5.2)}" cy="${fx(12 + Math.sin(a) * 5.2)}" r="3.4" fill="${c}" opacity=".85"/>`; }).join('')],
  calendar: ['#ffffff', '<text x="12" y="8.2" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="4.2" fill="#E5484D">Monday</text><text x="12" y="19.5" text-anchor="middle" font-family="Poppins" font-weight="300" font-size="11" fill="#111">6</text>'],
  clock: ['#111111', '<circle cx="12" cy="12" r="9" fill="#fff"/><path d="M12 6.2V12l4 2.2" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M12 12l-3.6 3" stroke="#E5484D" stroke-width="1" stroke-linecap="round"/>'],
  maps: ['linear-gradient(135deg,#CDEBC4,#8FD0F0)', '<path d="M2 16L22 9" stroke="#fff" stroke-width="2.4"/><path d="M12 3.5c-3.3 0-5.6 2.4-5.6 5.6 0 4.2 5.6 10.4 5.6 10.4s5.6-6.2 5.6-10.4c0-3.2-2.3-5.6-5.6-5.6z" fill="#E5484D"/><circle cx="12" cy="9" r="2.2" fill="#fff"/>'],
  notes: ['linear-gradient(180deg,#FFD84D 0 30%,#ffffff 30%)', '<path d="M4 12h16M4 15.5h16M4 19h11" stroke="#c9c9c9" stroke-width="1"/>'],
  weather: ['linear-gradient(180deg,#3FA3F5,#1F6FD1)', '<circle cx="9" cy="9" r="4" fill="#FFD84D"/><path d="M8 18h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 18z" fill="#fff"/>'],
  music: ['linear-gradient(160deg,#FF6B7F,#F2365A)', '<path d="M9.5 17.5V6.5l9-2v11" stroke="#fff" stroke-width="2" fill="none"/><circle cx="7.5" cy="17.5" r="2.4" fill="#fff"/><circle cx="16.5" cy="15.5" r="2.4" fill="#fff"/>'],
  fitness: ['#111111', '<circle cx="12" cy="12" r="8" stroke="#F2365A" stroke-width="2.4" fill="none"/><circle cx="12" cy="12" r="5.2" stroke="#9BE15D" stroke-width="2.4" fill="none"/><circle cx="12" cy="12" r="2.4" stroke="#33D1F2" stroke-width="2.4" fill="none"/>'],
  books: ['linear-gradient(160deg,#FFA94D,#F76707)', '<path d="M5 5.5c2.5-.8 5-.6 7 1v12c-2-1.6-4.5-1.8-7-1z" fill="#fff"/><path d="M19 5.5c-2.5-.8-5-.6-7 1v12c2-1.6 4.5-1.8 7-1z" fill="#fff" opacity=".85"/>'],
  settings: ['linear-gradient(160deg,#b9bcc4,#7d8089)', '<circle cx="12" cy="12" r="6.6" fill="none" stroke="#3a3c42" stroke-width="3.4" stroke-dasharray="2.6 2.2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#3a3c42" stroke-width="1.6"/>'],
  phone: ['linear-gradient(160deg,#6BE37A,#2DBE4A)', '<path d="M7 3.8l3 3.4-1.7 2.2a10.6 10.6 0 0 0 6.3 6.3l2.2-1.7 3.4 3-1.5 2.7C11 19.8 4.2 13 4.3 5.3z" fill="#fff"/>'],
  messages: ['linear-gradient(160deg,#6BE37A,#2DBE4A)', '<path d="M12 4.5c-5 0-9 3.1-9 7 0 2.2 1.3 4.2 3.3 5.5l-.7 3 3.4-1.9c.9.2 1.9.3 3 .3 5 0 9-3.1 9-6.9s-4-7-9-7z" fill="#fff"/>'],
  browser: ['#ffffff', '<circle cx="12" cy="12" r="9" fill="#2F8CF6"/><path d="M15.6 8.4l-2.3 4.9-4.9 2.3 2.3-4.9z" fill="#fff"/><path d="M15.6 8.4l-2.3 4.9-2.6-2.6z" fill="#E5484D"/>'],
  mail: ['linear-gradient(160deg,#4FB7FF,#1E78F0)', '<rect x="3.5" y="6.5" width="17" height="11.5" rx="2" fill="#fff"/><path d="M4 7.5l8 5.6 8-5.6" stroke="#1E78F0" stroke-width="1.5" fill="none"/>'],
};
function appIcon(parent, name, label, x, y) {
  const a = el('div', 'app', parent, { left: px(x), top: px(y) });
  let ic;
  if (name === 'serenity') {
    ic = el('div', 'ic', a, { background: '#000' });
    el('img', '', ic, { width: '112px', height: '112px', display: 'block' }).src = ICON;
  } else {
    const [bg, g] = GLYPH[name];
    ic = el('div', 'ic', a, { background: bg }, `<svg viewBox="0 0 24 24" width="76" height="76">${g}</svg>`);
  }
  if (label) el('div', 'lb', a, {}, label);
  return { a, ic };
}
el('div', 'widget', home, { left: '34px', background: 'linear-gradient(160deg,#58BCF0,#1C6FB8)' },
  '<div style="font-size:24px;font-weight:500">Partly cloudy</div><div style="font-size:92px;font-weight:300;line-height:1;margin-top:8px">24°</div><div style="font-size:22px;opacity:.85;margin-top:34px">H 29°  ·  L 22°</div>');
el('div', 'widget', home, { left: '311px', background: 'rgba(255,255,255,0.94)', color: '#181A2E' },
  '<div style="font-size:26px;font-weight:600;color:#E5484D">Monday</div><div style="font-size:104px;font-weight:300;line-height:1">6</div><div style="font-size:21px;color:#6b6f80;margin-top:30px">No events today</div>');
const GRID = [
  ['camera', 'Camera'], ['photos', 'Photos'], ['calendar', 'Calendar'], ['clock', 'Clock'],
  ['maps', 'Maps'], ['serenity', 'Serenity'], ['notes', 'Notes'], ['weather', 'Weather'],
  ['music', 'Music'], ['fitness', 'Fitness'], ['books', 'Books'], ['settings', 'Settings'],
];
let serenityIcon;
GRID.forEach(([n, l], i) => {
  const r = appIcon(home, n, l, 34 + (i % 4) * 140, 404 + Math.floor(i / 4) * 172);
  if (n === 'serenity') serenityIcon = r;
});
const SER_X = 34 + 140 + 56, SER_Y = 404 + 172 + 56;
el('div', 'dots', home, {}, '<i></i><i></i><i></i>');
el('div', 'dock', home);
['phone', 'messages', 'browser', 'mail'].forEach((n, i) => appIcon(home, n, null, 49 + i * 136, 1300 - 26 - 150 + 19));
const serGlow = el('div', 'abs', home, { left: px(SER_X - 110), top: px(SER_Y - 110), width: '220px', height: '220px', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(61,189,245,0.85) 0%, rgba(61,189,245,0.35) 40%, rgba(61,189,245,0) 70%)', opacity: 0 });
home.insertBefore(serGlow, home.firstChild);

// Dynamic Island now-playing
const np = el('div', 'np', island);
np.innerHTML = `<div class="row"><div class="art" style="background-image:url(${ART('settlesoften')})"></div>
  <div><div class="t1">Settle and Soften</div><div class="t2">Ava Lindqvist</div></div>
  <div class="wave">${Array.from({ length: 6 }, () => '<i></i>').join('')}</div></div>
  <div class="prog"><span>04:12</span><div class="track"><b></b></div><span>-25:48</span></div>
  <div class="ctl">
    <svg width="44" height="44" viewBox="0 0 24 24"><path d="M6 6h2v12H6zM20 6v12l-10-6z" fill="#fff"/></svg>
    <svg width="54" height="54" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff"/><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff"/></svg>
    <svg width="44" height="44" viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM4 6v12l10-6z" fill="#fff"/></svg></div>`;
const waveBars = [...np.querySelectorAll('.wave i')];

const phoneT = track([
  [2.0, [980, -520, -900, 75, -230, 55, 0.4], 'outCubic'],
  [2.75, [1000, 560, -320, 26, -26, -12, 0.42], 'inOutCubic'],
  [3.2, [960, 830, 0, 40, -6, -4, 1.18], 'inOutSine'],
  [3.9, [960, 800, 0, 32, 4, -2, 1.26], 'inOutSine'],
  [4.4, [945, 790, 0, 28, 8, -1, 1.32], 'inCubic'],
  [4.68, [-300, 780, 0, 26, 32, 0, 1.32], 'lin'],
]);

// ---------------------------------------------------------------- whip
const whip = el('div', 'abs', cam, { left: '-340px', top: '-760px', width: '2600px', height: '2600px', backgroundImage: `url(${ASSET}openheart-big.jpg)`, backgroundSize: 'cover', filter: 'url(#hblur) saturate(1.3) brightness(1.1)', opacity: 0 });

// ---------------------------------------------------------------- floating UI space
const HEART = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2.1 0 3.7 1.2 5 2.9 1.3-1.7 2.9-2.9 5-2.9 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="#1D9FDA"/></svg>';
function makeSpace() {
  const sp = el('div', 'space', cam);
  const world = el('div', 'world', sp);
  return { sp, world, nodes: [] };
}
function node(space, html, cls, x, y, z, t0) {
  const d = el('div', `node ${cls || ''}`, space.world, {}, html);
  const n = { d, x, y, z, t0 };
  space.nodes.push(n);
  return n;
}
const chipsHtml = (on) => `<div style="display:flex;gap:16px">${['All', 'Focus', 'Sleep', 'Anxiety', 'Happiness'].map((c) => `<div class="chip${c === on ? ' on' : ''}">${c}</div>`).join('')}</div>`;
const rowHtml = (img, t1, t2) => `<div class="rowcard"><div class="th" style="background-image:url(${ART(img)})"></div><div><div class="t1">${t1}</div><div class="t2">${t2}</div></div><div class="heart">${HEART}</div></div>`;
const cardHtml = (img, t1, t2) => `<div class="gcard"><div class="hd"><div class="av" style="background-image:url(${ART(img)})"></div><div><div class="t1">${t1}</div><div class="t2">${t2}</div></div></div><div class="im" style="background-image:url(${ART(img)})"></div></div>`;

const listS = makeSpace();
node(listS, chipsHtml('All'), '', -640, -300, 0, 5.12);
node(listS, rowHtml('nightwinddown', 'Night Wind Down', 'Ava Lindqvist  ·  20 min'), '', -640, -176, 0, 5.3);
node(listS, rowHtml('oceandrift', 'Ocean Drift', 'Ava Lindqvist  ·  20 min'), '', -640, -14, 0, 5.42);
node(listS, rowHtml('rainonglass', 'Rain On Glass', 'Ambient  ·  60 min'), '', -40, -176, -240, 5.5);
node(listS, rowHtml('quietthenoise', 'Quiet The Noise', 'Ines Moreau  ·  12 min'), '', -40, -14, -240, 5.62);
node(listS, rowHtml('boxbreathe', 'Box Breathing', 'Noah Brandt  ·  8 min'), '', 560, -176, -560, 5.7);
node(listS, rowHtml('morningclarity', 'Morning Clarity', 'Noah Brandt  ·  15 min'), '', 560, -14, -560, 5.8);
const listCam = track([
  [5.0, [260, -140, -760, 20, 2], 'outExpo'],
  [6.3, [-60, -70, 420, 9, 3], 'inOutSine'],
  [7.15, [40, -70, 520, 5, 3], 'inCubic'],
  [7.55, [1150, -70, 560, -8, 3], 'lin'],
]);

const gridS = makeSpace();
node(gridS, chipsHtml('Focus'), '', -560, -520, 0, 7.55);
node(gridS, '<div class="heading">Start here</div>', '', -560, -420, 0, 7.6);
const GRIDCARDS = [
  ['settlesoften', 'Settle and Soften', 'Ava Lindqvist  ·  30 min'],
  ['freeyourmind', 'Free Your Mind', 'Ava Lindqvist  ·  10 min'],
  ['morningclarity', 'Morning Clarity', 'Noah Brandt  ·  15 min'],
  ['openheart', 'Open Heart', 'Ines Moreau  ·  18 min'],
  ['thelighthousekeeper', 'The Lighthouse Keeper', 'Sleep story  ·  2 min'],
  ['oceandrift', 'Ocean Drift', 'Ava Lindqvist  ·  20 min'],
];
GRIDCARDS.forEach(([img, t1, t2], i) => {
  const c = i % 3, r = Math.floor(i / 3);
  node(gridS, cardHtml(img, t1, t2), '', -560 + c * 390, -330 + r * 470, -c * 50, r === 0 ? 7.62 + c * 0.12 : 8.5 + c * 0.12);
});
const gridCam = track([
  [7.45, [-900, -80, 0, -14, 0], 'outExpo'],
  [8.25, [-10, -110, 300, -2, 0], 'inOutCubic'],
  [9.3, [10, 300, 360, 2, -6], 'lin'],
  [9.6, [20, 340, 380, 3, -7], 'lin'],
]);

function renderSpace(S, t, camT, on, focus, motion, fade) {
  S.sp.style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const [cx, cy, cz, ry, rx] = camT(t);
  S.world.style.transform = `translateZ(${fx(cz)}px) rotateX(${fx(rx)}deg) rotateY(${fx(ry)}deg) translate3d(${fx(-cx)}px,${fx(-cy)}px,0)`;
  S.sp.style.opacity = fx(fade, 3);
  for (const n of S.nodes) {
    const a = prog(t, n.t0, n.t0 + 0.75, E.outExpo);
    const z = n.z - (1 - a) * 500;
    const y = n.y + (1 - a) * 120;
    const dof = Math.min(16, Math.abs(n.z - focus) * 0.022);
    n.d.style.transform = `translate3d(${fx(n.x)}px,${fx(y)}px,${fx(z)}px)`;
    n.d.style.opacity = fx(clamp(a * 1.3), 3);
    n.d.style.filter = blur(dof + (1 - a) * 18 + motion);
  }
}

// ---------------------------------------------------------------- lockup (intro + end)
const lockL = el('div', 'layer', cam);
const MARK_W = 100, MARK_H = (MARK_W * 498) / 468, GAP = 30, FONT = 108;
const lockup = el('div', 'lockup', lockL);
const lockMark = el('div', '', lockup, { width: px(MARK_W), height: px(MARK_H), flex: 'none' }, markSvg(MARK_W));
const lockWordWrap = el('div', 'word', lockup, { fontSize: px(FONT), height: px(FONT * 1.15), display: 'flex', alignItems: 'center' });
const lockWord = el('span', '', lockWordWrap, { paddingLeft: px(GAP) }, 'serenity');
const caption = el('div', 'abs', lockL, { left: '0', right: '0', top: px(540 + 104), textAlign: 'center', fontSize: '26px', fontWeight: '500', color: 'rgba(255,255,255,0.62)', letterSpacing: '0.01em' }, 'Available on Android &amp; iPhone');
let WORD_W = 420;

// ---------------------------------------------------------------- tagline
const tagL = el('div', 'layer', cam);
function tline(words, y) {
  const d = el('div', 'tline', tagL, { top: px(y) });
  const ws = words.map(([w, hi], i) => {
    const s = el('span', `w${hi ? ' hi' : ''}`, d);
    s.textContent = w;
    if (i < words.length - 1) d.appendChild(document.createTextNode(' '));
    return s;
  });
  return { d, ws };
}
const T1 = tline([['Find'], ['your'], ['calm,', true], ['wherever'], ['you'], ['are.']], 494);
const T1T = [9.72, 10.12, 10.3, 10.62, 10.95, 11.1];
const T2 = tline([['With'], ['a'], ['single', true], ['breath.']], 494);
const T2T = [12.25, 12.42, 12.56, 12.82];

// ---------------------------------------------------------------- outro
const outro = el('div', 'layer', cam);
const outA = el('div', 'abs', outro, { left: '0', right: '0', top: '498px', textAlign: 'center', fontSize: '22px', fontWeight: '400', color: 'rgba(255,255,255,0.6)' }, 'made with care');
const outB = el('div', 'abs', outro, { left: '0', right: '0', top: '530px', textAlign: 'center', fontSize: '32px', fontWeight: '600', color: '#fff' }, 'by the Serenity team');

// ---------------------------------------------------------------- overlays
const flash = el('div', '', cam); flash.id = 'flash';
const grain = el('div', '', stage); grain.id = 'grain';
const vignette = el('div', '', stage); vignette.id = 'vignette';

// ================================================================ RENDER
const glowT = track([
  [0.0, [960, 540, 0.25, 0], 'outCubic'],
  [0.7, [960, 540, 0.95, 0.95], 'inOutSine'],
  [1.5, [960, 520, 1.02, 1.0], 'inOutSine'],
  [1.9, [960, 480, 1.3, 1.0], 'inOutSine'],
  [2.3, [980, 560, 0.7, 0.75], 'inOutSine'],
  [4.3, [940, 520, 0.95, 0.9], 'inOutSine'],
  [4.7, [960, 540, 0.6, 0.25], 'inOutSine'],
  [5.2, [760, 520, 1.05, 0.85], 'inOutSine'],
  [7.4, [980, 560, 1.0, 0.85], 'inOutSine'],
  [9.4, [900, 520, 1.05, 0.8], 'inOutSine'],
  [9.8, [960, 540, 0.9, 1.0], 'inOutSine'],
  [12.9, [1000, 540, 1.0, 1.0], 'inOutSine'],
  [13.45, [1180, 560, 1.05, 1.0], 'inExpo'],
  [14.0, [960, 540, 0.04, 1.0], 'outCubic'],
  [15.2, [960, 540, 0.85, 0.85], 'inOutSine'],
  [17.9, [960, 540, 0.92, 0.85], 'inCubic'],
  [18.5, [960, 540, 0.6, 0.0], 'lin'],
]);

function render(t) {
  const f = Math.round(t * 30);

  // ---- glows
  const [gx, gy, gs, go] = glowT(t);
  const breathe = 1 + Math.sin(t * 1.3) * 0.03;
  mainGlow.style.transform = `translate3d(${fx(gx - 1300)}px,${fx(gy - 800)}px,0) scale(${fx(gs * breathe, 4)})`;
  mainGlow.style.opacity = fx(go, 3);
  const ax = gx + 380 * Math.cos(t * 0.6), ay = gy + 160 * Math.sin(t * 0.8);
  accentGlow.style.transform = `translate3d(${fx(ax - 750)}px,${fx(ay - 550)}px,0) scale(${fx(0.5 + gs * 0.5, 3)})`;
  accentGlow.style.opacity = fx(go * 0.55 * (1 - win(t, 13.4, 14.4, 0.2, 0.3)), 3);
  const coreV = prog(t, 13.55, 14.0, E.inCubic) * (1 - prog(t, 14.02, 14.45, E.outCubic));
  core.style.opacity = fx(coreV, 3);
  core.style.transform = `scale(${fx(0.3 + coreV * 0.9, 3)})`;
  halo.style.opacity = fx(0.85 * prog(t, 14.0, 14.4) * (1 - prog(t, 15.0, 16.0)) + 0.35 * prog(t, 15.0, 16.0) * (1 - prog(t, 17.9, 18.4)), 3);
  warmGlow.style.opacity = fx(prog(t, 18.6, 19.4, E.inOutSine) * (1 - prog(t, 20.6, 21.0)) * (0.9 + 0.1 * Math.sin(t * 2)), 3);

  // ---- phone
  const pOn = t >= 2.0 && t < 4.7;
  phoneL.style.visibility = pOn ? 'visible' : 'hidden';
  if (pOn) {
    const [x, y, z, rx, ry, rz, sc] = phoneT(t);
    wrap.style.transform = `translate3d(${fx(x - PW / 2)}px,${fx(y - PH / 2)}px,${fx(z)}px) rotateZ(${fx(rz, 3)}deg) rotateY(${fx(ry, 3)}deg) rotateX(${fx(rx, 3)}deg) scale(${fx(sc, 4)})`;
    const ryn = ((((ry + 180) % 360) + 360) % 360) - 180;
    glare.style.backgroundPosition = `${fx(50 - ryn * 2.2 + rz * 1.5, 1)}% 0`;
    phoneL.style.filter = t > 4.42 ? blur(prog(t, 4.42, 4.65, E.inCubic) * 14) : 'none';
    const lk = prog(t, 3.25, 3.6, E.inOutCubic);
    lock.style.transform = `translate3d(0,${fx(-lk * 1300)}px,0)`;
    lock.style.opacity = fx(1 - lk * 0.6, 3);
    home.style.transform = `scale(${fx(1.12 - 0.12 * prog(t, 3.3, 3.75, E.outCubic), 4)})`;
    home.style.opacity = fx(prog(t, 3.28, 3.6), 3);
    serGlow.style.opacity = fx(win(t, 3.65, 4.45, 0.25, 0.3) * (0.7 + 0.3 * Math.sin(t * 9)), 3);
    const press = Math.sin(clamp((t - 3.9) / 0.22) * Math.PI);
    serenityIcon.ic.style.transform = `scale(${fx(1 - press * 0.12 + 0.06 * win(t, 3.65, 3.92, 0.2, 0.05), 4)})`;
    const tq = clamp((t - 3.95) / 0.5);
    tapring.style.left = px(SER_X);
    tapring.style.top = px(SER_Y);
    tapring.style.opacity = t >= 3.95 && tq < 1 ? fx((1 - tq) * 0.95, 3) : '0';
    tapring.style.transform = `scale(${fx(0.4 + E.outCubic(tq) * 1.3, 3)})`;
    // island expands into now-playing
    const iv = E.spring(clamp((t - 4.02) / 0.5));
    const iw = lerp(176, 566, iv), ih = lerp(50, 252, iv);
    island.style.width = px(iw);
    island.style.marginLeft = px(-iw / 2);
    island.style.height = px(ih);
    island.style.top = px(lerp(26, 20, iv));
    island.style.borderRadius = px(lerp(26, 62, clamp(iv)));
    np.style.opacity = fx(prog(t, 4.2, 4.4), 3);
    waveBars.forEach((b, i) => { b.style.height = px(14 + 30 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.3)) * (0.6 + 0.4 * Math.sin(t * 4.1 + i))); });
  }

  // ---- whip through artwork
  const wv = win(t, 4.4, 5.02, 0.08, 0.18);
  whip.style.opacity = fx(wv, 3);
  if (wv > 0) whip.style.transform = `translate3d(${fx(lerp(700, -700, prog(t, 4.38, 5.02, E.inOutCubic)))}px,0,0) scale(1.25)`;

  // ---- floating UI
  const listMotion = prog(t, 7.1, 7.5, E.inCubic) * 22;
  renderSpace(listS, t, listCam, t >= 5.0 && t < 7.6, 0, listMotion, 1 - prog(t, 7.38, 7.58));
  const gridMotion = (1 - prog(t, 7.45, 7.9, E.outCubic)) * 18 + prog(t, 9.15, 9.55, E.inCubic) * 26;
  renderSpace(gridS, t, gridCam, t >= 7.42 && t < 9.65, 0, gridMotion, prog(t, 7.42, 7.6) * (1 - prog(t, 9.3, 9.62)));

  // ---- lockup
  let lv = 0, reveal = 0, ly = 0, ls = 1, lb = 0, markS = 1;
  if (t < 2.2) {
    markS = 0.3 + 0.7 * E.spring(clamp((t - 0.45) / 0.55));
    lv = clamp((t - 0.45) / 0.15);
    reveal = prog(t, 1.0, 1.5, E.outExpo);
    const ex = prog(t, 1.5, 2.05, E.inCubic);
    ly = -ex * 300; ls = 1 + ex * 0.6; lb = (1 - clamp((t - 0.45) / 0.35)) * 16 + ex * 30; lv *= 1 - ex;
  } else if (t >= 13.95) {
    markS = 0.2 + 0.8 * E.spring(clamp((t - 14.0) / 0.6));
    lv = clamp((t - 14.0) / 0.12);
    reveal = prog(t, 15.05, 15.6, E.outExpo);
    const ex = prog(t, 17.9, 18.5, E.inCubic);
    ls = 1 + prog(t, 15.0, 18.0, E.lin) * 0.04 - ex * 0.06; lb = (1 - clamp((t - 14.0) / 0.3)) * 14 + ex * 24; lv *= 1 - ex;
  }
  lockL.style.visibility = lv > 0.001 ? 'visible' : 'hidden';
  if (lv > 0.001) {
    const ww = WORD_W * reveal;
    lockWordWrap.style.width = px(ww);
    lockWord.style.transform = `translate3d(${fx((1 - reveal) * -60)}px,0,0)`;
    lockWord.style.opacity = fx(reveal, 3);
    const total = MARK_W + ww;
    lockup.style.transform = `translate3d(${fx(960 - total / 2)}px,${fx(540 - (FONT * 1.15) / 2 + ly)}px,0) scale(${fx(ls, 4)})`;
    lockup.style.transformOrigin = `${fx(total / 2)}px ${fx((FONT * 1.15) / 2)}px`;
    lockup.style.opacity = fx(lv, 3);
    lockup.style.filter = blur(lb);
    lockMark.style.transform = `scale(${fx(markS, 4)})`;
    const cv = t > 15 ? prog(t, 15.65, 16.15) * (1 - prog(t, 17.85, 18.3)) : 0;
    caption.style.opacity = fx(cv, 3);
    caption.style.transform = `translate3d(0,${fx((1 - cv) * 16)}px,0)`;
  }

  // ---- tagline
  const tOn = t >= 9.6 && t < 13.7;
  tagL.style.visibility = tOn ? 'visible' : 'hidden';
  if (tOn) {
    const o1 = prog(t, 11.95, 12.22, E.inCubic);
    T1.ws.forEach((w, i) => {
      const a = prog(t, T1T[i], T1T[i] + 0.45, E.outExpo);
      w.style.opacity = fx(a * (1 - o1), 3);
      w.style.filter = blur((1 - a) * 14 + o1 * 14);
      w.style.transform = `translate3d(0,${fx((1 - a) * 26 - o1 * 30)}px,0)`;
      if (i === 0) w.style.letterSpacing = `${fx((1 - prog(t, T1T[0], T1T[0] + 0.7, E.outCubic)) * 0.55, 3)}em`;
    });
    const o2 = prog(t, 13.0, 13.5, E.inCubic);
    T2.d.style.transform = `translate3d(${fx(-o2 * 420)}px,0,0)`;
    T2.ws.forEach((w, i) => {
      const a = prog(t, T2T[i], T2T[i] + 0.45, E.outExpo);
      w.style.opacity = fx(a * (1 - o2), 3);
      w.style.filter = blur((1 - a) * 14 + o2 * 22);
      w.style.transform = `translate3d(0,${fx((1 - a) * 26)}px,0)`;
    });
  }

  // ---- outro
  const oa = prog(t, 18.95, 19.5, E.outCubic) * (1 - prog(t, 20.7, 21.0));
  const ob = prog(t, 19.1, 19.7, E.outCubic) * (1 - prog(t, 20.7, 21.0));
  outro.style.visibility = t > 18.8 ? 'visible' : 'hidden';
  outA.style.opacity = fx(oa, 3); outA.style.filter = blur((1 - oa) * 8);
  outB.style.opacity = fx(ob, 3); outB.style.filter = blur((1 - ob) * 10);
  outB.style.letterSpacing = `${fx((1 - ob) * 0.12, 3)}em`;

  // ---- flash, camera shake, grain
  const fl = Math.max(0, 1 - Math.abs(t - 14.0) / 0.12) * 0.55 + Math.max(0, 1 - Math.abs(t - 5.0) / 0.1) * 0.18;
  flash.style.opacity = fx(fl, 3);
  let sx = 0, sy = 0;
  for (const [t0, amp] of [[5.0, 8], [14.0, 10]]) {
    const q = (t - t0) / 0.35;
    if (q >= 0 && q < 1) { const a = amp * (1 - q) ** 2; sx += (hash(f * 3 + 1) - 0.5) * 2 * a; sy += (hash(f * 7 + 2) - 0.5) * 2 * a; }
  }
  cam.style.transform = `translate3d(${fx(sx, 1)}px,${fx(sy, 1)}px,0)`;
  grain.style.backgroundImage = `url(${ASSET}grain-${f % 6}.png)`;
}

// ================================================================ READY
async function ready() {
  await Promise.all([300, 400, 500, 600, 700].map((w) => document.fonts.load(`${w} 100px Poppins`)));
  await document.fonts.ready;
  const urls = [ICON, `${ASSET}openheart-big.jpg`, ...['openheart', 'oceandrift', 'settlesoften', 'morningclarity', 'freeyourmind', 'nightwinddown', 'quietthenoise', 'rainonglass', 'boxbreathe', 'thelighthousekeeper'].map(ART), ...[0, 1, 2, 3, 4, 5].map((i) => `${ASSET}grain-${i}.png`)];
  window.__keep = [];
  await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => im.decode().then(res, res); im.onerror = res; im.src = u; window.__keep.push(im); })));
  await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => { im.onload = r; im.onerror = r; }))));
  lockWordWrap.style.width = 'auto';
  WORD_W = lockWord.getBoundingClientRect().width + 2;
  render(0);
  return true;
}
window.render = render;
window.whenReady = ready();
