import { notFound } from 'next/navigation';

import { StoryReader } from '@/components/stories/story-reader';
import { getStory, stories } from '@/data/stories';

export function generateStaticParams() {
  return stories.map((story) => ({ id: story.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = getStory(id);

  return {
    title: story ? `${story.title} — Serenity` : 'Story — Serenity',
    description: story?.description,
  };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = getStory(id);

  if (!story) {
    notFound();
  }

  return <StoryReader story={story} />;
}
