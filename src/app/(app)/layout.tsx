import { BottomNav } from '@/components/layout/bottom-nav';

/**
 * Every destination reachable from the three-icon bar shares this shell: one
 * scrolling region with the nav pinned to the bottom of the device frame.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="rail min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      <BottomNav />
    </div>
  );
}
