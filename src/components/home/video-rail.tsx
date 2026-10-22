'use client';

import * as React from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import { VideoFeed } from '@/components/home/video-feed';
import { homeVideos, type HomeVideo } from '@/data/videos';

/**
 * Short portrait videos, above the group banner. Runs the full width of the
 * screen: a title on the canvas with a blue glow in its top-right corner, then
 * a row of cards, straight on the canvas, that swipes sideways.
 *
 * Each clip plays silently on a loop while it is on screen and pauses once it
 * scrolls away, so the rail never spends data or battery out of sight. Small
 * controls on each card bring the sound up (one card speaks at a time), pause
 * it, or open the full-screen feed, which swipes from clip to clip. Readers who
 * ask for reduced motion get the still until they press play.
 */
export function VideoRail() {
  // The card whose sound is on, if any.
  const [audibleId, setAudibleId] = React.useState<string | null>(null);
  // The feed, when open: which clip it opened on, and where that card had got to.
  const [expanded, setExpanded] = React.useState<{ index: number; from: number } | null>(null);
  const closeExpanded = React.useCallback(() => setExpanded(null), []);

  return (
    <section aria-labelledby="video-rail-title" className="relative overflow-hidden">
      {/* Blue glow behind the title, from the top-right corner. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(29,159,218,0.55)_0%,rgba(29,159,218,0.18)_45%,rgba(29,159,218,0)_70%)] blur-2xl"
      />

      {/* pt-1: the section clips its glow, so give the first line's ascenders room. */}
      <div className="relative px-5 pt-1">
        <p className="text-body-sm font-semibold leading-none text-[#1D9FDA]">Watch &amp; unwind</p>
        <h2
          id="video-rail-title"
          className="mt-2 max-w-[17rem] text-balance text-[clamp(1.1875rem,5.4vw,1.375rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-ink"
        >
          Short videos for a quieter mind.
        </h2>
      </div>

      <div className="relative mt-5">
        <h3 className="relative px-5 text-[0.9375rem] font-semibold leading-tight text-ink">
          Latest videos
        </h3>

        <ul className="rail relative mt-3 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5">
          {homeVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              audible={audibleId === video.id}
              suspended={expanded !== null}
              onToggleSound={() => setAudibleId((current) => (current === video.id ? null : video.id))}
              onExpand={(from) => {
                setAudibleId(null);
                setExpanded({ index, from });
              }}
            />
          ))}
        </ul>
      </div>

      {expanded ? (
        <VideoFeed
          videos={homeVideos}
          startIndex={expanded.index}
          startAt={expanded.from}
          onClose={closeExpanded}
        />
      ) : null}
    </section>
  );
}

/** Icon-only control: small, plain white, no backing or shadow. */
function ControlButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex h-8 w-8 items-center justify-center text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      {children}
    </button>
  );
}

function VideoCard({
  video,
  audible,
  suspended,
  onToggleSound,
  onExpand,
}: {
  video: HomeVideo;
  audible: boolean;
  /** The feed is open: every card holds still underneath. */
  suspended: boolean;
  onToggleSound: () => void;
  onExpand: (from: number) => void;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  // What the reader asked for with the pause button; null leaves it to scrolling.
  const [intent, setIntent] = React.useState<'play' | 'pause' | null>(null);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.6,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Play while on screen, unless paused by hand or open full screen.
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.muted = !audible;
    const wanted = intent === 'play' || (intent === null && (audible || !reducedMotion));
    if (visible && wanted && !suspended) void node.play().catch(() => {});
    else node.pause();
  }, [visible, audible, reducedMotion, intent, suspended]);

  const iconClass = 'h-4 w-4';

  return (
    <li className="relative aspect-[9/16] w-[44vw] max-w-[184px] shrink-0 snap-start overflow-hidden rounded-[12px] bg-overlay/[0.06] ring-1 ring-overlay/[0.08]">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Shade at the top for the title, and a lighter one under the controls. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2/5 bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/4 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_100%)]"
      />

      <div className="pointer-events-none absolute inset-x-3 top-3">
        <p className="text-body-sm font-semibold leading-tight text-white">{video.title}</p>
        {/* 11px: a deliberate exception to the app's 12px `label` floor, asked for
            so the running time sits well back from the title. */}
        <p className="mt-1 text-[0.6875rem] font-light leading-none text-white/70">{video.eyebrow}</p>
      </div>

      {/* Anywhere on the card opens the feed; the small controls sit above this. */}
      <button
        type="button"
        onClick={() => onExpand(ref.current?.currentTime ?? 0)}
        aria-label={`Open ${video.title}`}
        className="absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      />

      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
        <ControlButton
          label={audible ? `Mute ${video.title}` : `Turn on sound for ${video.title}`}
          pressed={audible}
          onClick={onToggleSound}
        >
          {audible ? (
            <Volume2 className={iconClass} strokeWidth={2} />
          ) : (
            <VolumeX className={iconClass} strokeWidth={2} />
          )}
        </ControlButton>
        <div className="flex items-center">
          <ControlButton
            label={playing ? `Pause ${video.title}` : `Play ${video.title}`}
            onClick={() => setIntent(playing ? 'pause' : 'play')}
          >
            {playing ? (
              <Pause className={iconClass} strokeWidth={2} />
            ) : (
              <Play className={iconClass} strokeWidth={2} />
            )}
          </ControlButton>
          <ControlButton
            label={`Watch ${video.title} full screen`}
            onClick={() => onExpand(ref.current?.currentTime ?? 0)}
          >
            <Maximize2 className={iconClass} strokeWidth={2} />
          </ControlButton>
        </div>
      </div>
    </li>
  );
}
