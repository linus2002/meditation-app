import { Loader2 } from 'lucide-react';

import { GradientButton } from '@/components/shared/gradient-button';
import { formatClock, goalLabels } from '@/lib/circles/format';
import type { Recommendation } from '@/lib/circles/matching';
import { formatMinutesLabel } from '@/lib/format';

/**
 * One suggested circle. It says why it was suggested — in the reader's own
 * time — and how many people are really in it. An empty circle says so.
 */
export function RecommendationCard({
  recommendation,
  onJoin,
  joining,
  disabled,
}: {
  recommendation: Recommendation;
  onJoin: () => void;
  joining: boolean;
  disabled?: boolean;
}) {
  const { circle, reasons, startsAt } = recommendation;
  const seatsLeft = circle.capacity - circle.memberCount;

  const lines = [
    `Meets at ${formatClock(startsAt)} your time · ${formatMinutesLabel(circle.durationSeconds)}`,
    reasons.includes('goal') ? goalLabels[circle.goal] : null,
    reasons.includes('beginner-friendly') ? 'Short enough to suit beginners' : null,
  ].filter(Boolean) as string[];

  return (
    <li className="rounded-tile bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold leading-tight text-ink">{circle.name}</p>
        <p className="shrink-0 text-[11px] text-ink-faint">
          {circle.memberCount === 0
            ? 'New circle'
            : `${circle.memberCount} ${circle.memberCount === 1 ? 'member' : 'members'}`}
        </p>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{circle.description}</p>

      <ul className="mt-2.5 space-y-1">
        {lines.map((line) => (
          <li key={line} className="text-[11.5px] leading-snug text-ink-soft">
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-[11px] text-ink-faint">
        {circle.memberCount === 0 ? 'Be one of the first' : `Room for ${seatsLeft} more`}
      </p>

      <GradientButton
        type="button"
        onClick={onJoin}
        disabled={joining || disabled}
        className="mt-3.5 h-10 w-full gap-2 text-[13px]"
      >
        {joining ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
        Join {circle.name}
      </GradientButton>
    </li>
  );
}
