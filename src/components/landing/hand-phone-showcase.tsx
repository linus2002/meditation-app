'use client';

import * as React from 'react';
import Image from 'next/image';
import { ArrowUpRight, Asterisk } from 'lucide-react';

import mockup from '@/assets/images/mockup.png';

import { Constellation } from './constellation';
import { REVEAL, clamp, usePrefersReducedMotion, useReveal, useScrollProgress } from './motion';
import { Screen, type ScreenKey } from './phone';

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
export function HandPhoneShowcase() {
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
            <Image
              src={mockup}
              alt=""
              priority
              sizes="(min-width: 1024px) 800px, 130vw"
              className="pointer-events-none absolute z-10 max-w-none select-none drop-shadow-[0_40px_50px_rgba(6,40,70,0.4)]"
              style={{
                width: mockup.width * dims.scale,
                height: mockup.height * dims.scale,
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
              <p className="text-body-sm text-white/75">
                <span className="tabular-nums">{String(active + 1).padStart(2, '0')}</span>
                <span className="mx-1.5 text-white/40">/</span>
                <span className="tabular-nums">{String(SCREENS.length).padStart(2, '0')}</span>
              </p>
              <p className="mt-1 text-[1.35rem] font-semibold leading-tight">{screen.title}</p>
              <p className="mt-1 text-body-sm leading-relaxed text-white/85">{screen.text}</p>
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
export function ShowcaseIntro() {
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
                className="group inline-flex items-center gap-2 rounded-full bg-[#1EA0DA] px-6 py-3.5 text-body-sm font-medium text-white shadow-[0_14px_30px_-12px_rgba(30,160,218,0.7)] transition hover:bg-[#178CC0]"
              >
                See every feature
                <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-full border border-[#0B1B2B]/15 px-6 py-3.5 text-body-sm font-medium text-[#0B1B2B] transition hover:border-[#1EA0DA] hover:text-[#1EA0DA]"
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
