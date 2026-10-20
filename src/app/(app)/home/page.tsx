import { CategoryDeck } from '@/components/home/category-deck';
import { GreetingHeader } from '@/components/home/greeting-header';
import { GroupBanner } from '@/components/home/group-banner';
import { HomeSection } from '@/components/home/home-section';
import { ProgramRail } from '@/components/home/program-rail';
import { RecommendedRail } from '@/components/home/recommended-rail';
import { ReflectionPromptRow } from '@/components/home/reflection-prompt-row';
import { TodayRail } from '@/components/home/today-rail';
import { YogaRail } from '@/components/yoga/yoga-rail';
import { SectionTitle } from '@/components/shared/section-title';
import { deckCards } from '@/data/categories';

export default function HomePage() {
  return (
    <div className="pb-4">
      <GreetingHeader />

      <HomeSection title="Recommended">
        <RecommendedRail />
      </HomeSection>

      <CategoryDeck cards={deckCards} />

      <HomeSection title="Your meditations for today">
        <TodayRail />
      </HomeSection>

      <HomeSection
        title="Yoga for today"
        actionHref="/yoga"
        actionLabel="See all"
      >
        <YogaRail />
      </HomeSection>

      <HomeSection title="Free programs for you">
        <ProgramRail />
      </HomeSection>

      {/* Full-bleed hairline separating the rails from the day's reflection. */}
      <div aria-hidden="true" className="hairline mt-5 h-px w-full" />

      <div className="px-5 pt-4">
        <SectionTitle actionHref="/reflections" actionLabel="History">
          Today&apos;s Reflection
        </SectionTitle>

        <div className="mt-3">
          <ReflectionPromptRow />
        </div>
      </div>

      <div className="mt-7 px-5">
        <GroupBanner />
      </div>
    </div>
  );
}
