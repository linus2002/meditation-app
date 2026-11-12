import type { Metadata } from 'next';

import { LandingPage } from '@/components/landing/landing-page';
import { content } from '@/content';
import { programs } from '@/data/programs';

export const metadata: Metadata = {
  title: 'Getmeds Meditation — Quiet your restless mind',
  description:
    'Guided meditations, breathing, sleep sounds, stories read aloud, yoga and Kapwa: a calm companion for your phone.',
};

/**
 * The public page for the app. Counts and programmes are read here, on the
 * server, so the full content file never ships to the browser.
 */
export default function Landing() {
  return (
    <LandingPage
      counts={{
        meditations: content.meditations.length,
        programs: content.programs.length,
        stories: content.stories.length,
        yoga: content.yoga.length,
      }}
      programs={programs.slice(0, 4).map((program) => ({
        id: program.id,
        title: program.title,
        level: program.level,
        sessions: program.sessions.length,
        image: program.image,
      }))}
    />
  );
}
