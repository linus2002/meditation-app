/**
 * The launch animation's moving parts, kept apart from React so they can be
 * tested: when to show it, where each particle goes, and the sound.
 *
 * A single dot appears, splits into many, and the particles fly into the
 * Serenity logo, taking its colours as they land. When the logo is whole the
 * real artwork fades in over them and a soft "bloom" sound plays.
 */

/** Set before the first paint (see LAUNCH_SPLASH_SCRIPT) when the animation should play. */
export const SPLASH_ATTRIBUTE = 'data-splash';
/** Once per app launch: a tab or app session. */
export const SPLASH_SESSION_KEY = 'serenity.splash.session.v1';
/** Set after the very first launch; the sound plays only then. */
export const SPLASH_FIRST_KEY = 'serenity.splash.first.v1';

/**
 * Runs in <head>, before anything is drawn, so the home screen never flashes
 * up first. It shows the animation once per launch in the installed app (the
 * Android or iPhone app, or a home-screen web app), and on the website only
 * the first time someone visits.
 */
export const LAUNCH_SPLASH_SCRIPT = `(function(){try{
var s=window.sessionStorage,l=window.localStorage;
if(s.getItem('${SPLASH_SESSION_KEY}'))return;
var installed=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())
||window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
var first=!l.getItem('${SPLASH_FIRST_KEY}');
if(!installed&&!first)return;
document.documentElement.setAttribute('${SPLASH_ATTRIBUTE}',first?'first':'again');
}catch(e){}})();`;

/** Milestones of the animation, in seconds. */
export const TIMELINE = {
  /** The dot appears and breathes. */
  dot: 0.45,
  /** It splits: particles burst outward from the centre. */
  burst: 0.95,
  /** They fly into the logo. */
  form: 2.05,
  /** The logo is whole; the artwork fades in and the sound plays. */
  hold: 2.6,
  /** The screen fades away. */
  end: 3.05,
} as const;

/** A shorter run on later launches, so opening the app stays quick. */
export const QUICK_TIMELINE = {
  dot: 0.2,
  burst: 0.5,
  form: 1.3,
  hold: 1.65,
  end: 2.0,
} as const;

export type Timeline = { dot: number; burst: number; form: number; hold: number; end: number };

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface Particle {
  /** Where it lands, as a fraction of the logo box, centred on 0. */
  tx: number;
  ty: number;
  /** Its colour once landed. */
  r: number;
  g: number;
  b: number;
  /** Where the burst throws it, as an angle and a distance (fraction of the logo size). */
  angle: number;
  spread: number;
  /** 0-1: when it sets off, so they don't all move as one. */
  delay: number;
  /** Size, relative. */
  size: number;
}

/**
 * Particles from the logo's pixels: every opaque pixel on a grid becomes a
 * landing spot, and `count` of them are chosen evenly. `random` is passed in
 * so tests get the same result each time.
 */
export function particlesFromImage(
  pixels: { data: ArrayLike<number>; width: number; height: number },
  count: number,
  random: () => number = Math.random,
): Particle[] {
  const { data, width, height } = pixels;
  const spots: { x: number; y: number; r: number; g: number; b: number }[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / (count * 2.2))));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 160) spots.push({ x, y, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  if (spots.length === 0) return [];

  const size = Math.max(width, height);
  const chosen = Array.from({ length: Math.min(count, spots.length) }, (_, i) => spots[Math.floor((i * spots.length) / Math.min(count, spots.length))]);
  return chosen.map((spot) => ({
    tx: (spot.x - width / 2) / size,
    ty: (spot.y - height / 2) / size,
    r: spot.r,
    g: spot.g,
    b: spot.b,
    angle: random() * Math.PI * 2,
    spread: 0.12 + random() * 0.55,
    delay: random(),
    size: 0.75 + random() * 0.6,
  }));
}

/**
 * Where a particle is, and how far it has turned into the logo's colour, at
 * `t` seconds. Positions are fractions of the logo size around the centre.
 */
export function particleAt(p: Particle, t: number, line: Timeline): { x: number; y: number; landed: number; alpha: number } {
  if (t < line.dot) return { x: 0, y: 0, landed: 0, alpha: 0 };

  // Burst: out from the centre, each on its own heading, with a slight spiral.
  const burst = easeOutCubic(clamp01((t - line.dot) / (line.burst - line.dot)));
  const spin = burst * 0.9;
  const bx = Math.cos(p.angle + spin) * p.spread * burst;
  const by = Math.sin(p.angle + spin) * p.spread * burst;
  if (t < line.burst) return { x: bx, y: by, landed: 0, alpha: burst };

  // Form: from the burst into the logo, staggered, swirling a little on the way.
  const span = line.form - line.burst;
  const local = clamp01((t - line.burst - p.delay * span * 0.35) / (span * 0.65));
  const k = easeInOutCubic(local);
  const swirl = Math.sin(k * Math.PI) * (p.delay - 0.5) * 0.18;
  return {
    x: bx + (p.tx - bx) * k + swirl,
    y: by + (p.ty - by) * k - swirl * 0.6,
    landed: k,
    alpha: 1,
  };
}

/**
 * The "bloom": a soft low drop, a bright two-note chime above it and a breath
 * of noise, fading over about two seconds. Made on the phone, so there is no
 * sound file to download. Quiet on purpose.
 */
export function playBloom(context: AudioContext, volume = 0.35): void {
  const now = context.currentTime + 0.02;
  const out = context.createGain();
  out.gain.value = volume;

  // A little echo, so it rings out rather than stopping dead.
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.18;
  const feedback = context.createGain();
  feedback.gain.value = 0.32;
  const wet = context.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(context.destination);
  out.connect(context.destination);
  out.connect(delay);

  const tone = (frequency: number, start: number, length: number, level: number, type: OscillatorType, glideTo?: number) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now + start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, now + start + length * 0.6);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(level, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
    osc.connect(gain).connect(out);
    osc.start(now + start);
    osc.stop(now + start + length + 0.05);
  };

  // The drop: a round low note that falls a little, like a pebble into water.
  tone(392, 0, 0.55, 0.5, 'sine', 196);
  // The chime: two bright notes a fifth apart, the second just behind.
  tone(1046.5, 0.05, 1.8, 0.16, 'sine');
  tone(1568, 0.13, 1.6, 0.1, 'sine');
  tone(2093, 0.13, 0.9, 0.035, 'triangle');

  // A soft shimmer of filtered noise.
  const length = Math.floor(context.sampleRate * 0.9);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5200;
  filter.Q.value = 0.8;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.08;
  noise.connect(filter).connect(noiseGain).connect(out);
  noise.start(now + 0.02);
}
