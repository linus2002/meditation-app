import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  /** `action` is the full-width Get Started pill; `analytics` is the bleed pill. */
  tone?: 'action' | 'analytics';
}

/**
 * The pink -> violet pill used for the primary call to action. The reference
 * uses a single flat gradient with no border and generous corner radius.
 */
export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, asChild = false, tone = 'action', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full text-[15px] font-medium text-white',
          'transition-[transform,filter] duration-200 ease-out hover:brightness-105 active:scale-[0.985]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:pointer-events-none disabled:opacity-60',
          tone === 'action' ? 'bg-action-pill shadow-pill' : 'bg-analytics-pill',
          className,
        )}
        {...props}
      />
    );
  },
);
GradientButton.displayName = 'GradientButton';
