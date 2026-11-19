import { notFound } from 'next/navigation';

import { StoryScreen } from '@/components/live/live-screens';
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

/** The story is looked up in the browser, so edits made in Sanity show without a rebuild. */
export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getStory(id)) notFound();
  return <StoryScreen id={id} />;
}
