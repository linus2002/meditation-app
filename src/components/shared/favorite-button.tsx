'use client';

import { Heart } from 'lucide-react';

import { useApp } from '@/providers/app-provider';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  meditationId: string;
  title: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Toggles a session in the saved list, reusing the nav's gradient when active. */
export function FavoriteButton({
  meditationId,
  title,
  className,
  size = 'sm',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useApp();
  const active = isFavorite(meditationId);
  const dimension = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => toggleFavorite(meditationId)}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className,
      )}
    >
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="favorite-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3FD9C9" />
            <stop offset="52%" stopColor="#7CA9E8" />
            <stop offset="100%" stopColor="#F07BC8" />
          </linearGradient>
        </defs>
      </svg>
      <Heart
        className={dimension}
        strokeWidth={1.8}
        stroke={active ? 'url(#favorite-gradient)' : 'rgb(var(--nav-idle))'}
        fill={active ? 'url(#favorite-gradient)' : 'none'}
      />
    </button>
  );
}
