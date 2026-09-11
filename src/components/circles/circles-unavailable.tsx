import { CloudOff, Users } from 'lucide-react';

/**
 * Shown in place of Circles when this build has no Supabase keys, or when the
 * device is offline and there is nothing cached to show.
 */
export function CirclesUnavailable({ reason = 'unconfigured' }: { reason?: 'unconfigured' | 'offline' }) {
  const offline = reason === 'offline';
  const Icon = offline ? CloudOff : Users;

  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-overlay/[0.06]">
        <Icon className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-[15px] font-medium text-ink">
        {offline ? 'You are offline' : 'Circles is not available yet'}
      </p>
      <p className="mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-ink-muted">
        {offline
          ? 'Circles needs a connection to see who else is sitting. Everything else in Serenity works as usual.'
          : 'This build of Serenity is not connected to Circles. Everything else works as usual.'}
      </p>
    </div>
  );
}
