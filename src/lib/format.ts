/** 930 -> "15:30" — used by the player scrubber and session timers. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 312 -> "5 minutes 12 seconds" — how a screen reader should say a clock, which
 * it would otherwise read as "312" or "five colon twelve".
 */
export function formatSpokenTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const unit = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  if (minutes === 0) return unit(seconds, 'second');
  if (seconds === 0) return unit(minutes, 'minute');
  return `${unit(minutes, 'minute')} ${unit(seconds, 'second')}`;
}

/**
 * 1800 -> "30 Min.", 197 -> "3:17 Min." — matches the label treatment on the
 * Daily Goals card. A recording's exact length keeps its seconds, so the label
 * agrees with the player's clock.
 */
export function formatMinutesLabel(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  return whole % 60 === 0 ? `${whole / 60} Min.` : `${formatMinutesSeconds(whole)} Min.`;
}

/** 300 -> "5m", 197 -> "3m 17s" — the compact form used on the home rails. */
export function formatShortMinutes(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  if (seconds === 0) return `${minutes}m`;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
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

/** 65 -> "1:05" — a short countdown, without padding the minutes. */
export function formatMinutesSeconds(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
