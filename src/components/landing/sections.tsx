'use client';

import * as React from 'react';
import Image, { type StaticImageData } from 'next/image';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  AudioLines,
  AudioWaveform,
  BookOpen,
  CloudRain,
  Headphones,
  Lock,
  MessageCircleHeart,
  MoonStar,
  Moon,
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
} from 'lucide-react';

import kapwaIcon from '@/assets/images/kapwaicon-256.png';
import { cn } from '@/lib/utils';

import { Constellation } from './constellation';
import { REVEAL, clamp, usePrefersReducedMotion, useReveal } from './motion';
import { Phone } from './phone';

/* Store links: swap in the real listings once they are live. */
export const APP_STORE_URL = '#download';
export const PLAY_STORE_URL = '#download';

const BLUE = '#1EA0DA';

export interface LandingCounts {
  meditations: number;
  programs: number;
  stories: number;
  yoga: number;
}

export interface LandingProgram {
  id: string;
  title: string;
  level: string;
  sessions: number;
  image: StaticImageData;
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-body-sm font-medium tracking-[0.02em]',
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

export function Hero() {
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
            className="inline-flex animate-rise-in items-center gap-2 rounded-full border border-[#1EA0DA]/25 bg-white/70 py-1.5 pl-1.5 pr-4 text-caption text-[#0B1B2B] backdrop-blur"
          >
            <span className="rounded-full bg-[#1EA0DA] px-2.5 py-0.5 text-label font-medium text-white">New</span>
            Kapwa, Circles and Yoga are here
            <ArrowUpRight className="h-3.5 w-3.5 text-[#1EA0DA]" />
          </a>
          <h1 className="mt-7 animate-rise-in text-[clamp(2.4rem,4.6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[#0B1B2B] [animation-delay:80ms]">
            Quiet your
            <br />
            <span className="whitespace-nowrap bg-[linear-gradient(100deg,#1EA0DA_0%,#3CC3E8_55%,#61A644_100%)] bg-clip-text text-transparent">
              restless mind.
            </span>
          </h1>
          <p className="mt-7 max-w-[34rem] animate-rise-in text-[1.05rem] leading-[1.75] text-[#4A5B6B] [animation-delay:160ms]">
            Getmeds Meditation is a calm companion for your phone. Guided sessions, breathing,
            sleep sounds, stories, yoga and small Circles that sit together, with your progress
            kept honestly on your own device.
          </p>
          <div className="mt-9 flex animate-rise-in flex-wrap items-center gap-3 [animation-delay:240ms]">
            <a
              href="#download"
              className="group inline-flex items-center gap-2 rounded-full bg-[#1EA0DA] px-7 py-4 text-body-sm font-medium text-white shadow-[0_18px_36px_-14px_rgba(30,160,218,0.8)] transition hover:bg-[#178CC0]"
            >
              Download the app
              <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-full border border-[#0B1B2B]/12 bg-white/70 px-6 py-4 text-body-sm font-medium text-[#0B1B2B] backdrop-blur transition hover:border-[#1EA0DA] hover:text-[#1EA0DA]"
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
          <p className="mt-6 text-caption text-[#7A8A99]">For phones and tablets · Works offline once installed</p>
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
              <span className="block text-label text-[#7A8A99]">Breathing</span>
              <span className="block text-caption font-medium">In 4 · Hold 4 · Out 4</span>
            </span>
          </FloatingChip>
          <FloatingChip className="right-[-4%] top-[44%] sm:right-[-12%]" delay="1.2s">
            <Image src={kapwaIcon} alt="" className="h-9 w-9 rounded-full" />
            <span>
              <span className="block text-label text-[#7A8A99]">Kapwa</span>
              <span className="block text-caption font-medium">How are you feeling?</span>
            </span>
          </FloatingChip>
          <FloatingChip className="bottom-[24%] left-[-2%] sm:left-[-12%]" delay="2.4s">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#61A644]/12">
              <Activity className="h-4 w-4 text-[#61A644]" />
            </span>
            <span>
              <span className="block text-label text-[#7A8A99]">Daily goal</span>
              <span className="block text-caption font-medium">Mindful minutes, today</span>
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
        'absolute z-10 flex animate-float items-center gap-3 rounded-2xl border border-white/80 bg-white/75 py-2.5 pl-2.5 pr-4 text-[#0B1B2B] shadow-[0_20px_40px_-18px_rgba(11,27,43,0.35)] backdrop-blur-xl',
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

export function Measured({ counts }: { counts: LandingCounts }) {
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
              <p className="mt-3 text-body-sm text-[#5B6B7A]">{stat.label}</p>
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

export function Features() {
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
              <p className="mt-2 text-body-sm leading-[1.7] text-[#5B6B7A]">{text}</p>
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

export function SleepSpotlight() {
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
                <span className="text-body-sm tabular-nums text-[#1EA0DA]">0{i + 1}</span>
                <div>
                  <h3 className="text-[1.15rem] font-semibold text-[#0B1B2B]">{step.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-[1.7] text-[#5B6B7A]">{step.text}</p>
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
              <p className="text-caption text-[#7A8A99]">Your evening mix</p>
              <span className="rounded-full bg-[#1EA0DA]/10 px-3 py-1 text-label font-medium text-[#1EA0DA]">Preview</span>
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
                        <p className="text-body-sm font-medium text-[#0B1B2B]">
                          {name} <span className="ml-1 text-caption font-normal text-[#7A8A99]">{kind}</span>
                        </p>
                        <p className="text-caption tabular-nums text-[#5B6B7A]">{level}%</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0B1B2B]/[0.07]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#1EA0DA,#61A644)] transition-[width] [transition-duration:1400ms] ease-in-out"
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
                      className="transition-[stroke-dashoffset] [transition-duration:1400ms] ease-linear"
                    />
                  </svg>
                  <Moon className="h-4 w-4 text-[#1EA0DA]" />
                </span>
                <div>
                  <p className="text-body-sm font-medium text-[#0B1B2B]">Stop after 20 min</p>
                  <p className="text-caption text-[#7A8A99]">Fades the mix as it ends</p>
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
            <p className="mt-4 text-center text-caption text-[#7A8A99]">Sound plays in the app.</p>
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

export function BreathSpotlight() {
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
              <span key={name} className="rounded-full border border-white/35 bg-white/10 px-4 py-2 text-caption backdrop-blur">
                {name}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="mt-10 inline-flex items-center gap-2 text-body-sm font-medium text-white/90 underline-offset-4 hover:underline"
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
            className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#FFFFFF_0%,#E3F5FC_38%,#9AD8F1_75%,#5BBDE6_100%)] shadow-[0_0_80px_10px_rgba(255,255,255,0.45),inset_-20px_-30px_60px_rgba(14,110,160,0.35)] transition-transform [transition-duration:4000ms] ease-in-out"
            style={{ transform: `scale(${reduced ? 0.85 : phase.scale})` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#0B5E86]" aria-live="polite">
            <p className="text-[1.6rem] font-semibold tracking-[-0.02em]">{phase.label}</p>
            <p className="mt-1 text-body-sm tabular-nums text-[#0B5E86]/70">{count}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Programs path                                                       */
/* ------------------------------------------------------------------ */

export function ProgramsPath({ programs }: { programs: LandingProgram[] }) {
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
            className="mt-8 inline-flex items-center gap-2 text-body-sm font-medium text-[#1EA0DA] underline-offset-4 hover:underline"
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
                  <Image
                    src={program.image}
                    alt=""
                    fill
                    sizes="128px"
                    className="rounded-full object-cover shadow-[0_20px_40px_-18px_rgba(11,27,43,0.55)]"
                  />
                  <span aria-hidden="true" className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-[#1EA0DA] shadow-[0_0_12px_3px_rgba(30,160,218,0.5)]" />
                </div>
                <div className="rounded-2xl border border-[#0B1B2B]/[0.06] bg-white/80 px-4 py-3 backdrop-blur">
                  <h3 className="text-[1.08rem] font-semibold text-[#0B1B2B]">{program.title}</h3>
                  <p className="mt-0.5 text-caption text-[#7A8A99]">
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

export function Together() {
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
              <p className="mt-3 max-w-md text-body-sm leading-[1.75] text-white/85">
                Small groups, never more than twenty, that sit at the same time each day. The
                streak belongs to the circle, and nobody keeps score of who sat longest.
              </p>

              <div className="mt-10 rounded-[24px] border border-white/25 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2.5">
                    {members.map((initials, i) => (
                      <span
                        key={initials}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1A93CA] text-label font-medium"
                        style={{ background: ['#61A644', '#0E7FB3', '#3CC3E8', '#23A392', '#8FA0EC'][i] }}
                      >
                        {initials}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-label font-medium text-[#0E7FB3]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#61A644] opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#61A644]" />
                    </span>
                    Sitting together at 7:00
                  </span>
                </div>
                <p className="mt-4 text-caption text-white/80">
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
            <Image src={kapwaIcon} alt="" className="h-12 w-12 rounded-2xl" />
            <h3 className="mt-6 text-[1.5rem] font-semibold tracking-[-0.02em] text-[#0B1B2B]">Kapwa</h3>
            <p className="mt-3 max-w-md text-body-sm leading-[1.75] text-[#5B6B7A]">
              Named for the Filipino idea of shared humanity. Tell it how you feel and it points you
              to a session. It is not a person or an AI, and never a substitute for professional care.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-end gap-2">
                <Image src={kapwaIcon} alt="" className="h-7 w-7 rounded-full" />
                <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-body-sm text-[#0B1B2B] shadow-[0_10px_24px_-16px_rgba(11,27,43,0.4)]">
                  Hi, I&apos;m Kapwa. I can help you find a session for how you&apos;re feeling.
                </p>
              </div>
              <div className="flex justify-end">
                <p className="rounded-2xl rounded-br-md bg-[#1EA0DA] px-4 py-3 text-body-sm text-white">
                  I can&apos;t sleep
                </p>
              </div>
              <div className="flex items-end gap-2">
                <Image src={kapwaIcon} alt="" className="h-7 w-7 rounded-full" />
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-body-sm text-[#0B1B2B] shadow-[0_10px_24px_-16px_rgba(11,27,43,0.4)]">
                  That&apos;s a hard place to be. A sleep body scan might help you settle.
                  <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-[#1EA0DA]/10 px-3 py-1 text-caption font-medium text-[#1EA0DA]">
                    <Play className="h-3 w-3" /> Start a sleep session
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {['I feel stressed', 'Help me focus', "I'm new to meditation"].map((chip) => (
                  <span key={chip} className="rounded-full border border-[#0B1B2B]/10 bg-white px-3 py-1.5 text-caption text-[#4A5B6B]">
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

export function Promises() {
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
              <p className="mt-2 text-body-sm leading-[1.75] text-[#5B6B7A]">{text}</p>
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

export function Download() {
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
