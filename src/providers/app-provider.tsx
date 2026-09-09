'use client';

import * as React from 'react';

import { settingToggles } from '@/data/settings';
import type { Reflection, SessionRecord, SleepLog } from '@/types';

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
  /** Self-reported nights, newest first, one per date. */
  sleepLogs: SleepLog[];
  /** The reader's own 1-5 score per session id. There is no other source. */
  ratings: Record<string, number>;
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
  /** Writes or replaces the night keyed by the morning you woke. */
  saveSleepLog: (entry: SleepLog) => void;
  removeSleepLog: (date: string) => void;
  getSleepLog: (date: string) => SleepLog | undefined;
  /** 1-5. Passing the score already stored clears it. */
  rateMeditation: (id: string, score: number) => void;
  getRating: (id: string) => number | undefined;
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
  // Both start empty on purpose: a seeded night or score would be a number the
  // reader never gave, on a screen whose whole job is to report what they did.
  sleepLogs: [],
  ratings: {},
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
          sleepLogs: parsed.sleepLogs ?? current.sleepLogs,
          ratings: parsed.ratings ?? current.ratings,
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

  const saveSleepLog = React.useCallback((entry: SleepLog) => {
    setState((current) => ({
      ...current,
      sleepLogs: [entry, ...current.sleepLogs.filter((item) => item.date !== entry.date)].sort(
        (a, b) => b.date.localeCompare(a.date),
      ),
    }));
  }, []);

  const removeSleepLog = React.useCallback((date: string) => {
    setState((current) => ({
      ...current,
      sleepLogs: current.sleepLogs.filter((entry) => entry.date !== date),
    }));
  }, []);

  /** Tapping the score already given takes it back, so a rating is undoable. */
  const rateMeditation = React.useCallback((id: string, score: number) => {
    setState((current) => {
      const next = { ...current.ratings };
      if (next[id] === score) delete next[id];
      else next[id] = score;
      return { ...current, ratings: next };
    });
  }, []);

  const removeReflection = React.useCallback((date: string) => {
    setState((current) => ({
      ...current,
      reflections: current.reflections.filter((entry) => entry.date !== date),
    }));
  }, []);

  /*
   * Paint the chosen palette onto the document. The tokens hang off
   * `data-theme`, so this one attribute swaps every colour in the app; the
   * `theme-color` meta follows it so the browser's own chrome matches rather
   * than staying navy over a white page.
   *
   * It waits for hydration: before then `settings` still holds the defaults,
   * and writing those would flash the dark canvas at someone who chose light.
   */
  React.useEffect(() => {
    if (!hydrated) return;
    const light = state.settings.lightMode ?? false;
    document.documentElement.dataset.theme = light ? 'light' : 'dark';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#F7F7FB' : '#0E1030');
  }, [hydrated, state.settings.lightMode]);

  const value = React.useMemo<AppContextValue>(
    () => ({
      ...state,
      hydrated,
      isFavorite: (id) => state.favorites.includes(id),
      isFavoriteStory: (id) => state.favoriteStories.includes(id),
      getReflection: (date) => state.reflections.find((entry) => entry.date === date),
      getSleepLog: (date) => state.sleepLogs.find((entry) => entry.date === date),
      getRating: (id) => state.ratings[id],
      toggleFavorite,
      markPlayed,
      setSetting,
      completeOnboarding,
      recordSession,
      toggleFavoriteStory,
      saveReflection,
      removeReflection,
      saveSleepLog,
      removeSleepLog,
      rateMeditation,
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
      saveSleepLog,
      removeSleepLog,
      rateMeditation,
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
