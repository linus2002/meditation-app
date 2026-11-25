'use client';

/* eslint-disable @next/next/no-img-element -- the logo is drawn to a canvas, and shown at once without the image pipeline. */

import * as React from 'react';

import logo from '@/assets/images/logoapp-512.png';
import {
  particleAt,
  particlesFromImage,
  playBloom,
  QUICK_TIMELINE,
  SPLASH_ATTRIBUTE,
  SPLASH_FIRST_KEY,
  SPLASH_SESSION_KEY,
  TIMELINE,
  clamp01,
  easeOutCubic,
  type Particle,
  type Timeline,
} from '@/lib/launch-splash';

/** Particles in the logo. Fewer on small, slower phones would still read as the logo. */
const PARTICLES = 900;
/** How big the logo is drawn: a share of the shorter side of the screen. */
const LOGO_SHARE = 0.36;

function remember(key: string, store: 'local' | 'session') {
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, '1');
  } catch {
    // Without storage it simply plays again next time.
  }
}

/** Loads the logo and reads its pixels, small: enough to place the particles. */
function logoPixels(): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return resolve(null);
      context.drawImage(image, 0, 0, size, size);
      try {
        resolve(context.getImageData(0, 0, size, size));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = logo.src;
  });
}

/**
 * The launch animation, over everything, once per launch of the app (see
 * lib/launch-splash for when). A dot splits into particles that fly into the
 * logo; the logo settles, a soft sound plays the first time, and it fades away.
 * A tap skips it. With reduced motion asked for, the logo simply fades in.
 */
export function LaunchSplash() {
  const [mode, setMode] = React.useState<'first' | 'again' | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const logoRef = React.useRef<HTMLImageElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const skipRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    const value = document.documentElement.getAttribute(SPLASH_ATTRIBUTE);
    if (value === 'first' || value === 'again') setMode(value);
  }, []);

  React.useEffect(() => {
    if (!mode) return undefined;
    remember(SPLASH_SESSION_KEY, 'session');
    const first = mode === 'first';
    if (first) remember(SPLASH_FIRST_KEY, 'local');

    const line: Timeline = first ? TIMELINE : QUICK_TIMELINE;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    let frame = 0;
    let particles: Particle[] = [];
    let started = 0;
    let sounded = !first;
    let finished = false;
    let audio: AudioContext | null = null;

    // Made now, while the page is loading: Android lets it play without a tap.
    // Elsewhere it stays silent until the person touches the screen.
    if (first) {
      try {
        const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        audio = Context ? new Context() : null;
      } catch {
        audio = null;
      }
    }

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      document.documentElement.removeAttribute(SPLASH_ATTRIBUTE);
      setMode(null);
      // Let the bloom ring out, then free the sound.
      window.setTimeout(() => void audio?.close().catch(() => {}), 2500);
    };

    const bloom = () => {
      if (sounded || !audio) return;
      sounded = true;
      const play = () => playBloom(audio as AudioContext);
      if (audio.state === 'running') play();
      else void audio.resume().then(() => audio?.state === 'running' && play()).catch(() => {});
    };

    const size = () => {
      if (!canvas) return { w: 0, h: 0, dpr: 1 };
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      return { w, h, dpr };
    };

    const draw = (now: number) => {
      if (!started) started = now;
      const t = (now - started) / 1000;
      const { w, h, dpr } = size();
      // Matches the <img> below: 36vmin, at most 260px.
      const logoSize = Math.min(Math.min(w, h) * LOGO_SHARE, 260);
      const cx = w / 2;
      const cy = h / 2;

      // The real logo arrives as the particles settle, then everything fades.
      const reveal = easeOutCubic(clamp01((t - line.form + 0.15) / (line.hold - line.form + 0.15)));
      const fade = clamp01((t - line.hold) / (line.end - line.hold));
      if (logoRef.current) {
        logoRef.current.style.opacity = String(still ? clamp01(t / 0.6) * (1 - fade) : reveal * (1 - fade));
        logoRef.current.style.transform = `translate(-50%, -50%) scale(${1 + 0.04 * fade})`;
      }
      if (rootRef.current) rootRef.current.style.opacity = String(1 - easeOutCubic(fade));
      if (t >= line.form - 0.05) bloom();

      if (context && canvas && !still) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, w, h);

        // The single dot, breathing, before it splits.
        if (t < line.burst) {
          const grow = easeOutCubic(clamp01(t / line.dot));
          const pulse = 1 + 0.18 * Math.sin(t * 14);
          const split = clamp01((t - line.dot) / (line.burst - line.dot));
          const radius = Math.max(0.5, logoSize * 0.035 * grow * pulse * (1 - split));
          const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 5);
          glow.addColorStop(0, `rgba(120, 200, 255, ${0.55 * (1 - split)})`);
          glow.addColorStop(1, 'rgba(120, 200, 255, 0)');
          context.fillStyle = glow;
          context.beginPath();
          context.arc(cx, cy, radius * 5, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = `rgba(255, 255, 255, ${grow})`;
          context.beginPath();
          context.arc(cx, cy, radius, 0, Math.PI * 2);
          context.fill();
        }

        // The particles: white while flying, the logo's colours as they land,
        // and gone once the artwork has taken over.
        const fadeOut = 1 - reveal;
        if (fadeOut > 0.01) {
          const dot = Math.max(1.1, logoSize / 95);
          for (const p of particles) {
            const at = particleAt(p, t, line);
            if (at.alpha <= 0) continue;
            const r = Math.round(235 + (p.r - 235) * at.landed);
            const g = Math.round(245 + (p.g - 245) * at.landed);
            const b = Math.round(255 + (p.b - 255) * at.landed);
            context.fillStyle = `rgba(${r}, ${g}, ${b}, ${at.alpha * fadeOut})`;
            const s = dot * p.size * (1.25 - 0.25 * at.landed);
            context.fillRect(cx + at.x * logoSize - s / 2, cy + at.y * logoSize - s / 2, s, s);
          }
        }
      }

      if (t >= line.end) finish();
      else frame = requestAnimationFrame(draw);
    };

    skipRef.current = () => {
      // A tap counts as permission to play sound, where the phone wanted one.
      bloom();
      finish();
    };

    let cancelled = false;
    void logoPixels().then((pixels) => {
      if (cancelled) return;
      if (pixels) particles = particlesFromImage(pixels, PARTICLES);
      frame = requestAnimationFrame(draw);
    });
    // Never stand between someone and the app: if anything stalls, go.
    const safety = window.setTimeout(finish, (line.end + 2.5) * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  return (
    <div
      ref={rootRef}
      className="launch-splash"
      aria-hidden="true"
      onClick={() => skipRef.current()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <img
        ref={logoRef}
        src={logo.src}
        alt=""
        className="absolute left-1/2 top-1/2 h-[36vmin] w-[36vmin] max-h-[260px] max-w-[260px] opacity-0"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}
