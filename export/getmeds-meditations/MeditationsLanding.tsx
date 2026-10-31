'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * Getmeds Meditation — the app's landing page, in one file.
 *
 * Drop this into any Next.js (App Router) project that uses Tailwind CSS:
 *
 *   app/meditations/page.tsx
 *     import MeditationsLanding from '@/components/MeditationsLanding';
 *     export default function Page() { return <MeditationsLanding />; }
 *
 * Needs:  npm i lucide-react
 * Images: copy the `meditations-app` folder into `public/`, so files are
 *         served from /meditations-app/... (change ASSET_BASE to move them).
 * Font:   Poppins (300–700) loaded by the host page.
 *
 * Everything else is self-contained: no tailwind.config changes, no
 * next.config changes, and no data fetching.
 */

import * as React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Asterisk,
  AudioLines,
  AudioWaveform,
  BookOpen,
  CloudRain,
  Headphones,
  Lock,
  Menu,
  MessageCircleHeart,
  Moon,
  MoonStar,
  Pause,
  PenLine,
  PersonStanding,
  Play,
  Route,
  Sparkles,
  Timer,
  Users,
  Waves,
  WifiOff,
  Wind,
  X,
} from 'lucide-react';

/* ================================================================== */
/* Settings                                                           */
/* ================================================================== */

/** Where the images in /public/meditations-app are served from. */
const ASSET_BASE = '/meditations-app';

/** Store links: swap in the real listings once they are live. */
const APP_STORE_URL = '#download';
const PLAY_STORE_URL = '#download';

/** The hand-and-phone photo; its screen is cut out (transparent). */
const MOCKUP = { src: `${ASSET_BASE}/mockup.webp`, width: 1100, height: 1430 };
const KAPWA_ICON = `${ASSET_BASE}/kapwa.png`;

/** Counts shown in "Calm you can see". Update as the library grows. */
const COUNTS: LandingCounts = { meditations: 74, programs: 10, stories: 16, yoga: 20 };

/** The four programmes on the path, artwork from the app's Sanity CDN. */
const PROGRAMS: LandingProgram[] = [
  { id: 'six-phase', title: 'The Six Phase', level: 'Beginner', sessions: 6, image: 'https://cdn.sanity.io/images/jn0rojao/production/cc2e4d462839f303bc99540284d9663ac27c93f0-900x900.jpg?w=320&fit=max&auto=format&q=80' },
  { id: 'sleep-mastery', title: 'Sleep Mastery', level: 'All levels', sessions: 7, image: 'https://cdn.sanity.io/images/jn0rojao/production/d5fcdf8d792077fcb24a5c6ccb453083adbae675-900x900.jpg?w=320&fit=max&auto=format&q=80' },
  { id: 'steady-mind', title: 'A Steady Mind', level: 'Beginner', sessions: 5, image: 'https://cdn.sanity.io/images/jn0rojao/production/d1362aa06a276dae727ba470bb09e246f27ebc7b-900x900.jpg?w=320&fit=max&auto=format&q=80' },
  { id: 'open-water', title: 'Open Water', level: 'All levels', sessions: 4, image: 'https://cdn.sanity.io/images/jn0rojao/production/d9a7512349106ed898c48fc093a08a67848357f1-900x900.jpg?w=320&fit=max&auto=format&q=80' },
];

/** The two animations the page defines itself, so no Tailwind config is needed. */
const LANDING_CSS = `
@keyframes lm-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lm-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-12px,0); } }
.lm-rise { animation: lm-rise 0.5s cubic-bezier(0.22,1,0.36,1) both; }
.lm-float { animation: lm-float 6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .lm-rise, .lm-float { animation: none; } }
`;

/** Joins class names, skipping the falsy ones. */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/* ================================================================== */
/* motion.ts                                                          */
/* ================================================================== */
/** True when the reader has asked the system for less motion. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * Calls `onProgress` with how far the page has scrolled through `ref`, from 0
 * when its top meets the top of the viewport to 1 when its bottom meets the
 * bottom. That is the span a `sticky` child stays pinned for.
 *
 * Written straight to the DOM from one rAF per scroll, so a long pinned section
 * never re-renders React at frame rate.
 */
function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
) {
  const callback = React.useRef(onProgress);
  callback.current = onProgress;

  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      callback.current(span > 0 ? clamp(-rect.top / span) : rect.top < 0 ? 1 : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref]);
}

/** Adds `data-shown` once an element scrolls into view, for CSS reveals. */
function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.shown = '';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    el.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => observer.observe(node));
    if (el.hasAttribute('data-reveal')) observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/** Hidden until `useReveal` marks it shown, then rises into place. */
const REVEAL =
  'translate-y-8 opacity-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-[shown]:translate-y-0 data-[shown]:opacity-100';

/* ================================================================== */
/* constellation.tsx                                                  */
/* ================================================================== */
interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

/**
 * A slow drifting field of points, joined by hairlines when two pass close —
 * the constellation backdrop behind the hero and the blue sections.
 *
 * `rgb` is the colour as bare channels ("30 160 218"), so dots and lines share
 * one hue at different alphas. Drawing stops while the canvas is off screen,
 * and with reduced motion the field is painted once and left still.
 */
function Constellation({
  rgb = '30 160 218',
  density = 1,
  className,
}: {
  rgb?: string;
  density?: number;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const [r, g, b] = rgb.split(' ');
    const color = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };

    const seed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(((width * height) / 14000) * density);
      stars = Array.from({ length: Math.min(count, 160) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.4 + 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const link = Math.min(150, width / 7);
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const c = stars[j];
          const d = Math.hypot(a.x - c.x, a.y - c.y);
          if (d < link) {
            ctx.strokeStyle = color((1 - d / link) * 0.22);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
          }
        }
        // Points near the pointer reach out to it.
        const p = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (p < link * 1.3) {
          ctx.strokeStyle = color((1 - p / (link * 1.3)) * 0.35);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      for (const s of stars) {
        const twinkle = 0.55 + Math.sin(time / 900 + s.phase) * 0.35;
        ctx.fillStyle = color(twinkle);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.7) {
          ctx.fillStyle = color(twinkle * 0.15);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (time: number) => {
      frame = 0;
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;
      }
      draw(time);
      if (visible) frame = requestAnimationFrame(tick);
    };

    seed();
    if (reduced) draw(0);
    else frame = requestAnimationFrame(tick);

    const onResize = () => {
      seed();
      if (reduced) draw(0);
    };
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced && !frame) frame = requestAnimationFrame(tick);
    });
    observer.observe(canvas);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [rgb, density, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}

/* ================================================================== */
/* phone.tsx                                                          */
/* ================================================================== */
type ScreenKey =
  | 'home'
  | 'meditations'
  | 'player'
  | 'kapwa'
  | 'yoga'
  | 'stories'
  | 'story'
  | 'sleep'
  | 'timer'
  | 'program'
  | 'reflections'
  | 'circles'
  | 'discover';

/** Captured from the app itself in dark mode at 390x804, saved at 660x1361. */
const screenSrc = (key: ScreenKey) => `${ASSET_BASE}/screens/${key}.webp`;

/**
 * One app screen: a status bar over a capture of the real screen, sized so the
 * app's bottom bar lands at the foot of the glass rather than being cropped. Used inside
 * the phone and on its own as the cards that slide past it, so both read as
 * the same surface.
 *
 * Sizes are in container units, so it scales with whatever width it is given.
 */
function Screen({
  screen,
  priority,
  eager,
  ratio = 390 / 844,
  radius = 12,
  className,
}: {
  screen: ScreenKey;
  priority?: boolean;
  /** Load now rather than on approach: for cards that slide in mid-scroll. */
  eager?: boolean;
  /** Width over height, to match a phone opening that is not the app's own shape. */
  ratio?: number;
  /** Corner radius as a percentage of the width. */
  radius?: number;
  className?: string;
}) {
  return (
    <div className={cn('[container-type:inline-size]', className)}>
      <div
        className="relative flex w-full flex-col overflow-hidden bg-black"
        style={{ aspectRatio: ratio, borderRadius: `${radius}cqw` }}
      >
        <div className="flex h-[11cqw] shrink-0 items-center justify-between px-[8cqw] text-[3.6cqw] font-semibold text-white">
          <span>9:41</span>
          <span className="flex items-center gap-[1.4cqw]" aria-hidden="true">
            <span className="flex items-end gap-[0.6cqw]">
              {[1.4, 2, 2.6, 3.2].map((h) => (
                <span
                  key={h}
                  className="w-[0.8cqw] rounded-full bg-white"
                  style={{ height: `${h}cqw` }}
                />
              ))}
            </span>
            <span className="relative h-[3.2cqw] w-[6.4cqw] rounded-[1cqw] border-[0.35cqw] border-white/70 p-[0.4cqw]">
              <span className="block h-full w-3/4 rounded-[0.5cqw] bg-white" />
            </span>
          </span>
        </div>
        <div className="relative flex-1">
          <img
            src={screenSrc(screen)}
            alt=""
            loading={priority || eager ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A modern handset: titanium band, glass edge, side keys and the island. The
 * screen is either a capture (`screen`) or anything passed as children.
 */
function Phone({
  screen,
  priority,
  className,
  children,
  label,
}: {
  screen?: ScreenKey;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Describes what the screen shows, for screen readers. */
  label?: string;
}) {
  return (
    <div
      className={cn('[container-type:inline-size]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <div className="relative w-full rounded-[15cqw] bg-[linear-gradient(145deg,#E9EEF2_0%,#9AA6B2_22%,#F4F7FA_46%,#7E8B98_74%,#D7DEE4_100%)] p-[0.9cqw] shadow-[0_40px_80px_-30px_rgba(11,27,43,0.45),0_12px_30px_-12px_rgba(11,27,43,0.25)]">
        {/* Side keys */}
        <span className="absolute -left-[0.9cqw] top-[22%] h-[7%] w-[1.2cqw] rounded-l-full bg-[#A9B4BF]" />
        <span className="absolute -left-[0.9cqw] top-[31%] h-[11%] w-[1.2cqw] rounded-l-full bg-[#A9B4BF]" />
        <span className="absolute -right-[0.9cqw] top-[27%] h-[15%] w-[1.2cqw] rounded-r-full bg-[#A9B4BF]" />
        <div className="relative rounded-[14.2cqw] bg-[#05080C] p-[2.4cqw]">
          {children ? (
            <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[12cqw] bg-black">
              {children}
            </div>
          ) : (
            screen && <Screen screen={screen} priority={priority} />
          )}
          {/* The island */}
          <span className="absolute left-1/2 top-[4.2cqw] h-[7.6cqw] w-[27cqw] -translate-x-1/2 rounded-full bg-black" />
          {/* Glass sheen */}
          <span className="pointer-events-none absolute inset-[2.4cqw] rounded-[12cqw] bg-[linear-gradient(115deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0)_72%,rgba(255,255,255,0.12)_100%)]" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* hand-phone-showcase.tsx                                            */
/* ================================================================== */
const SCREENS: { key: ScreenKey; title: string; text: string }[] = [
  { key: 'home', title: 'Home', text: 'A slow breath, sessions picked for you, and quick ways in.' },
  { key: 'meditations', title: 'Meditations', text: 'Favourites, programs, stories and sounds in one library.' },
  { key: 'player', title: 'Guided player', text: 'A breathing orb paced to the session, with sound made on the phone.' },
  { key: 'kapwa', title: 'Kapwa', text: 'A built-in guide that points you to a session for how you feel.' },
  { key: 'yoga', title: 'Yoga', text: 'Gentle guided flows, one pose at a time, with a soft bell to move.' },
  { key: 'stories', title: 'Sleep stories', text: 'Original stories to read yourself, or have read to you.' },
  { key: 'story', title: 'Read aloud', text: 'Narration with skip, scrub and a sleep timer that fades the bed.' },
  { key: 'sleep', title: 'Sleep log', text: 'Note when you slept and woke, and see your nights over time.' },
  { key: 'timer', title: 'Unguided timer', text: 'Pick a length, interval bells and an ambient bed.' },
  { key: 'program', title: 'Programs', text: 'Multi-session journeys like Sleep Mastery, in order.' },
  { key: 'reflections', title: 'Daily reflection', text: 'One prompt a day and a sentence in reply, kept on the phone.' },
  { key: 'circles', title: 'Circles', text: 'Small groups that sit together at the same time each day.' },
  { key: 'discover', title: 'Discover', text: 'Search and filter every session by how you feel.' },
];

/*
 * Where the screen opening sits in mockup.png (1100x1430), measured from its
 * alpha channel. The cards are cut a few pixels larger than the opening so
 * the bezel always covers their edge.
 */
const HOLE = { x: 177, y: 84, w: 492, h: 1076, radius: 72 };
const BLEED = 3;
const CARD = { w: HOLE.w + BLEED * 2, h: HOLE.h + BLEED * 2 };

interface Dims {
  vw: number;
  /** Image pixels to CSS pixels. */
  scale: number;
  cardTop: number;
  cardW: number;
  cardH: number;
  gap: number;
}

function measure(): Dims {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < 640;
  // Sized from the height so the whole phone, bottom bar included, stays in
  // view; on a phone it leaves room for the caption beneath.
  const cardW = Math.min(vw * 0.56, (vh * (mobile ? 0.52 : 0.74)) / (CARD.h / CARD.w), 360);
  const scale = cardW / CARD.w;
  const cardH = CARD.h * scale;
  return {
    vw,
    scale,
    cardTop: mobile ? 60 : Math.max(40, (vh - cardH) / 2 - 20),
    cardW,
    cardH,
    gap: Math.max(18, cardW * 0.13),
  };
}

/**
 * "{Mindful} meditation": a hand holds the phone still in the middle of a blue
 * stage while the app's screens slide through it as the page scrolls.
 *
 * The section is tall and its stage is `sticky`, so the stage stays pinned
 * while scroll progress walks the strip of screens from the first to the last.
 * The hand and phone are one photo (mockup.png) with a see-through screen,
 * laid over the strip so whichever card sits under it reads as the screen in
 * the hand.
 */
function HandPhoneShowcase() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState<Dims | null>(null);
  const [active, setActive] = React.useState(0);
  const reduced = usePrefersReducedMotion();

  const target = React.useRef(0);
  const current = React.useRef(0);
  const frame = React.useRef(0);
  const dimsRef = React.useRef<Dims | null>(null);

  React.useEffect(() => {
    const update = () => {
      const next = measure();
      dimsRef.current = next;
      setDims(next);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const paint = React.useCallback(() => {
    const d = dimsRef.current;
    const strip = stripRef.current;
    if (!d || !strip) return;
    const step = d.cardW + d.gap;
    const x = d.vw / 2 - d.cardW / 2 - current.current * step;
    strip.style.transform = `translate3d(${x}px,0,0)`;
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${current.current / (SCREENS.length - 1)})`;
    }
  }, []);

  // Eases the strip toward where the scroll says it should be, so a flick of
  // the wheel glides instead of jumping a whole card.
  const animate = React.useCallback(() => {
    frame.current = 0;
    const delta = target.current - current.current;
    current.current = Math.abs(delta) < 0.001 || reduced ? target.current : current.current + delta * 0.14;
    paint();
    if (current.current !== target.current) frame.current = requestAnimationFrame(animate);
  }, [paint, reduced]);

  useScrollProgress(sectionRef, (progress) => {
    // Hold on the first and last screens briefly at either end of the pin.
    const travel = clamp((progress - 0.04) / 0.92) * (SCREENS.length - 1);
    // Each screen rests in the hand for most of its share of the scroll, then
    // slides quickly to the next, so the phone is rarely caught between two.
    const index = Math.min(Math.floor(travel), SCREENS.length - 2);
    const t = clamp((travel - index - 0.35) / 0.3);
    target.current = index + t * t * (3 - 2 * t);
    setActive(Math.round(target.current));
    if (!frame.current) frame.current = requestAnimationFrame(animate);
  });

  React.useEffect(() => {
    paint();
  }, [dims, paint]);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  const screen = SCREENS[active];

  return (
    <section
      id="showcase"
      ref={sectionRef}
      aria-label="A tour of the app's screens"
      className="relative bg-[#1EA0DA]"
      style={{ height: `${SCREENS.length * 55 + 100}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <Constellation rgb="255 255 255" density={0.7} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_70%)]"
        />
        {/* Giant outline word behind the stage */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[3vh] select-none whitespace-nowrap text-center text-[18vw] font-semibold leading-none tracking-[-0.05em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.35)]"
        >
          breathe
        </p>

        {dims && (
          <>
            {/* The strip of screens */}
            <div
              ref={stripRef}
              className="absolute left-0 flex will-change-transform"
              style={{ top: dims.cardTop, gap: dims.gap }}
            >
              {SCREENS.map((item, index) => (
                <div
                  key={item.key}
                  className="shrink-0 transition-[opacity,filter] duration-500"
                  style={{
                    width: dims.cardW,
                    opacity: Math.abs(index - active) > 2 ? 0.35 : 1,
                  }}
                >
                  <Screen
                    screen={item.key}
                    eager
                    ratio={CARD.w / CARD.h}
                    radius={((HOLE.radius + BLEED) / CARD.w) * 100}
                    className="drop-shadow-[0_24px_30px_rgba(6,40,70,0.35)]"
                  />
                </div>
              ))}
            </div>

            {/* The hand and phone, placed so the opening sits over the centred card */}
            <img
              src={MOCKUP.src}
              alt=""
              className="pointer-events-none absolute z-10 max-w-none select-none drop-shadow-[0_40px_50px_rgba(6,40,70,0.4)]"
              style={{
                width: MOCKUP.width * dims.scale,
                height: MOCKUP.height * dims.scale,
                left: dims.vw / 2 - (HOLE.x + HOLE.w / 2) * dims.scale,
                top: dims.cardTop - (HOLE.y - BLEED) * dims.scale,
              }}
            />
          </>
        )}

        {/* Caption and progress */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0F7FB4]/80 via-[#1EA0DA]/40 to-transparent px-5 pb-24 pt-16 sm:px-10 sm:pb-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 text-white sm:flex-row sm:items-end sm:justify-between">
            <div
              aria-live="polite"
              className="max-w-xs rounded-[22px] border border-white/30 bg-[#0E7FB3]/55 p-5 shadow-[0_20px_50px_-20px_rgba(6,40,70,0.6)] backdrop-blur-xl"
            >
              <p className="text-[0.875rem] text-white/75">
                <span className="tabular-nums">{String(active + 1).padStart(2, '0')}</span>
                <span className="mx-1.5 text-white/40">/</span>
                <span className="tabular-nums">{String(SCREENS.length).padStart(2, '0')}</span>
              </p>
              <p className="mt-1 text-[1.35rem] font-semibold leading-tight">{screen.title}</p>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-white/85">{screen.text}</p>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/25 sm:w-64">
              <div ref={barRef} className="h-full origin-left rounded-full bg-white" style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The heading block that introduces the pinned stage, after the reference's layout. */
function ShowcaseIntro() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id="mindful" className="relative overflow-hidden bg-white px-5 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
          <h2
            data-reveal
            className={`${REVEAL} text-[clamp(3rem,10vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[#0B1B2B]`}
          >
            <span className="font-light text-[#1EA0DA]">{'{'}</span>
            Mindful
            <span className="font-light text-[#1EA0DA]">{'}'}</span>
            <br />
            meditation
          </h2>

          <div data-reveal className={`${REVEAL} lg:pb-4`} style={{ transitionDelay: '120ms' }}>
            <Asterisk aria-hidden="true" className="h-12 w-12 animate-[spin_14s_linear_infinite] text-[#1EA0DA]" strokeWidth={1.4} />
            <p className="mt-6 text-[1.35rem] leading-snug text-[#0B1B2B] sm:text-[1.6rem]">
              Feeling calmer is a practice. We take it{' '}
              <span className="text-[#1EA0DA]">(a)</span> seriously and{' '}
              <span className="text-[#1EA0DA]">(b)</span> gently.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#features"
                className="group inline-flex items-center gap-2 rounded-full bg-[#1EA0DA] px-6 py-3.5 text-[0.875rem] font-medium text-white shadow-[0_14px_30px_-12px_rgba(30,160,218,0.7)] transition hover:bg-[#178CC0]"
              >
                See every feature
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-full border border-[#0B1B2B]/15 px-6 py-3.5 text-[0.875rem] font-medium text-[#0B1B2B] transition hover:border-[#1EA0DA] hover:text-[#1EA0DA]"
              >
                Get the app
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* sections.tsx                                                       */
/* ================================================================== */

const BLUE = '#1EA0DA';

interface LandingCounts {
  meditations: number;
  programs: number;
  stories: number;
  yoga: number;
}

interface LandingProgram {
  id: string;
  title: string;
  level: string;
  sessions: number;
  image: string;
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-[0.875rem] font-medium tracking-[0.02em]',
        light ? 'text-white/85' : 'text-[#1EA0DA]',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', light ? 'bg-white' : 'bg-[#1EA0DA]')} />
      {children}
    </p>
  );
}

function SectionTitle({
  children,
  className,
  light,
}: {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}) {
  return (
    <h2
      data-reveal
      className={cn(
        REVEAL,
        'mt-4 text-balance text-[clamp(1.85rem,3.4vw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.03em]',
        light ? 'text-white' : 'text-[#0B1B2B]',
        className,
      )}
    >
      {children}
    </h2>
  );
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

/** The four-colour Play triangle. */
function PlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 24" aria-hidden="true" className={className}>
      <path d="M1 .9 L12.3 12 L1 23.1 C.6 22.8.4 22.3.4 21.7 V2.3 C.4 1.7.6 1.2 1 .9 Z" fill="#4285F4" />
      <path d="M1 .9 C1.5.5 2.2.4 3 .9 L16.2 8.4 L12.3 12 Z" fill="#34A853" />
      <path d="M16.2 8.4 L20.4 10.8 C21.6 11.5 21.6 12.5 20.4 13.2 L16.2 15.6 L12.3 12 Z" fill="#FBBC04" />
      <path d="M12.3 12 L16.2 15.6 L3 23.1 C2.2 23.6 1.5 23.5 1 23.1 Z" fill="#EA4335" />
    </svg>
  );
}

/** The App Store and Google Play badges, drawn after the official artwork. */
function StoreButtons() {
  const badge =
    'inline-flex h-[54px] items-center gap-2.5 rounded-[10px] bg-black pl-3.5 pr-5 text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-14px_rgba(0,0,0,0.6)] [font-family:-apple-system,BlinkMacSystemFont,"Helvetica_Neue",Arial,sans-serif]';
  return (
    <div className="flex flex-wrap gap-3">
      <a href={APP_STORE_URL} aria-label="Download on the App Store" className={badge}>
        <AppleLogo className="h-[30px] w-[30px]" />
        <span className="flex flex-col leading-none">
          <span className="text-[12px] font-medium tracking-[0.01em]">Download on the</span>
          <span className="mt-[3px] text-[25px] font-semibold tracking-[-0.02em]">App Store</span>
        </span>
      </a>
      <a href={PLAY_STORE_URL} aria-label="Get it on Google Play" className={cn(badge, 'border border-[#A6A6A6]')}>
        <PlayLogo className="h-[28px] w-[26px]" />
        <span className="flex flex-col leading-none">
          <span className="text-[11px] font-medium tracking-[0.04em]">GET IT ON</span>
          <span className="mt-[3px] text-[24px] font-medium tracking-[-0.01em]">Google Play</span>
        </span>
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const tiltRef = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  // The phone starts turned toward the headline and squares up as you scroll.
  React.useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const tilt = tiltRef.current;
      if (!section || !tilt) return;
      const p = clamp(-section.getBoundingClientRect().top / window.innerHeight);
      tilt.style.transform = `rotateY(${-24 + 30 * p}deg) rotateX(${12 - 8 * p}deg) rotateZ(${7 - 9 * p}deg) translateY(${p * -30}px)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
    };
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative isolate overflow-hidden bg-white px-5 pb-12 pt-14 sm:px-10 sm:pb-16 lg:pt-20"
    >
      <Constellation className="opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -right-[20%] -top-[30%] -z-10 h-[90vh] w-[90vh] rounded-full bg-[radial-gradient(circle,rgba(30,160,218,0.18)_0%,rgba(30,160,218,0)_65%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[30%] -left-[15%] -z-10 h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(97,166,68,0.10)_0%,rgba(97,166,68,0)_65%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <a
            href="#showcase"
            className="inline-flex lm-rise items-center gap-2 rounded-full border border-[#1EA0DA]/25 bg-white/70 py-1.5 pl-1.5 pr-4 text-[0.8125rem] text-[#0B1B2B] backdrop-blur"
          >
            <span className="rounded-full bg-[#1EA0DA] px-2.5 py-0.5 text-[0.75rem] font-medium text-white">New</span>
            Kapwa, Circles and Yoga are here
            <ArrowUpRight className="h-3.5 w-3.5 text-[#1EA0DA]" />
          </a>
          <h1 className="mt-7 lm-rise text-[clamp(2.4rem,4.6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[#0B1B2B] [animation-delay:80ms]">
            Quiet your
            <br />
            <span className="whitespace-nowrap bg-[linear-gradient(100deg,#1EA0DA_0%,#3CC3E8_55%,#61A644_100%)] bg-clip-text text-transparent">
              restless mind.
            </span>
          </h1>
          <p className="mt-7 max-w-[34rem] lm-rise text-[1.05rem] leading-[1.75] text-[#4A5B6B] [animation-delay:160ms]">
            Getmeds Meditation is a calm companion for your phone. Guided sessions, breathing,
            sleep sounds, stories, yoga and small Circles that sit together, with your progress
            kept honestly on your own device.
          </p>
          <div className="mt-9 flex lm-rise flex-wrap items-center gap-3 [animation-delay:240ms]">
            <a
              href="#download"
              className="group inline-flex items-center gap-2 rounded-full bg-[#1EA0DA] px-7 py-4 text-[0.875rem] font-medium text-white shadow-[0_18px_36px_-14px_rgba(30,160,218,0.8)] transition hover:bg-[#178CC0]"
            >
              Download the app
              <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-full border border-[#0B1B2B]/12 bg-white/70 px-6 py-4 text-[0.875rem] font-medium text-[#0B1B2B] backdrop-blur transition hover:border-[#1EA0DA] hover:text-[#1EA0DA]"
            >
              Take the tour
            </a>
            <a
              href="#mindful"
              aria-label="Scroll to the next section"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0B1B2B]/12 text-[#0B1B2B] transition hover:border-[#1EA0DA] hover:text-[#1EA0DA]"
            >
              <ArrowDown className="h-4 w-4 animate-bounce" />
            </a>
          </div>
          <p className="mt-6 text-[0.8125rem] text-[#7A8A99]">For phones and tablets · Works offline once installed</p>
        </div>

        {/* Phone, orbit and floating chips */}
        <div className="relative mx-auto flex w-full max-w-[460px] items-center justify-center [perspective:1600px]">
          <div aria-hidden="true" className="absolute inset-[-12%] rounded-full border border-[#1EA0DA]/15" />
          <div aria-hidden="true" className="absolute inset-[-2%] animate-[spin_50s_linear_infinite] rounded-full border border-dashed border-[#1EA0DA]/25">
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1EA0DA] shadow-[0_0_14px_4px_rgba(30,160,218,0.5)]" />
          </div>
          <div aria-hidden="true" className="absolute inset-[10%] animate-[spin_34s_linear_infinite_reverse] rounded-full border border-[#61A644]/20">
            <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#61A644]" />
          </div>

          <div
            ref={tiltRef}
            className="relative w-[min(62vw,300px)] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
            style={{ transform: 'rotateY(-24deg) rotateX(12deg) rotateZ(7deg)' }}
          >
            <Phone screen="home" priority label="The app's home screen" />
          </div>

          <FloatingChip className="left-[-4%] top-[14%] sm:left-[-10%]" delay="0s">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1EA0DA]/10">
              <Wind className="h-4 w-4 text-[#1EA0DA]" />
            </span>
            <span>
              <span className="block text-[0.75rem] text-[#7A8A99]">Breathing</span>
              <span className="block text-[0.8125rem] font-medium">In 4 · Hold 4 · Out 4</span>
            </span>
          </FloatingChip>
          <FloatingChip className="right-[-4%] top-[44%] sm:right-[-12%]" delay="1.2s">
            <img src={KAPWA_ICON} alt="" className="h-9 w-9 rounded-full" />
            <span>
              <span className="block text-[0.75rem] text-[#7A8A99]">Kapwa</span>
              <span className="block text-[0.8125rem] font-medium">How are you feeling?</span>
            </span>
          </FloatingChip>
          <FloatingChip className="bottom-[24%] left-[-2%] sm:left-[-12%]" delay="2.4s">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#61A644]/12">
              <Activity className="h-4 w-4 text-[#61A644]" />
            </span>
            <span>
              <span className="block text-[0.75rem] text-[#7A8A99]">Daily goal</span>
              <span className="block text-[0.8125rem] font-medium">Mindful minutes, today</span>
            </span>
          </FloatingChip>
        </div>
      </div>
    </section>
  );
}

function FloatingChip({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute z-10 flex lm-float items-center gap-3 rounded-2xl border border-white/80 bg-white/75 py-2.5 pl-2.5 pr-4 text-[#0B1B2B] shadow-[0_20px_40px_-18px_rgba(11,27,43,0.35)] backdrop-blur-xl',
        className,
      )}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mindfulness, measured                                               */
/* ------------------------------------------------------------------ */

function CountUp({ value }: { value: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(value);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = clamp((now - start) / 1400);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

function Measured({ counts }: { counts: LandingCounts }) {
  const ref = useReveal<HTMLElement>();
  const stats = [
    { value: counts.meditations, label: 'Guided sessions' },
    { value: counts.programs, label: 'Programs' },
    { value: counts.stories, label: 'Sleep stories' },
    { value: counts.yoga, label: 'Yoga flows' },
  ];
  return (
    <section ref={ref} className="bg-white px-5 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow>Mindfulness, measured</Eyebrow>
            <SectionTitle>Calm you can see, counted honestly.</SectionTitle>
          </div>
          <p data-reveal className={cn(REVEAL, 'text-[1.05rem] leading-[1.8] text-[#4A5B6B]')}>
            Every figure in the app comes from sittings you actually recorded. A sit counts once it
            passes a minute, streaks count back from yesterday so midnight never breaks them, and a
            new install starts empty rather than with a made-up history.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-[#0B1B2B]/[0.07] bg-[#0B1B2B]/[0.07] lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              data-reveal
              className={cn(REVEAL, 'group relative bg-white px-6 py-9 sm:px-8 sm:py-11')}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <span className="absolute inset-x-6 top-0 h-px origin-left scale-x-0 bg-[#1EA0DA] transition-transform duration-700 group-hover:scale-x-100" />
              <p className="text-[clamp(2.2rem,4vw,3.2rem)] font-semibold leading-none tracking-[-0.04em] text-[#0B1B2B]">
                <CountUp value={stat.value} />
                <span className="text-[#1EA0DA]">+</span>
              </p>
              <p className="mt-3 text-[0.875rem] text-[#5B6B7A]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: Headphones, title: 'Guided meditations', text: 'Sessions for stress, sleep, focus and low days, each with its own ambient bed.' },
  { icon: Route, title: 'Programs', text: 'Multi-session journeys such as Sleep Mastery and Breath School, played in order.' },
  { icon: Wind, title: 'Breathing orb', text: 'Paced breath with a soft tone at each turn and gentle haptics where the phone allows.' },
  { icon: Moon, title: 'Sleep', text: 'A four-sound mixer, a wind-down timer that fades it out, and a nightly sleep log.' },
  { icon: BookOpen, title: 'Stories read aloud', text: 'Original sleep stories narrated by the device voice, with skip, scrub and a sleep timer.' },
  { icon: PersonStanding, title: 'Yoga', text: 'Gentle guided flows, one pose at a time, with a voice guide and a bell to move.' },
  { icon: Timer, title: 'Unguided timer', text: 'Sit for 3 to 60 minutes with interval bells, a settling pause and optional ambience.' },
  { icon: Users, title: 'Circles', text: 'Groups of up to twenty that sit at the same time each day and share one streak.' },
  { icon: MessageCircleHeart, title: 'Kapwa', text: 'A built-in guide that suggests a session for how you feel. Not a person, not an AI.' },
  { icon: PenLine, title: 'Daily reflection', text: 'One prompt a day, a sentence in reply and a note of how it sat. A record, not a score.' },
  { icon: Sparkles, title: 'Daily inspiration', text: 'One short line each morning, chosen for how your week has been going.' },
  { icon: Activity, title: 'Progress and streaks', text: 'Mindful minutes, a daily goal and your week, all from sittings you really did.' },
];

function Features() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id="features" className="relative bg-white px-5 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>Features</Eyebrow>
            <SectionTitle>Everything inside the app.</SectionTitle>
          </div>
          <p data-reveal className={cn(REVEAL, 'max-w-md text-[1.02rem] leading-[1.75] text-[#4A5B6B]')}>
            Twelve ways in, one calm place. Pick what fits the moment, from a two-minute breath to a
            story at bedtime.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <article
              key={title}
              data-reveal
              className={cn(
                REVEAL,
                'group relative overflow-hidden rounded-[24px] border border-[#0B1B2B]/[0.07] bg-[#F7FBFE] p-6 transition-[transform,box-shadow,border-color,opacity] hover:-translate-y-1 hover:border-[#1EA0DA]/40 hover:shadow-[0_30px_60px_-30px_rgba(30,160,218,0.55)]',
              )}
              style={{ transitionDelay: `${(i % 4) * 70}ms` }}
            >
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(30,160,218,0.18),rgba(30,160,218,0)_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1EA0DA] shadow-[0_8px_20px_-12px_rgba(30,160,218,0.6)] transition-colors group-hover:bg-[#1EA0DA] group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <h3 className="mt-6 text-[1.08rem] font-semibold text-[#0B1B2B]">{title}</h3>
              <p className="mt-2 text-[0.875rem] leading-[1.7] text-[#5B6B7A]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sleep mixer spotlight                                               */
/* ------------------------------------------------------------------ */

const MIX = [
  { icon: CloudRain, name: 'Rain', kind: 'Steady and soft', base: 65 },
  { icon: Waves, name: 'Ocean', kind: 'Slow swell', base: 40 },
  { icon: MoonStar, name: 'Night', kind: 'Crickets and air', base: 30 },
  { icon: AudioLines, name: 'Drone', kind: 'Low and warm', base: 20 },
];

function SleepSpotlight() {
  const ref = useReveal<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!playing || reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1400);
    return () => window.clearInterval(id);
  }, [playing, reduced]);

  const steps = [
    { title: 'Mix your sleep sounds.', text: 'Rain, ocean, night and a low drone. Set each one where it feels right.' },
    { title: 'Set a wind-down timer.', text: 'The mix fades out gently as the countdown ends, so nothing jolts you awake.' },
    { title: 'Log the night.', text: 'Note when you slept and woke, and watch your nights take shape.' },
  ];

  return (
    <section
      ref={ref}
      id="sleep"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F1F9FD_100%)] px-5 py-12 sm:px-10 sm:py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>Sound mixing and sleep</Eyebrow>
          <SectionTitle>Make the night yours.</SectionTitle>
          <ol className="mt-10 divide-y divide-[#0B1B2B]/[0.08] border-y border-[#0B1B2B]/[0.08]">
            {steps.map((step, i) => (
              <li
                key={step.title}
                data-reveal
                className={cn(REVEAL, 'group grid grid-cols-[3rem_1fr_auto] gap-x-2 py-6')}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="text-[0.875rem] tabular-nums text-[#1EA0DA]">0{i + 1}</span>
                <div>
                  <h3 className="text-[1.15rem] font-semibold text-[#0B1B2B]">{step.title}</h3>
                  <p className="mt-1.5 text-[0.875rem] leading-[1.7] text-[#5B6B7A]">{step.text}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-[#0B1B2B]/30 transition group-hover:text-[#1EA0DA]" />
              </li>
            ))}
          </ol>
        </div>

        <div data-reveal className={cn(REVEAL, 'relative')}>
          <div aria-hidden="true" className="absolute -inset-6 rounded-[44px] bg-[radial-gradient(70%_60%_at_60%_40%,rgba(30,160,218,0.22),rgba(30,160,218,0))]" />
          <div className="relative rounded-[32px] border border-white bg-white/80 p-6 shadow-[0_40px_80px_-40px_rgba(11,27,43,0.45)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-[0.8125rem] text-[#7A8A99]">Your evening mix</p>
              <span className="rounded-full bg-[#1EA0DA]/10 px-3 py-1 text-[0.75rem] font-medium text-[#1EA0DA]">Preview</span>
            </div>
            <p className="mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-[#0B1B2B]">
              A quiet place, made by you.
            </p>

            <ul className="mt-7 space-y-5">
              {MIX.map(({ icon: Icon, name, kind, base }, i) => {
                const level = Math.round(base + Math.sin(tick * 0.9 + i * 1.7) * 9);
                return (
                  <li key={name} className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1F9FD] text-[#1EA0DA]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-[0.875rem] font-medium text-[#0B1B2B]">
                          {name} <span className="ml-1 text-[0.8125rem] font-normal text-[#7A8A99]">{kind}</span>
                        </p>
                        <p className="text-[0.8125rem] tabular-nums text-[#5B6B7A]">{level}%</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0B1B2B]/[0.07]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#1EA0DA,#61A644)] transition-[width] duration-[1400ms] ease-in-out"
                          style={{ width: `${level}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#F1F9FD] p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center">
                  <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
                    <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(30,160,218,0.18)" strokeWidth="3" />
                    <circle
                      cx="22"
                      cy="22"
                      r="19"
                      fill="none"
                      stroke={BLUE}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={119.4}
                      strokeDashoffset={119.4 * (0.35 + ((tick % 20) / 20) * 0.5)}
                      className="transition-[stroke-dashoffset] duration-[1400ms] ease-linear"
                    />
                  </svg>
                  <Moon className="h-4 w-4 text-[#1EA0DA]" />
                </span>
                <div>
                  <p className="text-[0.875rem] font-medium text-[#0B1B2B]">Stop after 20 min</p>
                  <p className="text-[0.8125rem] text-[#7A8A99]">Fades the mix as it ends</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause the preview animation' : 'Play the preview animation'}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1EA0DA] text-white transition hover:bg-[#178CC0]"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-4 text-center text-[0.8125rem] text-[#7A8A99]">Sound plays in the app.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Breathing (blue)                                                    */
/* ------------------------------------------------------------------ */

const PHASES = [
  { label: 'Breathe in', scale: 1 },
  { label: 'Hold', scale: 1 },
  { label: 'Breathe out', scale: 0.62 },
  { label: 'Hold', scale: 0.62 },
];

function BreathSpotlight() {
  const ref = useReveal<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = React.useState(true);
  const [second, setSecond] = React.useState(0);

  React.useEffect(() => {
    if (!playing || reduced) return;
    const id = window.setInterval(() => setSecond((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [playing, reduced]);

  const phaseIndex = Math.floor(second / 4) % 4;
  const phase = PHASES[phaseIndex];
  const count = (second % 4) + 1;

  return (
    <section ref={ref} id="breathing" className="relative isolate overflow-hidden bg-[#1EA0DA] px-5 py-16 text-white sm:px-10 sm:py-20">
      <Constellation rgb="255 255 255" density={0.8} />
      <div className="relative mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow light>Guided breathing</Eyebrow>
          <SectionTitle light>Find your rhythm.</SectionTitle>
          <p data-reveal className={cn(REVEAL, 'mt-6 max-w-md text-[1.05rem] leading-[1.75] text-white/85')}>
            Follow the orb. Breathe in for 4, hold for 4, breathe out for 4 and hold for 4. A soft
            tone marks each turn, and the phone can pulse gently so you can close your eyes.
          </p>
          <div data-reveal className={cn(REVEAL, 'mt-8 flex flex-wrap gap-2')}>
            {['Box breathing', 'Coherent breathing', 'Relaxing breath', 'Breath School'].map((name) => (
              <span key={name} className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-[0.8125rem] backdrop-blur">
                {name}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="mt-10 inline-flex items-center gap-2 text-[0.875rem] font-medium text-white/90 underline-offset-4 hover:underline"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause preview' : 'Play preview'}
          </button>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div aria-hidden="true" className="absolute inset-0 rounded-full border border-white/20" />
          <div aria-hidden="true" className="absolute inset-[8%] animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-white/30" />
          <div aria-hidden="true" className="absolute inset-[3%] [transform:rotateX(72deg)]">
            <div className="h-full w-full animate-[spin_18s_linear_infinite] rounded-full border-2 border-white/40">
              <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_16px_4px_rgba(255,255,255,0.8)]" />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#FFFFFF_0%,#E3F5FC_38%,#9AD8F1_75%,#5BBDE6_100%)] shadow-[0_0_80px_10px_rgba(255,255,255,0.45),inset_-20px_-30px_60px_rgba(14,110,160,0.35)] transition-transform duration-[4000ms] ease-in-out"
            style={{ transform: `scale(${reduced ? 0.85 : phase.scale})` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#0B5E86]" aria-live="polite">
            <p className="text-[1.6rem] font-semibold tracking-[-0.02em]">{phase.label}</p>
            <p className="mt-1 text-[0.875rem] tabular-nums text-[#0B5E86]/70">{count}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Programs path                                                       */
/* ------------------------------------------------------------------ */

function ProgramsPath({ programs }: { programs: LandingProgram[] }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} id="programs" className="relative overflow-hidden bg-white px-5 py-12 sm:px-10 sm:py-16">
      <Constellation className="opacity-40" density={0.5} />
      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>Programs</Eyebrow>
          <SectionTitle>A little space within.</SectionTitle>
          <p data-reveal className={cn(REVEAL, 'mt-6 max-w-md text-[1.05rem] leading-[1.75] text-[#4A5B6B]')}>
            Programs walk you through a theme one session at a time, from a first week of calm to
            better sleep. Pick up where you left off, even after an interruption.
          </p>
          <a
            href="#download"
            className="mt-8 inline-flex items-center gap-2 text-[0.875rem] font-medium text-[#1EA0DA] underline-offset-4 hover:underline"
          >
            Explore programs in the app <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 400 1000"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <path
              d="M 120 40 C 360 160, 360 260, 260 340 S 40 520, 140 640 S 380 820, 260 960"
              fill="none"
              stroke={BLUE}
              strokeOpacity="0.35"
              strokeWidth="1.5"
              strokeDasharray="5 7"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ul className="relative space-y-10">
            {programs.map((program, i) => (
              <li
                key={program.id}
                data-reveal
                className={cn(REVEAL, 'flex items-center gap-5', i % 2 ? 'sm:ml-[34%]' : 'sm:ml-[6%]')}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
                  <span aria-hidden="true" className="absolute -inset-2 rounded-full border border-[#1EA0DA]/25" />
                  <img
                    src={program.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full rounded-full object-cover shadow-[0_20px_40px_-18px_rgba(11,27,43,0.55)]"
                  />
                  <span aria-hidden="true" className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-[#1EA0DA] shadow-[0_0_12px_3px_rgba(30,160,218,0.5)]" />
                </div>
                <div className="rounded-2xl border border-[#0B1B2B]/[0.06] bg-white/80 px-4 py-3 backdrop-blur">
                  <h3 className="text-[1.08rem] font-semibold text-[#0B1B2B]">{program.title}</h3>
                  <p className="mt-0.5 text-[0.8125rem] text-[#7A8A99]">
                    {program.sessions} sessions · {program.level}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Circles and Kapwa                                                   */
/* ------------------------------------------------------------------ */

function Together() {
  const ref = useReveal<HTMLElement>();
  const members = ['MA', 'JR', 'LS', 'KT', 'AB'];
  return (
    <section ref={ref} id="together" className="bg-white px-5 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Eyebrow>Community and care</Eyebrow>
          <SectionTitle>Never on your own.</SectionTitle>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* Circles */}
          <article
            data-reveal
            className={cn(REVEAL, 'relative isolate overflow-hidden rounded-[32px] bg-[linear-gradient(150deg,#1EA0DA_0%,#178CC0_100%)] p-8 text-white sm:p-10')}
          >
            <Constellation rgb="255 255 255" density={0.6} />
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Users className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <h3 className="mt-6 text-[1.5rem] font-semibold tracking-[-0.02em]">Circles</h3>
              <p className="mt-3 max-w-md text-[0.875rem] leading-[1.75] text-white/85">
                Small groups, never more than twenty, that sit at the same time each day. The
                streak belongs to the circle, and nobody keeps score of who sat longest.
              </p>

              <div className="mt-10 rounded-[24px] border border-white/25 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2.5">
                    {members.map((initials, i) => (
                      <span
                        key={initials}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1A93CA] text-[0.75rem] font-medium"
                        style={{ background: ['#61A644', '#0E7FB3', '#3CC3E8', '#23A392', '#8FA0EC'][i] }}
                      >
                        {initials}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[0.75rem] font-medium text-[#0E7FB3]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#61A644] opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#61A644]" />
                    </span>
                    Sitting together at 7:00
                  </span>
                </div>
                <p className="mt-4 text-[0.8125rem] text-white/80">
                  A day counts toward the group streak once three members have sat.
                </p>
              </div>
            </div>
          </article>

          {/* Kapwa */}
          <article
            data-reveal
            className={cn(REVEAL, 'relative overflow-hidden rounded-[32px] border border-[#0B1B2B]/[0.07] bg-[#F7FBFE] p-8 sm:p-10')}
            style={{ transitionDelay: '120ms' }}
          >
            <img src={KAPWA_ICON} alt="" className="h-12 w-12 rounded-2xl" />
            <h3 className="mt-6 text-[1.5rem] font-semibold tracking-[-0.02em] text-[#0B1B2B]">Kapwa</h3>
            <p className="mt-3 max-w-md text-[0.875rem] leading-[1.75] text-[#5B6B7A]">
              Named for the Filipino idea of shared humanity. Tell it how you feel and it points you
              to a session. It is not a person or an AI, and never a substitute for professional care.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-end gap-2">
                <img src={KAPWA_ICON} alt="" className="h-7 w-7 rounded-full" />
                <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[0.875rem] text-[#0B1B2B] shadow-[0_10px_24px_-16px_rgba(11,27,43,0.4)]">
                  Hi, I&apos;m Kapwa. I can help you find a session for how you&apos;re feeling.
                </p>
              </div>
              <div className="flex justify-end">
                <p className="rounded-2xl rounded-br-md bg-[#1EA0DA] px-4 py-3 text-[0.875rem] text-white">
                  I can&apos;t sleep
                </p>
              </div>
              <div className="flex items-end gap-2">
                <img src={KAPWA_ICON} alt="" className="h-7 w-7 rounded-full" />
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-[0.875rem] text-[#0B1B2B] shadow-[0_10px_24px_-16px_rgba(11,27,43,0.4)]">
                  That&apos;s a hard place to be. A sleep body scan might help you settle.
                  <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-[#1EA0DA]/10 px-3 py-1 text-[0.8125rem] font-medium text-[#1EA0DA]">
                    <Play className="h-3 w-3" /> Start a sleep session
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {['I feel stressed', 'Help me focus', "I'm new to meditation"].map((chip) => (
                  <span key={chip} className="rounded-full border border-[#0B1B2B]/10 bg-white px-3 py-1.5 text-[0.8125rem] text-[#4A5B6B]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Privacy and offline                                                 */
/* ------------------------------------------------------------------ */

const PROMISES = [
  {
    icon: WifiOff,
    title: 'Works offline',
    text: 'Once installed, sessions, stories and the timer keep working with no signal, on a flight or in a waiting room.',
  },
  {
    icon: AudioWaveform,
    title: 'Sound made on the device',
    text: 'Every soundscape is synthesised as it plays, so there is nothing to download and it never audibly loops.',
  },
  {
    icon: Lock,
    title: 'Your words stay yours',
    text: 'Reflections, sleep notes and Kapwa chats are kept on the phone. Circles is the one feature that uses a server.',
  },
];

function Promises() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="bg-[linear-gradient(180deg,#FFFFFF_0%,#F1F9FD_100%)] px-5 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Eyebrow>Privacy</Eyebrow>
          <SectionTitle className="mx-auto max-w-3xl">Calm that stays on your phone.</SectionTitle>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              data-reveal
              className={cn(REVEAL, 'rounded-[28px] border border-white bg-white/80 p-8 shadow-[0_30px_60px_-40px_rgba(11,27,43,0.45)] backdrop-blur')}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1EA0DA]/10 text-[#1EA0DA]">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <h3 className="mt-6 text-[1.15rem] font-semibold text-[#0B1B2B]">{title}</h3>
              <p className="mt-2 text-[0.875rem] leading-[1.75] text-[#5B6B7A]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Download (blue)                                                     */
/* ------------------------------------------------------------------ */

function Download() {
  const ref = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      id="download"
      className="relative isolate overflow-hidden bg-[#1EA0DA] px-5 py-16 text-white sm:px-10 sm:py-20"
    >
      <Constellation rgb="255 255 255" />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[60%] -z-10 h-[80vh] w-[80vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.3),rgba(255,255,255,0)_65%)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow light>Download</Eyebrow>
          <SectionTitle light>Bring a little calm to your phone.</SectionTitle>
          <p data-reveal className={cn(REVEAL, 'mt-6 max-w-md text-[1.05rem] leading-[1.75] text-white/85')}>
            Sessions, sleep, stories and breathing, at your own pace. Start with two minutes today.
          </p>
          <div data-reveal className={cn(REVEAL, 'mt-9')}>
            <StoreButtons />
          </div>
        </div>
        <div data-reveal className={cn(REVEAL, 'relative mx-auto flex h-[470px] w-full max-w-[460px] justify-center sm:h-[600px]')}>
          <Phone screen="player" className="absolute bottom-[2%] left-[2%] w-[46%] -rotate-[8deg]" />
          <Phone screen="home" className="absolute bottom-[8%] right-[4%] w-[50%] rotate-[5deg]" />
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* landing-page.tsx                                                   */
/* ================================================================== */
const LINKS = [
  { href: '#showcase', label: 'Tour' },
  { href: '#features', label: 'Features' },
  { href: '#sleep', label: 'Sleep' },
  { href: '#breathing', label: 'Breathing' },
  { href: '#programs', label: 'Programs' },
  { href: '#together', label: 'Circles' },
];

/**
 * The marketing page for the app, in place of the old getmeds.ph/meditations.
 *
 * Mostly white, with three blue (#1EA0DA) stages for rhythm: the hand-held
 * screen tour, breathing, and the download call. Every feature it names is one
 * the app actually ships, and every phone screen is a capture of the app.
 *
 * It carries no site header or footer of its own: it is embedded in the host
 * website, which supplies both.
 */
function LandingPage({
  counts,
  programs,
}: {
  counts: LandingCounts;
  programs: LandingProgram[];
}) {
  return (
    <div className="min-h-screen bg-white text-[#0B1B2B] antialiased" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{LANDING_CSS}</style>
      <main>
        <Hero />
        <ShowcaseIntro />
        <HandPhoneShowcase />
        <Measured counts={counts} />
        <Features />
        <SleepSpotlight />
        <BreathSpotlight />
        <ProgramsPath programs={programs} />
        <Together />
        <Promises />
        <Download />
      </main>
      <MenuPill />
    </div>
  );
}

/**
 * A floating glass pill at the foot of the screen: the menu, and a ring that
 * fills as you read down the page.
 */
function MenuPill() {
  const [open, setOpen] = React.useState(false);
  const ringRef = React.useRef<SVGCircleElement>(null);

  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      ringRef.current?.setAttribute('stroke-dashoffset', String(62.8 * (1 - p)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm origin-bottom rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-[0_30px_70px_-25px_rgba(11,27,43,0.45)] backdrop-blur-2xl transition duration-300',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Page menu" className="grid gap-1">
          {[...LINKS, { href: '#download', label: 'Download' }].map((link) => (
            <a
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-[0.875rem] font-medium text-[#0B1B2B] transition hover:bg-[#1EA0DA]/10 hover:text-[#1EA0DA]"
            >
              {link.label}
              <ArrowUpRight className="h-4 w-4 opacity-40" />
            </a>
          ))}
        </nav>
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/70 bg-white/70 p-1.5 shadow-[0_18px_40px_-16px_rgba(11,27,43,0.4)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="flex h-11 w-14 items-center justify-center rounded-full text-[#0B1B2B] transition hover:bg-[#0B1B2B]/5"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <a
          href="#top"
          aria-label="Back to top"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#1EA0DA] text-white"
        >
          <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" />
            <circle
              ref={ringRef}
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="62.8"
              strokeDashoffset="62.8"
            />
          </svg>
          <span className="h-2 w-2 rounded-full bg-white" />
        </a>
      </div>
    </>
  );
}

/* ================================================================== */
/* Entry point                                                        */
/* ================================================================== */

export default function MeditationsLanding() {
  return <LandingPage counts={COUNTS} programs={PROGRAMS} />;
}
