'use client';

import * as React from 'react';

import { settingToggles } from '@/data/settings';
import type { Reflection, SessionRecord } from '@/types';

const STORAGE_KEY = 'serenity.state.v1';

interface PersistedState {
  favorites: string[];
  recents: string[];
  settings: Record<string, boolean>;
  onboarded: boolean;
  /** Newest first, one per day. */
  reflections: Reflection[];
  /** Every recorded sitting, newest first. Drives all progress figures. */
  sessions: SessionRecord[];
  /** Saved stories. Kept apart from session favourites so ids cannot collide. */
  favoriteStories: string[];
}

interface AppContextValue extends PersistedState {
  /** True once the persisted state has been read, so the UI can avoid a flash. */
  hydrated: boolean;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  markPlayed: (id: string) => void;
  setSetting: (id: string, value: boolean) => void;
  completeOnboarding: () => void;
  /** Appends a completed or part-finished sitting. */
  recordSession: (record: SessionRecord) => void;
  toggleFavoriteStory: (id: string) => void;
  isFavoriteStory: (id: string) => boolean;
  /** Writes or replaces the entry for that day. */
  saveReflection: (entry: Reflection) => void;
  removeReflection: (date: string) => void;
  getReflection: (date: string) => Reflection | undefined;
}

const defaultSettings = settingToggles.reduce<Record<string, boolean>>((acc, toggle) => {
  acc[toggle.id] = toggle.defaultOn;
  return acc;
}, {});

const initialState: PersistedState = {
  favorites: ['open-heart', 'ocean-drift'],
  recents: ['meditation-daily'],
  settings: defaultSettings,
  onboarded: false,
  reflections: [],
  sessions: [],
  favoriteStories: ['lighthouse'],
};

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Read once on mount so the server and first client render always agree.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState((current) => ({
          favorites: parsed.favorites ?? current.favorites,
          recents: parsed.recents ?? current.recents,
          settings: { ...current.settings, ...(parsed.settings ?? {}) },
          onboarded: parsed.onboarded ?? current.onboarded,
          reflections: parsed.reflections ?? current.reflections,
          sessions: parsed.sessions ?? current.sessions,
          favoriteStories: parsed.favoriteStories ?? current.favoriteStories,
        }));
      }
    } catch {
      // A blocked or unavailable store simply falls back to the seeded defaults.
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Persistence is a convenience here, never a requirement.
    }
  }, [state, hydrated]);

  // Writers use functional updates, so they never need `state` as a dependency
  // and keep a stable identity for the life of the provider.
  const toggleFavorite = React.useCallback((id: string) => {
    setState((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((item) => item !== id)
        : [id, ...current.favorites],
    }));
  }, []);

  const markPlayed = React.useCallback((id: string) => {
    setState((current) => ({
      ...current,
      recents: [id, ...current.recents.filter((item) => item !== id)].slice(0, 8),
    }));
  }, []);

  const setSetting = React.useCallback((id: string, next: boolean) => {
    setState((current) => ({ ...current, settings: { ...current.settings, [id]: next } }));
  }, []);

  const completeOnboarding = React.useCallback(() => {
    setState((current) => ({ ...current, onboarded: true }));
  }, []);

  /**
   * Upserts by id. A single sitting can be committed more than once — when the
   * app is backgrounded, and again when it finishes — and the later, longer
   * record simply replaces the earlier one instead of double-counting.
   */
  const recordSession = React.useCallback((record: SessionRecord) => {
    setState((current) => ({
      ...current,
      sessions: [record, ...current.sessions.filter((item) => item.id !== record.id)].slice(0, 2000),
    }));
  }, []);

  const toggleFavoriteStory = React.useCallback((id: string) => {
    setState((current) => ({
      ...current,
      favoriteStories: current.favoriteStories.includes(id)
        ? current.favoriteStories.filter((item) => item !== id)
        : [id, ...current.favoriteStories],
    }));
  }, []);

  const saveReflection = React.useCallback((entry: Reflection) => {
    setState((current) => ({
      ...current,
      reflections: [entry, ...current.reflections.filter((item) => item.date !== entry.date)].sort(
        (a, b) => b.date.localeCompare(a.date),
      ),
    }));
  }, []);

  const removeReflection = React.useCallback((date: string) => {
    setState((current) => ({
      ...current,
      reflections: current.reflections.filter((entry) => entry.date !== date),
    }));
  }, []);

  const value = React.useMemo<AppContextValue>(
    () => ({
      ...state,
      hydrated,
      isFavorite: (id) => state.favorites.includes(id),
      isFavoriteStory: (id) => state.favoriteStories.includes(id),
      getReflection: (date) => state.reflections.find((entry) => entry.date === date),
      toggleFavorite,
      markPlayed,
      setSetting,
      completeOnboarding,
      recordSession,
      toggleFavoriteStory,
      saveReflection,
      removeReflection,
    }),
    [
      state,
      hydrated,
      toggleFavorite,
      markPlayed,
      setSetting,
      completeOnboarding,
      recordSession,
      toggleFavoriteStory,
      saveReflection,
      removeReflection,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside <AppProvider>');
  }
  return context;
}
