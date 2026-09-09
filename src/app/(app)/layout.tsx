import { BottomNav } from '@/components/layout/bottom-nav';

/**
 * Every destination reachable from the bottom bar shares this shell.
 *
 * There is one scrolling region for the whole app — the device frame in
 * `DeviceStage` — and the page simply fills it. The nav is the last thing in
 * that flow and sticks to the bottom edge of the frame, which is what keeps it
 * on screen at every scroll position without needing a nested scroller whose
 * height has to resolve correctly for the nav to stay put.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col">
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
