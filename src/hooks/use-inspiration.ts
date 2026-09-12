'use client';

import * as React from 'react';

import { inspirationById, inspirationForDate, type Inspiration } from '@/data/inspirations';
import { toDateKey } from '@/lib/date';
import {
  deriveSignals,
  inspirationThemes,
  pickInspiration,
  type InspirationReason,
  type InspirationTheme,
} from '@/lib/inspiration';
import { planDay, prunePlan, readPlan, writePlan } from '@/lib/inspiration-plan';
import { useApp } from '@/providers/app-provider';
import { useCircles } from '@/providers/circles-provider';

/** Chosen themes live in the ordinary settings map, one flag each. */
export function themeSettingId(theme: InspirationTheme): string {
  return `inspirationTheme.${theme}`;
}

export interface ResolvedInspiration {
  dateKey: string;
  inspiration: Inspiration;
  reason: InspirationReason | null;
}

function resolved(dateKey: string, id: string, reason: InspirationReason | null): ResolvedInspiration {
  // A message removed in a later version falls back to the everyday one.
  const inspiration = inspirationById(id) ?? {
    id: 'everyday',
    text: inspirationForDate(dateKey),
    tags: [],
  };
  return { dateKey, inspiration, reason };
}

/**
 * The reader's daily inspiration: what today's message is, why, and the
 * themes they have asked for.
 *
 * `resolve` settles a day's message the first time it is asked for (see
 * `lib/inspiration-plan`), so call it from effects and event handlers, never
 * during render.
 */
export function useInspiration() {
  const { sessions, reflections, sleepLogs, settings, setSetting, hydrated } = useApp();
  const { intake } = useCircles();

  const themes = inspirationThemes
    .filter((theme) => settings[themeSettingId(theme.id)])
    .map((theme) => theme.id);
  const themesKey = themes.join(',');
  const goal = intake?.goal;

  const resolve = React.useCallback(
    (dateKey: string): ResolvedInspiration => {
      const todayKey = toDateKey(new Date());
      const signals = deriveSignals({ todayKey, sessions, reflections, sleepLogs });
      const chosenThemes = themesKey ? (themesKey.split(',') as InspirationTheme[]) : [];

      const { entry, plan } = planDay(prunePlan(readPlan(), todayKey), dateKey, todayKey, () => {
        const pick = pickInspiration({ dateKey, todayKey, signals, themes: chosenThemes, goal });
        return { id: pick.inspiration.id, reason: pick.reason };
      });
      writePlan(plan);

      return resolved(dateKey, entry.id, entry.reason);
    },
    [sessions, reflections, sleepLogs, themesKey, goal],
  );

  /** Messages already settled for the given days, newest first; days with none are skipped. */
  const history = React.useCallback((dateKeys: string[]): ResolvedInspiration[] => {
    const plan = readPlan();
    return dateKeys.flatMap((dateKey) => {
      const entry = plan[dateKey];
      return entry ? [resolved(dateKey, entry.id, entry.reason)] : [];
    });
  }, []);

  const toggleTheme = React.useCallback(
    (theme: InspirationTheme) => {
      const id = themeSettingId(theme);
      setSetting(id, !settings[id]);
    },
    [settings, setSetting],
  );

  return { hydrated, themes, toggleTheme, resolve, history };
}
