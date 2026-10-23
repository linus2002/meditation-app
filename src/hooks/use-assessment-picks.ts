'use client';

import * as React from 'react';
import type { StaticImageData } from 'next/image';

import { meditations } from '@/data/meditations';
import { programs } from '@/data/programs';
import { stories } from '@/data/stories';
import { yogaSessions } from '@/data/yoga';
import { recommend, type AssessmentAnswers } from '@/lib/assessment';
import { formatMinutesLabel } from '@/lib/format';
import { estimatedMinutes } from '@/lib/story';
import { totalSeconds } from '@/lib/yoga';
import { useApp } from '@/providers/app-provider';

/** One suggestion, flattened so a single rail can show every kind of content. */
export interface AssessmentPick {
  key: string;
  kind: 'Meditation' | 'Story' | 'Yoga' | 'Program';
  title: string;
  meta: string;
  image: StaticImageData;
  href: string;
}

/**
 * What the assessment suggests, interleaved so the rail opens on the strongest
 * meditation and mixes in the other kinds rather than listing them in blocks.
 */
export function picksFor(answers: AssessmentAnswers): AssessmentPick[] {
  const result = recommend(answers, { meditations, stories, yoga: yogaSessions, programs });

  const groups: AssessmentPick[][] = [
    result.meditations.map((item) => ({
      key: `meditation-${item.id}`,
      kind: 'Meditation',
      title: item.title,
      meta: formatMinutesLabel(item.durationSeconds),
      image: item.image,
      href: `/player/${item.id}`,
    })),
    result.programs.map((item) => ({
      key: `program-${item.id}`,
      kind: 'Program',
      title: item.title,
      meta: `${item.sessions.length} sessions`,
      image: item.image,
      href: item.href,
    })),
    result.yoga.map((item) => ({
      key: `yoga-${item.id}`,
      kind: 'Yoga',
      title: item.title,
      meta: formatMinutesLabel(totalSeconds(item.poses)),
      image: item.image,
      href: `/yoga/${item.id}`,
    })),
    result.stories.map((item) => ({
      key: `story-${item.id}`,
      kind: 'Story',
      title: item.title,
      meta: `${estimatedMinutes(item)} Min.`,
      image: item.cover ?? item.image,
      href: `/stories/${item.id}`,
    })),
  ];

  const picks: AssessmentPick[] = [];
  for (let round = 0; groups.some((group) => group.length > round); round += 1) {
    for (const group of groups) if (group[round]) picks.push(group[round]);
  }
  return picks;
}

/** Suggested ids per kind of content, each list strongest first. */
export interface AssessmentRanking {
  meditations: string[];
  stories: string[];
  yoga: string[];
  programs: string[];
}

/**
 * What the assessment suggested, as ids, for the library screens to move to
 * the front of their own lists. Null until the assessment has been taken.
 */
export function useAssessmentRanking(): AssessmentRanking | null {
  const { assessment, hydrated } = useApp();
  return React.useMemo(() => {
    if (!hydrated || !assessment) return null;
    const result = recommend(assessment.answers, { meditations, stories, yoga: yogaSessions, programs });
    const ids = (items: { id: string }[]) => items.map((item) => item.id);
    return {
      meditations: ids(result.meditations),
      stories: ids(result.stories),
      yoga: ids(result.yoga),
      programs: ids(result.programs),
    };
  }, [assessment, hydrated]);
}
