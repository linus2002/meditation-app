'use client';

import * as React from 'react';

import { MemberAvatar } from '@/components/circles/member-avatar';
import type { ReportReason } from '@/lib/circles/api';
import type { FeedItem } from '@/lib/circles/feed';
import { formatAgo } from '@/lib/circles/format';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'unkind', label: 'Unkind' },
  { value: 'unsafe', label: 'Worrying' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

/**
 * The week in the circle: who joined, who sat, and what people answered.
 *
 * A sit reads "Maya sat" — never how long — and nobody appears for not
 * sitting. Answers carry a quiet way to mute or report; nothing else here can
 * be acted on, because there is nothing here to compete over.
 */
export function CircleFeed({
  items,
  now,
  onMute,
  onReport,
}: {
  items: FeedItem[];
  now: number;
  onMute: (userId: string) => void;
  onReport: (item: Extract<FeedItem, { kind: 'answered' }>, reason: ReportReason) => Promise<void>;
}) {
  const [reporting, setReporting] = React.useState<string | null>(null);
  const [reported, setReported] = React.useState<Set<string>>(new Set());

  if (items.length === 0) {
    return (
      <p className="rounded-tile bg-surface px-4 py-3.5 text-[12px] leading-relaxed text-ink-muted">
        Nothing yet this week. Sits and answers from your circle will appear here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex gap-3 rounded-tile bg-surface px-4 py-3">
          <MemberAvatar name={item.isSelf ? 'You' : item.name === 'A member' || item.name === 'A former member' ? null : item.name} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-snug text-ink">
              <span className="font-medium">{item.name}</span>{' '}
              <span className="text-ink-muted">
                {item.kind === 'joined'
                  ? 'joined the circle'
                  : item.kind === 'sat'
                    ? item.live
                      ? 'sat with the circle'
                      : 'sat'
                    : 'answered'}
              </span>
            </p>

            {item.kind === 'answered' ? (
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{item.body}</p>
            ) : null}

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[11px] text-ink-faint">{formatAgo(now - item.at)}</span>

              {item.kind === 'answered' && !item.isSelf ? (
                reported.has(item.key) ? (
                  <span className="text-[11px] text-ink-faint">Reported. Thank you.</span>
                ) : reporting === item.key ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {reasons.map((reason) => (
                      <button
                        key={reason.value}
                        type="button"
                        onClick={() => {
                          void onReport(item, reason.value).then(() => {
                            setReported((current) => new Set(current).add(item.key));
                            setReporting(null);
                          });
                        }}
                        className="rounded-full bg-overlay/[0.06] px-2.5 py-1 text-[11px] text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                      >
                        {reason.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReporting(null)}
                      className="text-[11px] text-ink-faint hover:text-ink"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onMute(item.userId)}
                      className="text-[11px] text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                    >
                      Hide their answers
                    </button>
                    <button
                      type="button"
                      onClick={() => setReporting(item.key)}
                      className="text-[11px] text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70"
                    >
                      Report
                    </button>
                  </>
                )
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
