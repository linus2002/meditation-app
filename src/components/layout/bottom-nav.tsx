'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flower2, Home, Moon, User } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Four destinations, each named for what the screen actually holds: the home
 * feed, the meditations library, the sleep analytics screen and the profile
 * page. Icon over label, so the glyph is never the only thing telling you where
 * a tab goes.
 */
const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/meditations', label: 'Meditations', icon: Flower2 },
  { href: '/sleep', label: 'Sleep', icon: Moon },
  { href: '/profile', label: 'Profile', icon: User },
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
      className="safe-bottom sticky bottom-0 z-20 shrink-0 bg-canvas px-2 pb-2 pt-2"
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

      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = activePath === href || activePath.startsWith(`${href}/`);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                prefetch
                aria-current={pathname === href ? 'page' : undefined}
                onClick={() => setTapped(href)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-2xl px-0.5 py-1.5',
                  'transition-transform duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                  isActive ? 'scale-105' : 'scale-100 hover:scale-105',
                )}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2 : 1.8}
                  stroke={isActive ? 'url(#nav-active-gradient)' : 'rgb(var(--nav-idle))'}
                  fill="none"
                />
                {/* The active label picks up the same gradient as its icon. */}
                <span
                  className={cn(
                    'whitespace-nowrap text-[11px] font-medium leading-none tracking-[0.01em]',
                    isActive
                      ? 'bg-nav-active bg-clip-text text-transparent'
                      : 'text-[rgb(var(--nav-idle))]',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
