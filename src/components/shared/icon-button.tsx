import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  /** Required — these controls are icon-only in the reference. */
  label: string;
}

/**
 * The hairline circular control used for the bell and search actions in the
 * home header: 44px, 1px white border at low opacity, transparent fill.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, asChild = false, label, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        aria-label={label}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-ink',
          'transition-colors duration-200 hover:border-white/45 hover:bg-white/[0.06]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
IconButton.displayName = 'IconButton';
