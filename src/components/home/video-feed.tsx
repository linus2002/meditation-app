'use client';

import * as React from 'react';
import { Heart, Play, Volume2, VolumeX, X } from 'lucide-react';

import type { HomeVideo } from '@/data/videos';
import { cn } from '@/lib/utils';

/*
 * Liked clips stay on this phone, like everything else the reader does here.
 * Storage can be unavailable (private mode, blocked site data), in which case a
 * like still shows for the visit and is simply not remembered.
 */
const LIKES_KEY = 'serenity.likedVideos.v1';

function readLikes(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LIKES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeLikes(ids: string[]): void {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered; the like still shows for this visit.
  }
}

/** Two taps closer together than this are a double tap. */
const DOUBLE_TAP_MS = 280;

const LIKE_RED = '#FF3B5C';

/**
 * The short videos as a full-screen vertical feed, the way TikTok shows them.
 *
 * Each clip fills the screen and the feed snaps one clip per swipe: up for the
 * next, down for the one before (arrow keys do the same). Only the clip in view
 * plays, with sound; the rest hold still. A tap pauses, a double tap likes and
 * leaves a heart where the finger landed, and the heart on the right likes or
 * unlikes outright. Escape closes it, and so does the phone's Back button,
 * which sends Escape to anything modal.
 *
 * It is the app's own overlay rather than the browser's fullscreen: the Android
 * shell refuses WebView fullscreen, so a native request does nothing there.
 */
export function VideoFeed({
  videos,
  startIndex,
  startAt,
  onClose,
}: {
  videos: HomeVideo[];
  startIndex: number;
  /** Where the tapped card had got to, so the feed carries on from there. */
  startAt: number;
  onClose: () => void;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(startIndex);
  const [muted, setMuted] = React.useState(false);
  const [liked, setLiked] = React.useState<string[]>([]);

  React.useEffect(() => setLiked(readLikes()), []);

  // A double tap only ever likes; the heart button toggles.
  const toggleLike = React.useCallback((id: string, likeOnly = false) => {
    setLiked((current) => {
      const has = current.includes(id);
      if (has && likeOnly) return current;
      const next = has ? current.filter((entry) => entry !== id) : [...current, id];
      writeLikes(next);
      return next;
    });
  }, []);

  // Some browsers refuse sound without a fresh tap; the feed then carries on silent.
  const onSoundBlocked = React.useCallback(() => setMuted(true), []);

  // Open on the clip that was tapped.
  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = startIndex * scroller.clientHeight;
  }, [startIndex]);

  // Whichever clip fills most of the screen is the one that plays.
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    scroller.querySelectorAll('[data-index]').forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        scroller.scrollBy({ top: step * scroller.clientHeight, behavior: 'smooth' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Videos" className="fixed inset-0 z-50 bg-black">
      <div
        ref={scrollerRef}
        className="rail h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {videos.map((video, index) => (
          <FeedSlide
            key={video.id}
            index={index}
            video={video}
            active={index === active}
            startAt={index === startIndex ? startAt : 0}
            muted={muted}
            liked={liked.includes(video.id)}
            onToggleLike={(likeOnly) => toggleLike(video.id, likeOnly)}
            onToggleMute={() => setMuted((current) => !current)}
            onSoundBlocked={onSoundBlocked}
          />
        ))}
      </div>

      {/* A fixed layer, so it clears the status bar itself. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center px-2 pt-[calc(env(safe-area-inset-top,0px)+6px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close videos"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function FeedSlide({
  index,
  video,
  active,
  startAt,
  muted,
  liked,
  onToggleLike,
  onToggleMute,
  onSoundBlocked,
}: {
  index: number;
  video: HomeVideo;
  active: boolean;
  startAt: number;
  muted: boolean;
  liked: boolean;
  onToggleLike: (likeOnly?: boolean) => void;
  onToggleMute: () => void;
  onSoundBlocked: () => void;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  // Paused by a tap. Cleared when the clip scrolls away, so it plays on return.
  const [held, setHeld] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [hearts, setHearts] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const lastTap = React.useRef(0);
  const tapTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(tapTimer.current), []);

  // Pick up where the card was, once the clip knows its length.
  React.useEffect(() => {
    const node = ref.current;
    if (!node || !startAt) return;
    const seek = () => {
      node.currentTime = startAt;
    };
    if (node.readyState >= 1) seek();
    else node.addEventListener('loadedmetadata', seek, { once: true });
  }, [startAt]);

  React.useEffect(() => {
    if (!active) setHeld(false);
  }, [active]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.muted = muted;
    if (!active || held) {
      node.pause();
      return;
    }
    void node.play().catch(() => {
      if (node.muted) return;
      onSoundBlocked();
      node.muted = true;
      void node.play().catch(() => {});
    });
  }, [active, held, muted, onSoundBlocked]);

  const onTap = (event: React.MouseEvent<HTMLButtonElement>) => {
    // A keyboard press has no position and no double: just pause or play.
    if (event.detail === 0) {
      setHeld((current) => !current);
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      onToggleLike(true);
      const box = event.currentTarget.getBoundingClientRect();
      const heart = { id: now, x: event.clientX - box.left, y: event.clientY - box.top };
      setHearts((current) => [...current, heart]);
      window.setTimeout(() => setHearts((current) => current.filter((h) => h.id !== heart.id)), 800);
      return;
    }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => setHeld((current) => !current), DOUBLE_TAP_MS);
  };

  return (
    <section
      data-index={index}
      aria-label={video.title}
      className="relative h-full w-full snap-start snap-always overflow-hidden"
    >
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        loop
        playsInline
        preload={active ? 'auto' : 'metadata'}
        onTimeUpdate={(event) => {
          const node = event.currentTarget;
          if (node.duration) setProgress(node.currentTime / node.duration);
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* The whole frame is the play/pause surface; a double tap on it likes. */}
      <button
        type="button"
        onClick={onTap}
        aria-label={held ? `Play ${video.title}` : `Pause ${video.title}`}
        className="absolute inset-0 h-full w-full focus-visible:outline-none"
      />

      {held && active ? (
        <Play
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 fill-white/80 text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        />
      ) : null}

      {hearts.map((heart) => (
        <Heart
          key={heart.id}
          aria-hidden="true"
          className="heart-pop pointer-events-none absolute h-24 w-24 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          style={{ left: heart.x, top: heart.y, color: LIKE_RED, fill: LIKE_RED }}
        />
      ))}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_100%)]"
      />

      {/* Actions down the right, as on TikTok. */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+40px)] right-2 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => onToggleLike()}
          aria-pressed={liked}
          aria-label={liked ? `Unlike ${video.title}` : `Like ${video.title}`}
          className="flex w-14 flex-col items-center gap-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Heart
            className="h-8 w-8"
            strokeWidth={liked ? 0 : 1.8}
            style={liked ? { color: LIKE_RED, fill: LIKE_RED } : undefined}
          />
          <span className="text-label font-medium leading-none">{liked ? 'Liked' : 'Like'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? 'Turn on sound' : 'Mute'}
          className="flex w-14 flex-col items-center gap-1 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {muted ? (
            <VolumeX className="h-7 w-7" strokeWidth={1.8} />
          ) : (
            <Volume2 className="h-7 w-7" strokeWidth={1.8} />
          )}
          <span className="text-label font-medium leading-none">{muted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom,0px)+24px)] left-4 right-20 text-white">
        <p className="text-[1.0625rem] font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
          {video.title}
        </p>
        <p className="mt-1 text-[0.6875rem] font-light leading-none text-white/75">{video.eyebrow}</p>
      </div>

      {/* How far through the clip, along the very bottom. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-[env(safe-area-inset-bottom,0px)] h-[2px] bg-white/20',
          !active && 'opacity-0',
        )}
      >
        <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}
