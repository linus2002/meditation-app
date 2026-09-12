'use client';

import * as React from 'react';
import Link from 'next/link';
import { CalendarHeart, ChevronRight, X } from 'lucide-react';

import { ScreenHeader } from '@/components/layout/screen-header';
import { GradientButton } from '@/components/shared/gradient-button';
import { SectionTitle } from '@/components/shared/section-title';
import {
  DraftNotice,
  LargeTextToggle,
  SupportDisclaimer,
  SupportUnavailable,
} from '@/components/support/support-parts';
import {
  appointmentCopy,
  appointmentKinds,
  getSupportSession,
  supportMoments,
  supportSessions,
  type AppointmentKind,
} from '@/data/support-track';
import { useSupport } from '@/hooks/use-support';
import { addDays, relativeDayLabel, toDateKey } from '@/lib/date';
import { formatMinutesLabel } from '@/lib/format';
import {
  appointmentSuggestions,
  upcomingAppointments,
  type DateProblem,
} from '@/lib/support-appointments';
import { supportTrackEnabled } from '@/lib/support-track';
import { cn } from '@/lib/utils';

const dateProblemCopy: Record<DateProblem, string> = {
  invalid: 'Choose a date.',
  past: 'Choose today or a date after it.',
  'too-far': 'That date is more than a year away. Check it and try again.',
};

/**
 * The way into the track, built for a hard day.
 *
 * If the reader has added an appointment for today or tomorrow, the session
 * made for it comes first. Otherwise it asks one question — where are you
 * right now? — and every answer is a large target that leads to a single
 * Start button. No searching, and nothing to count or keep up with.
 */
export function SupportHub() {
  const support = useSupport();

  // Resolved on the client; the page is prerendered.
  const [todayKey, setTodayKey] = React.useState<string | null>(null);
  React.useEffect(() => setTodayKey(toDateKey(new Date())), []);

  if (!supportTrackEnabled) {
    return (
      <div className="pb-4">
        <ScreenHeader title="Support" />
        <SupportUnavailable />
      </div>
    );
  }

  const anyDraft = supportSessions.some((session) => session.review === 'draft');
  const recent = support.history.slice(0, 3);
  // Today's date once the stored appointments have been read; null until then.
  const readyKey = support.hydrated ? todayKey : null;
  const suggestions = readyKey
    ? appointmentSuggestions(support.appointments, readyKey).slice(0, 2)
    : [];
  const upcoming = readyKey ? upcomingAppointments(support.appointments, readyKey) : [];

  const moments = (audience: 'patient' | 'caregiver') =>
    supportMoments.filter((moment) => moment.audience === audience);

  return (
    <div className="pb-4">
      <ScreenHeader
        eyebrow="For people in and after treatment"
        title="Support during cancer"
        action={
          <LargeTextToggle
            on={support.largeText}
            onToggle={() => support.setLargeText(!support.largeText)}
          />
        }
      />

      {/* Larger text scales the whole column, so layouts reflow rather than clip. */}
      <div style={support.largeText ? { zoom: 1.2 } : undefined}>
        {anyDraft ? <DraftNotice className="mx-5 mt-5" /> : null}

        {suggestions.length > 0 ? (
          <section className="mt-5 space-y-2.5 px-5">
            {suggestions.map((suggestion) => {
              const session = getSupportSession(suggestion.sessionId);
              const copy = appointmentCopy[suggestion.appointment.kind][suggestion.when];
              if (!session) return null;
              return (
                <div key={suggestion.appointment.id} className="rounded-tile bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <CalendarHeart className="h-4 w-4 text-ink-soft" strokeWidth={1.7} />
                    <p className="text-[11px] leading-none text-ink-faint">From your appointments</p>
                  </div>
                  <p className="mt-2.5 text-[17px] font-semibold leading-tight text-ink">
                    {copy.headline}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{copy.line}</p>
                  <GradientButton asChild className="mt-4 h-12 w-full text-[14px]">
                    <Link href={`/support/${session.id}`}>
                      {session.title} · {formatMinutesLabel(session.durationSeconds)}
                    </Link>
                  </GradientButton>
                </div>
              );
            })}
          </section>
        ) : null}

        <section className="mt-6 px-5">
          <SectionTitle>Where are you right now?</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {moments('patient').map((moment) => (
              <MomentRow key={moment.id} momentTitle={moment.title} sessionIds={moment.sessionIds} />
            ))}
          </ul>
        </section>

        <section className="mt-7 px-5">
          <SectionTitle>Supporting someone</SectionTitle>
          <ul className="mt-3 space-y-2.5">
            {moments('caregiver').map((moment) => (
              <MomentRow key={moment.id} momentTitle={moment.title} sessionIds={moment.sessionIds} />
            ))}
          </ul>
        </section>

        {readyKey ? (
          <AppointmentsSection
            todayKey={readyKey}
            upcoming={upcoming}
            onAdd={support.addAppointment}
            onRemove={support.removeAppointment}
          />
        ) : null}

        {support.hydrated && recent.length > 0 ? (
          <section className="mt-7 px-5">
            <SectionTitle>Just for you</SectionTitle>
            <ul className="mt-3 space-y-2">
              {recent.map((entry) => {
                const session = getSupportSession(entry.sessionId);
                if (!session) return null;
                return (
                  <li
                    key={`${entry.sessionId}-${entry.startedAt}`}
                    className="flex items-baseline justify-between gap-3 rounded-tile bg-surface px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-[13px] text-ink">{session.title}</span>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {relativeDayLabel(toDateKey(new Date(entry.startedAt)), new Date())}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-faint">
              Only you can see this. There are no streaks or goals here — come whenever it helps.
            </p>
          </section>
        ) : null}

        <section className="mt-7 px-5">
          <SupportDisclaimer />
        </section>
      </div>
    </div>
  );
}

/** One moment: its title, and a large link to each session made for it. */
function MomentRow({ momentTitle, sessionIds }: { momentTitle: string; sessionIds: string[] }) {
  const sessions = sessionIds
    .map(getSupportSession)
    .filter((session): session is NonNullable<typeof session> => Boolean(session));

  return (
    <li className="rounded-tile bg-surface">
      <p className="px-4 pt-3.5 text-[15px] font-semibold leading-tight text-ink">{momentTitle}</p>
      <ul className="mt-1 pb-1.5">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link
              href={`/support/${session.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-overlay/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug text-ink-soft">{session.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                  {formatMinutesLabel(session.durationSeconds)} · {session.forWho}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * "My appointments": add the date of a scan, results or chemo, and the right
 * session comes first on the day and the day before. Nothing else is asked
 * for — no times, no places, no names — and nothing leaves the phone.
 */
function AppointmentsSection({
  todayKey,
  upcoming,
  onAdd,
  onRemove,
}: {
  todayKey: string;
  upcoming: ReturnType<typeof upcomingAppointments>;
  onAdd: (kind: AppointmentKind, date: string) => DateProblem | null;
  onRemove: (id: string) => void;
}) {
  const [kind, setKind] = React.useState<AppointmentKind>('scan');
  const [date, setDate] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);

  const [year, month, day] = todayKey.split('-').map(Number);
  const tomorrowKey = toDateKey(addDays(new Date(year, month - 1, day), 1));
  const dayLabel = (key: string) =>
    key === tomorrowKey ? 'Tomorrow' : relativeDayLabel(key, new Date(year, month - 1, day));
  const kindLabel = (id: AppointmentKind) =>
    appointmentKinds.find((entry) => entry.id === id)?.label ?? id;

  const add = () => {
    const problem = onAdd(kind, date);
    if (problem) {
      setMessage(dateProblemCopy[problem]);
      return;
    }
    setDate('');
    setMessage(null);
  };

  return (
    <section className="mt-7 px-5">
      <SectionTitle>My appointments</SectionTitle>
      <div className="mt-3 rounded-tile bg-surface p-4">
        {upcoming.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {upcoming.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-overlay/[0.05] py-2 pl-3.5 pr-1.5"
              >
                <span className="text-[13px] text-ink">
                  {kindLabel(entry.kind)} · <span className="text-ink-muted">{dayLabel(entry.date)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`Remove ${kindLabel(entry.kind)} on ${dayLabel(entry.date)}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3.5 text-[12px] leading-relaxed text-ink-muted">
            Add the date of a scan, results or chemo, and the right session will be waiting at the
            top on the day and the day before.
          </p>
        )}

        <div role="radiogroup" aria-label="Kind of appointment" className="flex flex-wrap gap-2">
          {appointmentKinds.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={kind === entry.id}
              onClick={() => setKind(entry.id)}
              className={cn(
                'rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                kind === entry.id
                  ? 'bg-action-pill text-white'
                  : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label htmlFor="appointment-date" className="sr-only">
            Date
          </label>
          <input
            id="appointment-date"
            type="date"
            min={todayKey}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setMessage(null);
            }}
            className="min-w-0 flex-1 rounded-xl bg-overlay/[0.06] px-3.5 py-2.5 text-[13px] text-ink [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          />
          <button
            type="button"
            onClick={add}
            className="shrink-0 rounded-full bg-overlay/[0.08] px-5 text-[13px] font-medium text-ink hover:bg-overlay/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            Add
          </button>
        </div>

        {message ? (
          <p role="status" className="mt-2 text-[11.5px] text-ink-muted">
            {message}
          </p>
        ) : null}

        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          Only the date and kind are saved, on this phone. Past dates clear themselves.
        </p>
      </div>
    </section>
  );
}
