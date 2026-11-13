'use client';

import * as React from 'react';
import { Check, Search } from 'lucide-react';

import { ScheduleThumb } from '@/components/calendar/schedule-thumb';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { scheduleCatalogue, scheduleKindLabel } from '@/data/schedule-items';
import type { NewSchedule } from '@/hooks/use-schedule';
import { fromDateKey, toDateKey } from '@/lib/date';
import { formatMinutesLabel } from '@/lib/format';
import { occurrenceAt, repeatLabel, type ScheduleKind, type ScheduleRepeat } from '@/lib/schedule';
import { cn } from '@/lib/utils';

const KINDS: ScheduleKind[] = ['meditation', 'story', 'yoga'];

const pill = (on: boolean) =>
  cn(
    'rounded-full px-3.5 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
    on ? 'bg-aurora-blue text-white' : 'bg-overlay/[0.06] text-ink-muted hover:text-ink',
  );

const field =
  'h-11 w-full rounded-2xl bg-surface px-4 text-body-sm text-ink [color-scheme:dark] [[data-theme=light]_&]:[color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70';

/** The next quarter hour from now, as `HH:MM`. */
function soonTime(now: Date): string {
  const next = new Date(now.getTime() + 15 * 60 * 1000);
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

/**
 * Picks what to schedule, when, and how often. Saving asks for notification
 * permission first if it hasn't been decided yet (inside the tap, which is the
 * only time a browser will show the prompt).
 */
export function ScheduleSheet({
  open,
  onOpenChange,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  onSave: (entry: NewSchedule) => Promise<void> | void;
}) {
  const [kind, setKind] = React.useState<ScheduleKind>('meditation');
  const [itemId, setItemId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [date, setDate] = React.useState(defaultDate);
  const [time, setTime] = React.useState('07:00');
  const [repeat, setRepeat] = React.useState<ScheduleRepeat>('once');
  const [error, setError] = React.useState<string | null>(null);
  const today = toDateKey(new Date());

  // Fresh form each time it opens, on the day the calendar has selected.
  React.useEffect(() => {
    if (!open) return;
    const start = defaultDate < today ? today : defaultDate;
    setDate(start);
    setTime(start === today ? soonTime(new Date()) : '07:00');
    setItemId(null);
    setQuery('');
    setRepeat('once');
    setError(null);
  }, [open, defaultDate, today]);

  const catalogue = React.useMemo(() => scheduleCatalogue(kind), [kind]);
  const q = query.trim().toLowerCase();
  const shown = q ? catalogue.filter((item) => item.title.toLowerCase().includes(q)) : catalogue;
  const chosen = catalogue.find((item) => item.id === itemId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId) {
      setError('Choose what to schedule.');
      return;
    }
    const entry: NewSchedule = { kind, itemId, date, time, repeat };
    if (repeat === 'once' && occurrenceAt({ ...entry, id: '', createdAt: 0 }, date).getTime() <= Date.now()) {
      setError('That time has already passed — pick a later time.');
      return;
    }
    await onSave(entry);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto border-none bg-canvas px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3 text-ink"
      >
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-overlay/30" />
        <SheetTitle className="mt-5 text-[1.25rem] font-semibold leading-tight">Schedule a session</SheetTitle>
        <SheetDescription className="mt-1 text-caption leading-relaxed text-ink-muted">
          You’ll get a notification at that time. Tap it to start.
        </SheetDescription>

        <form onSubmit={save} className="mt-5">
          <div role="tablist" aria-label="What to schedule" className="flex gap-2">
            {KINDS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={kind === value}
                onClick={() => {
                  setKind(value);
                  setItemId(null);
                  setQuery('');
                }}
                className={pill(kind === value)}
              >
                {scheduleKindLabel[value]}
              </button>
            ))}
          </div>

          <label className="mt-3 flex h-10 items-center gap-2 rounded-xl bg-surface px-3">
            <Search className="h-4 w-4 text-ink-faint" strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${scheduleKindLabel[kind].toLowerCase()}`}
              className="min-w-0 flex-1 bg-transparent text-body-sm text-ink placeholder:text-ink-faint focus-visible:outline-none"
            />
          </label>

          <ul role="listbox" aria-label={`${scheduleKindLabel[kind]} to schedule`} className="mt-2 max-h-[200px] space-y-1 overflow-y-auto">
            {shown.map((item) => {
              const selected = item.id === itemId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setItemId(item.id);
                      setError(null);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                      selected ? 'bg-overlay/[0.1]' : 'hover:bg-overlay/[0.06]',
                    )}
                  >
                    <ScheduleThumb item={item} className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm text-ink">{item.title}</span>
                      <span className="block text-label text-ink-muted">{formatMinutesLabel(item.seconds)}</span>
                    </span>
                    {selected ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-aurora-blue text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
            {shown.length === 0 ? (
              <li className="px-2 py-3 text-center text-caption text-ink-muted">Nothing matches “{query}”.</li>
            ) : null}
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-label text-ink-muted">Date</span>
              <input
                type="date"
                required
                value={date}
                min={today}
                onChange={(event) => {
                  setDate(event.target.value);
                  setError(null);
                }}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-label text-ink-muted">Time</span>
              <input
                type="time"
                required
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  setError(null);
                }}
                className={field}
              />
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-label text-ink-muted">Repeat</legend>
            <div className="flex flex-wrap gap-2">
              {(['once', 'daily', 'weekdays', 'weekly'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={repeat === value}
                  onClick={() => setRepeat(value)}
                  className={pill(repeat === value)}
                >
                  {repeatLabel({ repeat: value, date: date || today })}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="mt-3 text-caption text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="solid-button mt-5 h-12 w-full rounded-full text-body-sm font-medium transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
          >
            {chosen
              ? `Schedule ${chosen.title} · ${fromDateKey(date || today).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Schedule'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
