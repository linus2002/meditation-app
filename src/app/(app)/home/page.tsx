import { CategoryDeck } from '@/components/home/category-deck';
import { DailyGoalCard } from '@/components/home/daily-goal-card';
import { GreetingHeader } from '@/components/home/greeting-header';
import { GroupBanner } from '@/components/home/group-banner';
import { HomeSection } from '@/components/home/home-section';
import { ProgramRail } from '@/components/home/program-rail';
import { RecommendedRail } from '@/components/home/recommended-rail';
import { StartGoalCard } from '@/components/home/start-goal-card';
import { TodayRail } from '@/components/home/today-rail';
import { ReflectionCard } from '@/components/reflections/reflection-card';
import { SectionTitle } from '@/components/shared/section-title';
import { deckCards } from '@/data/categories';
import { dailyGoal, startGoal } from '@/data/meditations';
import { currentUser } from '@/data/user';

export default function HomePage() {
  return (
    <div className="pb-4">
      <GreetingHeader firstName={currentUser.firstName} />

      <CategoryDeck cards={deckCards} />

      <HomeSection
        title="Recommended"
        description="A few places to start, picked to suit the time of day."
      >
        <RecommendedRail />
      </HomeSection>

      <HomeSection title="Your meditations for today">
        <TodayRail />
      </HomeSection>

      <HomeSection title="Free programs for you">
        <ProgramRail />
      </HomeSection>

      {/* Full-bleed hairline separating the rails from the day's prompts. */}
      <div aria-hidden="true" className="hairline mt-5 h-px w-full" />

      <div className="px-5 pt-4">
        <SectionTitle>What Brings You Today ?</SectionTitle>

        <div className="mt-3 space-y-2.5">
          <DailyGoalCard meditation={dailyGoal} />
          <StartGoalCard meditation={startGoal} />
        </div>
      </div>

      <div className="px-5 pt-7">
        <SectionTitle actionHref="/reflections" actionLabel="History">
          Today&apos;s Reflection
        </SectionTitle>

        <div className="mt-3">
          <ReflectionCard />
        </div>
      </div>

      <div className="mt-7 px-5">
        <GroupBanner />
      </div>
    </div>
  );
}
