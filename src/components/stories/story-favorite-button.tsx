'use client';

import { Heart } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

interface StoryFavoriteButtonProps {
  storyId: string;
  title: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** The gradient heart, matching the one used for sessions. */
export function StoryFavoriteButton({
  storyId,
  title,
  size = 'sm',
  className,
}: StoryFavoriteButtonProps) {
  const { isFavoriteStory, toggleFavoriteStory, hydrated } = useApp();
  const saved = hydrated && isFavoriteStory(storyId);

  return (
    <button
      type="button"
      onClick={() => toggleFavoriteStory(storyId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
        size === 'md' ? 'h-10 w-10' : 'h-9 w-9',
        className,
      )}
    >
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="story-heart-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3FD9C9" />
            <stop offset="52%" stopColor="#7CA9E8" />
            <stop offset="100%" stopColor="#F07BC8" />
          </linearGradient>
        </defs>
      </svg>
      <Heart
        className={size === 'md' ? 'h-[21px] w-[21px]' : 'h-[19px] w-[19px]'}
        strokeWidth={1.8}
        stroke={saved ? 'url(#story-heart-gradient)' : 'rgb(var(--nav-idle))'}
        fill={saved ? 'url(#story-heart-gradient)' : 'none'}
      />
    </button>
  );
}
