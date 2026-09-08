'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlarmClock, Heart, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The reference nav carries exactly three icon-only destinations and no labels:
 * the gradient heart, a settings cog and an alarm clock.
 */
const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Heart, filled: true },
  { href: '/profile', label: 'Settings', icon: Settings, filled: false },
  { href: '/sleep', label: 'Sleep and timers', icon: AlarmClock, filled: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // The highlight moves on tap rather than when the route commits. Waiting for
  // the commit makes a tab bar feel unresponsive even when the swap is quick.
  const [tapped, setTapped] = React.useState<string | null>(null);
  React.useEffect(() => setTapped(null), [pathname]);

  const activePath = tapped ?? pathname;

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom relative z-20 shrink-0 bg-canvas px-12 pb-3 pt-2"
    >
      {/* Shared gradient definition for whichever destination is active. */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-active-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3FD9C9" />
            <stop offset="52%" stopColor="#7CA9E8" />
            <stop offset="100%" stopColor="#F07BC8" />
          </linearGradient>
        </defs>
      </svg>

      <ul className="grid grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, filled }) => {
          const isActive = activePath === href || activePath.startsWith(`${href}/`);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                prefetch
                aria-label={label}
                aria-current={pathname === href ? 'page' : undefined}
                onClick={() => setTapped(href)}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-100',
                  'hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                  isActive ? 'scale-105' : 'scale-100',
                )}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2 : 1.8}
                  stroke={isActive ? 'url(#nav-active-gradient)' : '#8A8DA8'}
                  fill={isActive && filled ? 'url(#nav-active-gradient)' : 'none'}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
