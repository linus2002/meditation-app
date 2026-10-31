'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { DeviceStage } from '@/components/layout/device-stage';

/**
 * Routes that are web pages rather than app screens. They are read on laptops
 * as much as phones, so they skip the handset frame and the desktop gate.
 */
const FULL_WIDTH_ROUTES = ['/landing'];

/**
 * Picks the frame for a route. The pathname is known during server rendering,
 * so the right frame is in the first paint and nothing flashes.
 */
export function StageGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const fullWidth = FULL_WIDTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (fullWidth) return <>{children}</>;
  return <DeviceStage>{children}</DeviceStage>;
}
