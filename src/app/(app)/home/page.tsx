import { CategoryDeck } from '@/components/home/category-deck';
import { DailyGoalCard } from '@/components/home/daily-goal-card';
import { GreetingHeader } from '@/components/home/greeting-header';
import { StartGoalCard } from '@/components/home/start-goal-card';
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

      {/* Full-bleed hairline separating the deck from the day's prompts. */}
      <div aria-hidden="true" className="hairline mt-5 h-px w-full" />

      <div className="px-5 pt-4">
        <SectionTitle>What Brings You Today ?</SectionTitle>

        <div className="mt-3 space-y-2.5">
          <DailyGoalCard meditation={dailyGoal} />
          <StartGoalCard meditation={startGoal} />
        </div>
      </div>

      {/*
        Everything above this point is the reference composition, untouched.
        The daily reflection sits below it, so the screen still opens exactly
        as drawn and this is found by scrolling.
      */}
      <div className="px-5 pt-6">
        <SectionTitle actionHref="/reflections" actionLabel="History">
          Today&apos;s Reflection
        </SectionTitle>

        <div className="mt-3">
          <ReflectionCard />
        </div>
      </div>
    </div>
  );
}
