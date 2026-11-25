'use client';

// Reads content at render, in the browser, so edits made in Sanity show without a rebuild (src/content/live.ts).
import { AssessmentCard } from '@/components/home/assessment-card';
import { CategoryDeck } from '@/components/home/category-deck';
import { GreetingHeader } from '@/components/home/greeting-header';
import { HomeSection } from '@/components/home/home-section';
import { MoodCheckin } from '@/components/home/mood-checkin';
import { ProgramRail } from '@/components/home/program-rail';
import { RecommendedRail } from '@/components/home/recommended-rail';
import { TodayRail } from '@/components/home/today-rail';
import { VideoRail } from '@/components/home/video-rail';
import { StoryRail } from '@/components/stories/story-rail';
import { YogaRail } from '@/components/yoga/yoga-rail';
import { deckCards } from '@/data/categories';
import { featuredPrograms } from '@/data/programs';
import { featuredStories } from '@/data/stories';

export default function HomePage() {
  return (
    <div className="pb-4">
      <GreetingHeader />

      <MoodCheckin />

      <HomeSection title="Recommended">
        <RecommendedRail />
      </HomeSection>

      <CategoryDeck cards={deckCards} />

      {/* Until it's taken; afterwards its suggestions lead the library's own lists. */}
      <AssessmentCard />

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

      <HomeSection
        title="Free programs for you"
        actionHref="/meditations?tab=programs"
        actionLabel="See all"
      >
        <ProgramRail programs={featuredPrograms} />
      </HomeSection>

      {featuredStories.length > 0 ? (
        <HomeSection
          title="Featured stories"
          actionHref="/meditations?tab=stories"
          actionLabel="See all"
        >
          <StoryRail stories={featuredStories} />
        </HomeSection>
      ) : null}

      {/* Full width: the panel runs edge to edge. */}
      <div className="mt-7">
        <VideoRail />
      </div>
    </div>
  );
}
