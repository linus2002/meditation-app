'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { CirclesUnavailable } from '@/components/circles/circles-unavailable';
import { circlesErrorMessage } from '@/components/circles/messages';
import { RecommendationCard } from '@/components/circles/recommendation-card';
import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import { OptionRow } from '@/components/timer/option-row';
import { Switch } from '@/components/ui/switch';
import * as api from '@/lib/circles/api';
import { CirclesError } from '@/lib/circles/api';
import { recommendCircles, type Recommendation } from '@/lib/circles/matching';
import { validateDisplayName } from '@/lib/circles/text';
import { deviceTimeZone } from '@/lib/circles/tz';
import type { CircleGoal, ExperienceLevel, TimeBand } from '@/lib/circles/types';
import { requestPermission } from '@/lib/notifications';
import { useCircles } from '@/providers/circles-provider';

const goalOptions = [
  { value: 'calm', label: 'Feel calmer' },
  { value: 'sleep', label: 'Sleep better' },
  { value: 'focus', label: 'Focus' },
  { value: 'habit', label: 'Build the habit' },
] as const;

const timeOptions = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
] as const;

const experienceOptions = [
  { value: 'new', label: 'New to this' },
  { value: 'some', label: 'Some practice' },
  { value: 'regular', label: 'I sit regularly' },
] as const;

type Step = 'intake' | 'choose' | 'welcome';

function errorText(error: unknown): string {
  return circlesErrorMessage(error instanceof CirclesError ? error.code : 'unknown');
}

/**
 * Three quick questions, two or three circles to choose from, then a short
 * welcome. The reader picks — nobody is placed in a circle silently — and the
 * answers never leave the device.
 */
export function JoinFlow() {
  const { status, hydrated, intake, saveIntake, memberships, join, reminders, setReminders } =
    useCircles();

  const [goal, setGoal] = React.useState<CircleGoal | null>(null);
  const [time, setTime] = React.useState<TimeBand | null>(null);
  const [experience, setExperience] = React.useState<ExperienceLevel | null>(null);

  // Start from the last answers, once they have been read back.
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || seeded.current || !intake) return;
    seeded.current = true;
    setGoal(intake.goal);
    setTime(intake.time);
    setExperience(intake.experience);
  }, [hydrated, intake]);

  const [step, setStep] = React.useState<Step>('intake');
  const [results, setResults] = React.useState<Recommendation[]>([]);
  // How many open circles came back at all, so "none open" is never mistaken
  // for "none at a good time".
  const [openCount, setOpenCount] = React.useState<number | null>(null);
  const [finding, setFinding] = React.useState(false);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);
  const [joinedId, setJoinedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [nameSaved, setNameSaved] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  if (status === 'unconfigured') {
    return (
      <div className="pb-4">
        <ScreenHeader title="Find your circle" />
        <CirclesUnavailable />
      </div>
    );
  }

  const atLimit = memberships.length >= 2;

  const showCircles = async () => {
    if (!goal || !time || !experience) return;
    const answers = { goal, time, experience };
    saveIntake(answers);
    setFinding(true);
    setError(null);
    try {
      const circles = await api.listOpenCircles();
      setOpenCount(circles.length);
      setResults(
        recommendCircles({
          intake: answers,
          userTz: deviceTimeZone(),
          now: Date.now(),
          circles,
          joinedIds: memberships.map((entry) => entry.circle.id),
        }),
      );
      setStep('choose');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setFinding(false);
    }
  };

  const handleJoin = async (circleId: string) => {
    setJoiningId(circleId);
    setError(null);
    try {
      await join(circleId);
      setJoinedId(circleId);
      setStep('welcome');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setJoiningId(null);
    }
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (validateDisplayName(trimmed)) {
      setNote('Keep it short, with no links.');
      return;
    }
    try {
      await api.setDisplayName(trimmed);
      setNameSaved(true);
      setNote(null);
    } catch (caught) {
      setNote(errorText(caught));
    }
  };

  const toggleReminders = async (next: boolean) => {
    if (!next) {
      setReminders(false);
      return;
    }
    const permission = await requestPermission();
    if (permission === 'granted') setReminders(true);
    else setNote('Notifications are blocked. You can allow them later in your settings.');
  };

  if (step === 'welcome' && joinedId) {
    const joined = results.find((entry) => entry.circle.id === joinedId)?.circle;

    return (
      <div className="pb-4">
        <ScreenHeader eyebrow="You're in" title={joined?.name ?? 'Your circle'} />

        <section className="mt-6 space-y-2.5 px-5">
          <div className="rounded-tile bg-surface p-4">
            <label htmlFor="welcome-name" className="text-[13px] font-medium text-ink">
              What should your circle call you?
            </label>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Optional. Without a name you appear as &ldquo;A member&rdquo;.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                id="welcome-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameSaved(false);
                }}
                placeholder="First name or nickname"
                className="w-full rounded-xl bg-overlay/[0.06] px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={!name.trim() || nameSaved}
                className="shrink-0 rounded-full bg-overlay/[0.08] px-4 text-[12px] font-medium text-ink disabled:opacity-50"
              >
                {nameSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <label htmlFor="welcome-reminders" className="block text-[13px] font-medium text-ink">
                Remind me before sessions
              </label>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                One nudge, ten minutes before. Never about streaks or who has sat.
              </p>
            </div>
            <Switch
              id="welcome-reminders"
              checked={reminders}
              onCheckedChange={(next) => void toggleReminders(next)}
            />
          </div>

          <p className="px-1 text-[11.5px] leading-relaxed text-ink-faint">
            When you sit — in the room or on your own — your circle sees that you sat. Never for
            how long or what. You can turn this off in the circle&apos;s settings.
          </p>

          {note ? <p className="px-1 text-[12px] text-ink-muted">{note}</p> : null}

          <GradientButton asChild className="mt-2 h-11 w-full text-[13px]">
            <Link href={{ pathname: '/circles/view', query: { id: joinedId } }}>
              Go to my circle
            </Link>
          </GradientButton>
        </section>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="pb-4">
        <ScreenHeader eyebrow="Chosen for your answers" title="Your circles" />

        <section className="mt-6 px-5">
          {results.length > 0 ? (
            <ul className="space-y-2.5">
              {results.map((entry) => (
                <RecommendationCard
                  key={entry.circle.id}
                  recommendation={entry}
                  joining={joiningId === entry.circle.id}
                  disabled={atLimit || (joiningId !== null && joiningId !== entry.circle.id)}
                  onJoin={() => void handleJoin(entry.circle.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-tile bg-surface px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-muted">
              {openCount === 0
                ? 'No circles are open to join right now. Check back soon.'
                : 'No circle meets at a good time for you yet. Try another time of day, or check back soon as new circles open.'}
            </p>
          )}

          {error ? <p className="mt-3 px-1 text-[12px] text-ink-muted">{error}</p> : null}
          {atLimit ? (
            <p className="mt-3 px-1 text-[12px] text-ink-muted">
              {circlesErrorMessage('too_many_circles')}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setStep('intake')}
            className="mt-5 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            Change my answers
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Three quick questions" title="Find your circle" />

      <section className="mt-6 space-y-6 px-5">
        <OptionRow label="What would help most?" options={goalOptions} value={goal} onChange={setGoal} />
        <OptionRow label="When can you usually sit?" options={timeOptions} value={time} onChange={setTime} />
        <OptionRow
          label="How much have you meditated?"
          options={experienceOptions}
          value={experience}
          onChange={setExperience}
        />
      </section>

      <section className="mt-8 px-5">
        <GradientButton
          type="button"
          onClick={() => void showCircles()}
          disabled={!goal || !time || !experience || finding}
          className="h-11 w-full gap-2 text-[13px]"
        >
          {finding ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
          Show me circles
        </GradientButton>
        {error ? <p className="mt-3 px-1 text-[12px] text-ink-muted">{error}</p> : null}
        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-ink-faint">
          Your answers stay on this phone. They are only used to suggest circles.
        </p>
      </section>

      <section className="mt-8 px-5">
        <SectionTitle>How circles work</SectionTitle>
        <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-muted">
          <li className="rounded-tile bg-surface px-4 py-3">
            A small group, never more than twenty, that sits at the same time.
          </li>
          <li className="rounded-tile bg-surface px-4 py-3">
            Join the room live, or sit on your own when you can. Both count.
          </li>
          <li className="rounded-tile bg-surface px-4 py-3">
            No leaderboards and no scores. The streak belongs to the whole circle.
          </li>
        </ul>
      </section>
    </div>
  );
}
