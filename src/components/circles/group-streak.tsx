import { Sprout } from 'lucide-react';

import { groupStreak, neededToday, quorumFor } from '@/lib/circles/streak';

/**
 * The circle's streak, and where today stands.
 *
 * Only ever about the group. It never names who has not sat, never says a
 * streak was lost, and a circle with no streak yet is "a fresh start".
 */
export function GroupStreak({
  days,
  todayKey,
  sittersToday,
  memberCount,
}: {
  days: string[];
  todayKey: string;
  sittersToday: number;
  memberCount: number;
}) {
  const streak = groupStreak(days, todayKey);
  const counted = days.includes(todayKey);
  const needed = neededToday(sittersToday, memberCount);
  const quorum = quorumFor(memberCount);

  const today = counted
    ? `Today counts. ${sittersToday} of you ${sittersToday === 1 ? 'has' : 'have'} sat.`
    : sittersToday === 0
      ? quorum === 1
        ? 'A day counts when someone in the circle sits.'
        : `A day counts when ${quorum} of you sit.`
      : `${sittersToday} ${sittersToday === 1 ? 'has' : 'have'} sat today. ${needed} more and today counts.`;

  return (
    <div className="flex items-start gap-3.5 rounded-tile bg-surface p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-overlay/[0.06]">
        <Sprout className="h-[18px] w-[18px] text-ink-soft" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-none text-ink-faint">Together</p>
        <p className="mt-1.5 text-[15px] font-semibold leading-tight text-ink">
          {streak === 0 ? 'A fresh start' : `${streak}-day circle streak`}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{today}</p>
      </div>
    </div>
  );
}
