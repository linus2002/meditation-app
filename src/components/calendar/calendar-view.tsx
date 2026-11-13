'use client';

import * as React from 'react';
import Link from 'next/link';
import { BellOff, BellRing, CalendarPlus, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

import { ScheduleSheet } from '@/components/calendar/schedule-sheet';
import { ScheduleThumb } from '@/components/calendar/schedule-thumb';
import { ScreenHeader } from '@/components/layout/screen-header';
import { useUndo } from '@/components/layout/undo-toast';
import { getMeditation } from '@/data/meditations';
import { scheduleItemDetails, scheduleKindLabel } from '@/data/schedule-items';
import { getYogaSession } from '@/data/yoga';
import { useReminders } from '@/hooks/use-reminders';
import { useSchedule, type NewSchedule } from '@/hooks/use-schedule';
import { fromDateKey, toDateKey } from '@/lib/date';
import { formatMinutesLabel } from '@/lib/format';
import {
  formatTime12,
  monthGrid,
  occursOn,
  repeatLabel,
  scheduleUrl,
  schedulesOn,
} from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const navButton =
  'flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/** "Today", "Tomorrow", or "Friday, 20 November". */
function dayHeading(key: string, today: string): string {
  const tomorrow = toDateKey(new Date(fromDateKey(today).getTime() + 36 * 60 * 60 * 1000));
  const long = fromDateKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  if (key === today) return `Today · ${long}`;
  if (key === tomorrow) return `Tomorrow · ${long}`;
  return long;
}

/**
 * The calendar: a month of scheduled sessions (dots) and days actually
 * practised (ticks), the selected day's plan underneath, and a way to schedule
 * something new with a notification when it's due.
 */
export function CalendarView() {
  const today = toDateKey(new Date());
  const [cursor, setCursor] = React.useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = React.useState(today);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const { schedules, add, remove, restore } = useSchedule();
  const { sessions } = useApp();
  const { permission, mode, inApp, allow } = useReminders();
  const offerUndo = useUndo();

  const practisedDays = React.useMemo(
    () => new Set(sessions.filter((s) => s.completed).map((s) => s.date)),
    [sessions],
  );

  const weeks = monthGrid(cursor.year, cursor.month);
  const monthTitle = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(today);
  };

  const dayPlan = schedulesOn(schedules, selected);
  const dayDone = sessions.filter((s) => s.completed && s.date === selected);
  const doneIds = new Set(dayDone.map((s) => s.meditationId));

  const saveSchedule = async (entry: NewSchedule) => {
    // Inside the Save tap: the only moment a browser will show its prompt.
    if (permission === 'prompt') await allow();
    add(entry);
    setSelected(entry.date);
    const date = fromDateKey(entry.date);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  };

  return (
    <div className="pb-6">
      <ScreenHeader
        eyebrow="Plan your practice"
        title="Calendar"
        action={
          <button type="button" onClick={goToday} className="-mt-1 rounded-full px-3 py-1.5 text-caption font-medium text-ink-soft hover:bg-overlay/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70">
            Today
          </button>
        }
      />

      <div className="mt-5 px-4">
        <div className="flex items-center justify-between px-1">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className={navButton}>
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <h2 className="text-body-sm font-semibold text-ink" aria-live="polite">
            {monthTitle}
          </h2>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className={navButton}>
            <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div role="grid" aria-label={monthTitle} className="mt-3">
          <div role="row" className="grid grid-cols-7">
            {WEEKDAYS.map((day, index) => (
              <span key={index} role="columnheader" className="pb-2 text-center text-label font-medium text-ink-faint">
                {day}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} role="row" className="grid grid-cols-7">
              {week.map((key, dayIndex) => {
                if (!key) return <span key={dayIndex} role="gridcell" />;
                const planned = schedules.some((entry) => occursOn(entry, key));
                const practised = practisedDays.has(key);
                const isSelected = key === selected;
                const isToday = key === today;
                return (
                  <span key={key} role="gridcell" className="flex justify-center py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      aria-pressed={isSelected}
                      aria-label={`${fromDateKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${planned ? ', sessions scheduled' : ''}${practised ? ', practised' : ''}`}
                      className={cn(
                        'relative flex h-11 w-11 flex-col items-center justify-center rounded-full text-body-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                        isSelected
                          ? 'bg-aurora-blue font-semibold text-white'
                          : isToday
                            ? 'font-semibold text-ink ring-1 ring-inset ring-overlay/40'
                            : key < today
                              ? 'text-ink-muted hover:bg-overlay/[0.06]'
                              : 'text-ink hover:bg-overlay/[0.06]',
                      )}
                    >
                      {fromDateKey(key).getDate()}
                      <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                        {planned ? (
                          <span className={cn('h-1 w-1 rounded-full', isSelected ? 'bg-white' : 'bg-aurora-blue')} />
                        ) : null}
                        {practised ? (
                          <span className={cn('h-1 w-1 rounded-full', isSelected ? 'bg-white/70' : 'bg-aurora-green')} />
                        ) : null}
                      </span>
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-label text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-blue" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-green" /> Practised
          </span>
        </div>
      </div>

      <NotificationNote permission={permission} mode={mode} inApp={inApp} onAllow={() => void allow()} />

      <section className="mt-6 px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-body-sm font-semibold text-ink">{dayHeading(selected, today)}</h2>
        </div>

        {dayPlan.length === 0 && dayDone.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface px-4 py-4 text-center text-caption leading-relaxed text-ink-muted">
            {selected < today ? 'Nothing was planned or practised this day.' : 'Nothing planned yet.'}
          </p>
        ) : null}

        {dayPlan.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {dayPlan.map((entry) => {
              const item = scheduleItemDetails(entry.kind, entry.itemId);
              if (!item) return null;
              const done = doneIds.has(entry.itemId);
              return (
                <li key={entry.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2.5">
                  <ScheduleThumb item={item} className="h-12 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label font-semibold tabular-nums text-ink-soft">
                      {formatTime12(entry.time)} · {repeatLabel(entry)}
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm font-medium text-ink">{item.title}</span>
                    <span className="block truncate text-label text-ink-muted">
                      {scheduleKindLabel[entry.kind]} · {formatMinutesLabel(item.seconds)}
                    </span>
                  </span>
                  {done ? (
                    <span className="flex h-8 items-center gap-1 rounded-full bg-overlay/[0.06] px-2.5 text-label font-medium text-ink-soft">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Done
                    </span>
                  ) : selected === today ? (
                    <Link
                      href={scheduleUrl(entry)}
                      className="solid-button flex h-8 shrink-0 items-center rounded-full px-3 text-label font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                    >
                      Start
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      remove(entry.id);
                      offerUndo({
                        message: entry.repeat === 'once' ? `${item.title} unscheduled` : `${item.title} · ${repeatLabel(entry).toLowerCase()} removed`,
                        undo: () => restore(entry),
                      });
                    }}
                    aria-label={entry.repeat === 'once' ? `Remove ${item.title} from the schedule` : `Remove ${item.title}, ${repeatLabel(entry).toLowerCase()}`}
                    className={navButton}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {dayDone.length > 0 ? (
          <>
            <h3 className="mt-5 text-label font-medium uppercase tracking-wide text-ink-faint">Practised</h3>
            <ul className="mt-2 space-y-1.5">
              {dayDone.map((record) => {
                const title =
                  getMeditation(record.meditationId)?.title ??
                  getYogaSession(record.meditationId)?.title ??
                  'Unguided sit';
                return (
                  <li key={record.id} className="flex items-center gap-2.5 text-caption text-ink-soft">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aurora-green/20 text-aurora-green">
                      <Check className="h-3 w-3" strokeWidth={2.4} />
                    </span>
                    <span className="truncate">{title}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-ink-muted">
                      {Math.max(1, Math.round(record.seconds / 60))} min
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="solid-button mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-body-sm font-medium transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Schedule a session
        </button>
      </section>

      <ScheduleSheet open={sheetOpen} onOpenChange={setSheetOpen} defaultDate={selected} onSave={saveSchedule} />
    </div>
  );
}

/** Says plainly whether the notifications for scheduled sessions can arrive. */
function NotificationNote({
  permission,
  mode,
  inApp,
  onAllow,
}: {
  permission: string;
  mode: string;
  inApp: boolean;
  onAllow: () => void;
}) {
  let text: string;
  let action: React.ReactNode = null;
  let Icon = BellRing;

  if (mode === 'unsupported') {
    Icon = BellOff;
    text = inApp
      ? 'Notifications aren’t available in this version of the app.'
      : 'This browser can’t show notifications, so scheduled sessions won’t alert you.';
  } else if (permission === 'denied') {
    Icon = BellOff;
    text = inApp
      ? 'Notifications are turned off for Serenity. Turn them on in your phone’s settings to be alerted.'
      : 'Notifications are blocked for this site. Allow them in your browser settings to be alerted.';
  } else if (permission === 'prompt') {
    text = 'Allow notifications so scheduled sessions can alert you.';
    action = (
      <button
        type="button"
        onClick={onAllow}
        className="shrink-0 rounded-full bg-overlay/[0.08] px-3 py-1.5 text-label font-medium text-ink hover:bg-overlay/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
      >
        Allow
      </button>
    );
  } else if (mode === 'web') {
    text = 'Alerts arrive while Serenity is open in this browser. Install the app to get them any time.';
  } else {
    return null;
  }

  return (
    <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.8} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-label leading-relaxed text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
