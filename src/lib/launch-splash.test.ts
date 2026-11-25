import { describe, expect, it } from 'vitest';

import {
  LAUNCH_SPLASH_SCRIPT,
  particleAt,
  particlesFromImage,
  QUICK_TIMELINE,
  SPLASH_ATTRIBUTE,
  SPLASH_FIRST_KEY,
  SPLASH_SESSION_KEY,
  TIMELINE,
} from '@/lib/launch-splash';

/** A 10×10 picture: the left half opaque blue, the right half clear. */
function halfBlue() {
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x < 5) data.set([20, 140, 220, 255], i);
    }
  }
  return { data, width, height };
}

let seed = 1;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('placing the particles', () => {
  it('lands them only on the logo, in its colours', () => {
    const particles = particlesFromImage(halfBlue(), 20, random);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles.length).toBeLessThanOrEqual(20);
    // The opaque half is left of centre.
    expect(particles.every((p) => p.tx < 0)).toBe(true);
    expect(particles.every((p) => p.r === 20 && p.g === 140 && p.b === 220)).toBe(true);
  });

  it('gives nothing for a picture with nothing in it', () => {
    expect(particlesFromImage({ data: new Uint8ClampedArray(400), width: 10, height: 10 }, 20)).toEqual([]);
  });
});

describe('the animation’s path', () => {
  const [p] = particlesFromImage(halfBlue(), 1, random);

  it('starts as one dot in the middle', () => {
    expect(particleAt(p, 0.1, TIMELINE)).toMatchObject({ x: 0, y: 0, alpha: 0 });
  });

  it('bursts outward, then lands exactly on the logo', () => {
    const burst = particleAt(p, TIMELINE.burst - 0.01, TIMELINE);
    expect(Math.hypot(burst.x, burst.y)).toBeGreaterThan(0.05);
    const landed = particleAt(p, TIMELINE.form + 0.01, TIMELINE);
    expect(landed.x).toBeCloseTo(p.tx, 5);
    expect(landed.y).toBeCloseTo(p.ty, 5);
    expect(landed.landed).toBe(1);
  });

  it('is quicker on later launches', () => {
    expect(QUICK_TIMELINE.end).toBeLessThan(TIMELINE.end);
    expect(TIMELINE.end).toBeLessThanOrEqual(3.2);
  });
});

describe('when it plays', () => {
  function run(opts: { session?: boolean; first?: boolean; installed?: boolean }) {
    const session = new Map<string, string>();
    const local = new Map<string, string>();
    if (opts.session) session.set(SPLASH_SESSION_KEY, '1');
    if (!opts.first) local.set(SPLASH_FIRST_KEY, '1');
    const attributes = new Map<string, string>();
    const store = (map: Map<string, string>) => ({ getItem: (k: string) => map.get(k) ?? null });
    const window = {
      sessionStorage: store(session),
      localStorage: store(local),
      Capacitor: opts.installed ? { isNativePlatform: () => true } : undefined,
      matchMedia: () => ({ matches: false }),
      navigator: {},
    };
    const document = { documentElement: { setAttribute: (k: string, v: string) => attributes.set(k, v) } };
    new Function('window', 'document', LAUNCH_SPLASH_SCRIPT)(window, document);
    return attributes.get(SPLASH_ATTRIBUTE) ?? null;
  }

  it('plays with sound the very first time, anywhere', () => {
    expect(run({ first: true })).toBe('first');
    expect(run({ first: true, installed: true })).toBe('first');
  });

  it('plays quietly on each later launch of the installed app', () => {
    expect(run({ installed: true })).toBe('again');
  });

  it('doesn’t replay on the website, or twice in one launch', () => {
    expect(run({})).toBeNull();
    expect(run({ installed: true, session: true })).toBeNull();
  });
});
