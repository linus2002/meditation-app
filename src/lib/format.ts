/** 930 -> "15:30" — used by the player scrubber and session timers. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** 1800 -> "30 Min." — matches the label treatment on the Daily Goals card. */
export function formatMinutesLabel(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)} Min.`;
}

/** 300 -> "5m" — the compact form used on the home rails. */
export function formatShortMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)}m`;
}

/** 0.72 -> "72%" */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** 1240 -> "20h 40m" — used for lifetime totals on the profile screen. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Builds an SVG arc path. Angles are degrees measured clockwise from 12 o'clock,
 * which keeps the progress ring on the activities screen easy to reason about.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  sweepAngle: number,
): string {
  const sweep = clamp(sweepAngle, 0.01, 359.99);
  const toPoint = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const start = toPoint(startAngle);
  const end = toPoint(startAngle + sweep);
  const largeArc = sweep > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}
