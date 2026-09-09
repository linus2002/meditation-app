import { cn } from '@/lib/utils';

/**
 * Purely decorative marks lifted from the reference artwork. All of them are
 * `aria-hidden` — they carry no meaning and must never reach a screen reader.
 */

/** The faint pair of long curves sweeping across the top of the intro screen. */
export function WaveLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 260"
      fill="none"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute select-none', className)}
    >
      <path
        d="M-30 176C40 176 86 116 150 82C214 48 286 44 420 78"
        stroke="rgba(255,255,255,0.085)"
        strokeWidth="1.1"
      />
      <path
        d="M-30 214C46 214 96 146 164 110C232 74 300 72 420 106"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1.1"
      />
      <path
        d="M-30 250C52 250 108 176 178 138C248 100 312 100 420 134"
        stroke="rgba(255,255,255,0.035)"
        strokeWidth="1.1"
      />
    </svg>
  );
}

/** The row of leaning bars sitting above the headline on the intro screen. */
export function DiagonalSlashes({ className }: { className?: string }) {
  const bars = [0, 1, 2, 3, 4, 5];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 196 72"
      fill="none"
      className={cn('pointer-events-none absolute select-none', className)}
    >
      {bars.map((index) => {
        const x = 12 + index * 34;
        return (
          <line
            key={index}
            x1={x + 15}
            y1={9}
            x2={x - 15}
            y2={63}
            stroke="rgb(var(--ink-faint))"
            strokeOpacity={0.46}
            strokeWidth={11}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** The soft curves hugging the right edge of the activities screen. */
export function EdgeCurves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 320"
      fill="none"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute select-none', className)}
    >
      <path
        d="M132 -10C96 46 70 96 74 158C78 220 108 268 138 320"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1.1"
      />
      <path
        d="M150 -10C112 52 84 104 88 166C92 228 124 276 154 328"
        stroke="rgba(255,255,255,0.045)"
        strokeWidth="1.1"
      />
    </svg>
  );
}

/** The stitched half-ring tucked into the bottom-left of the activities screen. */
export function StitchArc({ className }: { className?: string }) {
  const ticks = Array.from({ length: 26 }, (_, index) => index);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      fill="none"
      className={cn('pointer-events-none absolute select-none', className)}
    >
      <g>
        {ticks.map((index) => {
          const angle = (-70 + index * 4.4) * (Math.PI / 180);
          const inner = 62;
          const outer = 72;
          return (
            <line
              key={index}
              x1={80 + inner * Math.cos(angle)}
              y1={80 + inner * Math.sin(angle)}
              x2={80 + outer * Math.cos(angle)}
              y2={80 + outer * Math.sin(angle)}
              stroke="#7A3560"
              strokeOpacity={0.18}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}
