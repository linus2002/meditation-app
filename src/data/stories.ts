import { content, onContentChange, toImage } from '@/content';
import type { Story, StoryCategory } from '@/types';

/**
 * Edited in Sanity (Studio → Stories).
 *
 * Original stories, written for this app — nothing licensed, nothing scraped.
 * They are deliberately low-stakes and slow: no jeopardy, no twist, nothing
 * that would pull someone back awake near the end.
 *
 * The text is the source for both reading and narration, so it is punctuated
 * for the ear as much as the eye — short sentences, few clauses, and full
 * stops where a voice would naturally rest.
 */
export let stories: Story[] = [];

/** The few ticked "Featured on home" in Sanity, for the home screen rail. */
export let featuredStories: Story[] = [];

export let sleepStories: Story[] = [];

// Rebuilt whenever fresh content arrives (src/content/live.ts).
onContentChange(() => {
  stories = content.stories.map(({ image, cover, ...story }) => ({
    ...story,
    image: toImage(image),
    ...(cover ? { cover: toImage(cover) } : {}),
  }));
  featuredStories = stories.filter((story) => story.featured);
  sleepStories = stories.filter((story) => story.category === 'sleep');
});

export const storyCategories: { value: StoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'mindfulness', label: 'Mindfulness' },
];

export function getStory(id: string): Story | undefined {
  return stories.find((story) => story.id === id);
}