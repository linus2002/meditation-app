'use client';

import * as React from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { HandPhoneShowcase, ShowcaseIntro } from './hand-phone-showcase';
import {
  BreathSpotlight,
  Download,
  Features,
  Hero,
  Measured,
  Promises,
  ProgramsPath,
  SleepSpotlight,
  Together,
  type LandingCounts,
  type LandingProgram,
} from './sections';

const LINKS = [
  { href: '#showcase', label: 'Tour' },
  { href: '#features', label: 'Features' },
  { href: '#sleep', label: 'Sleep' },
  { href: '#breathing', label: 'Breathing' },
  { href: '#programs', label: 'Programs' },
  { href: '#together', label: 'Kapwa' },
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
export function LandingPage({
  counts,
  programs,
}: {
  counts: LandingCounts;
  programs: LandingProgram[];
}) {
  return (
    <div data-theme="light" className="min-h-screen bg-white font-sans text-[#0B1B2B] antialiased">
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
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-body-sm font-medium text-[#0B1B2B] transition hover:bg-[#1EA0DA]/10 hover:text-[#1EA0DA]"
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
