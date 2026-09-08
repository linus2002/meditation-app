import { CategoryDeck } from '@/components/home/category-deck';
import { DailyGoalCard } from '@/components/home/daily-goal-card';
import { GreetingHeader } from '@/components/home/greeting-header';
import { RecommendedRail } from '@/components/home/recommended-rail';
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

      <section className="pt-2">
        <div className="px-5">
          <h2 className="text-[clamp(21px,6.6vw,26px)] font-bold leading-tight tracking-[-0.02em] text-ink">
            Recommended
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-[1.45] text-ink-muted">
            A few places to start, picked to suit the time of day.
          </p>
        </div>

        <div className="mt-4">
          <RecommendedRail />
        </div>
      </section>

      <div className="pt-7">
        <CategoryDeck cards={deckCards} />
      </div>

      {/* Full-bleed hairline separating the deck from the day's prompts. */}
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
    </div>
  );
}
