import { MemberAvatar } from '@/components/circles/member-avatar';
import type { PresentMember } from '@/hooks/use-circle-presence';
import { cn } from '@/lib/utils';

/**
 * Who is in the room right now — only people actually connected. Nobody is
 * shown as missing, and an empty room says so plainly.
 */
export function HereNow({
  present,
  connected,
  selfId,
  className,
}: {
  present: PresentMember[];
  connected: boolean;
  selfId?: string | null;
  className?: string;
}) {
  if (!connected) {
    return <p className={cn('text-[11.5px] text-ink-faint', className)}>Checking who is here…</p>;
  }

  if (present.length === 0) {
    return (
      <p className={cn('text-[11.5px] leading-relaxed text-ink-faint', className)}>
        No one here yet. The session starts on time either way.
      </p>
    );
  }

  const others = present.filter((member) => member.userId !== selfId).length;
  const includesSelf = present.length !== others;
  const label = includesSelf
    ? others === 0
      ? 'Just you so far'
      : `You and ${others} ${others === 1 ? 'other' : 'others'} here now`
    : `${present.length} here now`;

  return (
    <div className={cn('flex items-center gap-3', className)} aria-live="polite">
      <div className="flex -space-x-2">
        {present.slice(0, 6).map((member) => (
          <MemberAvatar
            key={member.userId}
            name={member.userId === selfId ? 'You' : member.name}
            className="h-7 w-7 text-[11px]"
          />
        ))}
      </div>
      <p className="text-[12px] text-ink-muted">{label}</p>
    </div>
  );
}
