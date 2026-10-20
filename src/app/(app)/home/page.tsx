import { CategoryDeck } from '@/components/home/category-deck';
import { GreetingHeader } from '@/components/home/greeting-header';
import { GroupBanner } from '@/components/home/group-banner';
import { HomeSection } from '@/components/home/home-section';
import { ProgramRail } from '@/components/home/program-rail';
import { RecommendedRail } from '@/components/home/recommended-rail';
import { TodayRail } from '@/components/home/today-rail';
import { VideoRail } from '@/components/home/video-rail';
import { YogaRail } from '@/components/yoga/yoga-rail';
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

      {/* Full width: the panel runs edge to edge. */}
      <div className="mt-7">
        <VideoRail />
      </div>

      <div className="mt-7 px-5">
        <GroupBanner />
      </div>
    </div>
  );
}
