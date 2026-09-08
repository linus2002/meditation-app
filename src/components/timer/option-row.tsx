'use client';

import { cn } from '@/lib/utils';

interface OptionRowProps<T> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Lets a long list scroll sideways rather than wrap. */
  scroll?: boolean;
  className?: string;
}

/**
 * A labelled row of chips, used for the timer's length, bells and ambience.
 * Rendered as a radiogroup with arrow-key support.
 */
export function OptionRow<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  scroll = false,
  className,
}: OptionRowProps<T>) {
  const groupId = `option-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
    onChange(options[(next + options.length) % options.length].value);
  };

  return (
    <div className={className}>
      <p id={groupId} className="text-[11.5px] leading-none text-ink-muted">
        {label}
      </p>

      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className={cn(
          'mt-2.5 flex gap-2',
          scroll ? 'rail -mx-5 overflow-x-auto px-5' : 'flex-wrap',
        )}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                isSelected
                  ? 'bg-action-pill text-white'
                  : 'bg-white/[0.06] text-ink-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
