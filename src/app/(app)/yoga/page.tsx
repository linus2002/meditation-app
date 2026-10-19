import { ScreenHeader } from '@/components/layout/screen-header';
import { YogaMosaic } from '@/components/yoga/yoga-mosaic';
import { YOGA_SAFETY, yogaSessions } from '@/data/yoga';

/**
 * Every yoga session, as its own tab in the bottom bar, laid out as a mosaic
 * of large glass tiles — one colour per kind of yoga. The same sessions also live
 * as a plain list under the Yoga tab of Meditations, so the library stays
 * complete.
 */
export default function YogaPage() {
  return (
    <div className="pb-4">
      <ScreenHeader eyebrow="Move gently" title="Yoga" />

      <section className="mt-5 px-2.5">
        <p className="px-2.5 text-caption leading-relaxed text-ink-muted">
          Gentle, guided yoga — one pose at a time, with a soft bell when it&apos;s time to move.
          Most need no mat.
        </p>
        <div className="mt-5">
          <YogaMosaic sessions={yogaSessions} />
        </div>
        <p className="mt-5 px-2.5 text-label leading-relaxed text-ink-faint">{YOGA_SAFETY}</p>
      </section>
    </div>
  );
}
