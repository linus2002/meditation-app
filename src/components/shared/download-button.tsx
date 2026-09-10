'use client';

import { ArrowDownToLine, Check, Loader2 } from 'lucide-react';

import { useDownloads } from '@/hooks/use-downloads';
import { cn } from '@/lib/utils';

interface DownloadButtonProps {
  meditationId: string;
  title: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Saves a session to the device, or gives it back.
 *
 * Hidden entirely where saving means nothing: a native build already carries
 * every file, and a browser with no service worker has nowhere to put them. An
 * always-visible control that silently does nothing on half the platforms is
 * the sort of thing that teaches people not to trust the rest of the app.
 */
export function DownloadButton({
  meditationId,
  title,
  className,
  size = 'sm',
}: DownloadButtonProps) {
  const { support, isSaved, isBusy, save, remove } = useDownloads();

  if (support !== 'available') return null;

  const saved = isSaved(meditationId);
  const busy = isBusy(meditationId);
  const dimension = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={
        busy
          ? `Working on ${title}`
          : saved
            ? `Remove the offline copy of ${title}`
            : `Save ${title} for offline`
      }
      disabled={busy}
      onClick={() => (saved ? void remove(meditationId) : void save(meditationId))}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 disabled:hover:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className,
      )}
    >
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="download-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3FD9C9" />
            <stop offset="52%" stopColor="#7CA9E8" />
            <stop offset="100%" stopColor="#F07BC8" />
          </linearGradient>
        </defs>
      </svg>

      {busy ? (
        <Loader2 className={cn(dimension, 'animate-spin text-ink-muted')} strokeWidth={1.8} />
      ) : saved ? (
        <Check className={dimension} strokeWidth={2} stroke="url(#download-gradient)" />
      ) : (
        <ArrowDownToLine
          className={dimension}
          strokeWidth={1.8}
          stroke="rgb(var(--nav-idle))"
        />
      )}
    </button>
  );
}
