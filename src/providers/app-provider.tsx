'use client';

import * as React from 'react';

import { settingToggles } from '@/data/settings';
import { DAILY_GOAL_MINUTES, DAILY_GOAL_OPTIONS } from '@/data/stats';
import { personalKey, readDevice, storedAccount, writeDevice } from '@/lib/account-scope';
import { track } from '@/lib/analytics';
import type { AssessmentAnswers } from '@/lib/assessment';
import { mergeSessionLists, pushSession } from '@/lib/cloud-sync';
import { loadRatings, queueRating } from '@/lib/ratings';
import { MAX_SESSIONS, saveSessionNow, withSession } from '@/lib/session-store';
import type { Reflection, SessionRecord, SleepLog } from '@/types';

const STORAGE_KEY = 'serenity.state.v1';
/** Set once the account's first name has been offered, so clearing it sticks. */
const NAMED_KEY = 'serenity.named.v1';

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
  /** What the home greeting calls the reader. Empty until they give one. */
  name: string;
  /** The first-run assessment, once finished. Drives the home suggestions. */
  assessment: { answers: AssessmentAnswers; completedAt: string } | null;
  /** The reader's daily mindful-minutes goal, one of DAILY_GOAL_OPTIONS. */
  goalMinutes: number;
}

/** Only an offered goal is kept, so a stale or hand-edited value can't stick. */
function validGoal(value: unknown): number | null {
  return typeof value === 'number' && (DAILY_GOAL_OPTIONS as readonly number[]).includes(value)
    ? value
    : null;
}

interface AppContextValue extends PersistedState {
  /** True once the persisted state has been read, so the UI can avoid a flash. */
  hydrated: boolean;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  markPlayed: (id: string) => void;
  setSetting: (id: string, value: boolean) => void;
  completeOnboarding: () => void;
  /**
   * Appends a completed or part-finished sitting, in storage before it
   * returns. `interim` is a save made while it is still running: kept on the
   * phone, and sent to the account only the first time.
   */
  recordSession: (record: SessionRecord, options?: { interim?: boolean }) => void;
  /** Folds in the history from the reader's account (lib/cloud-sync). */
  mergeSessions: (records: SessionRecord[]) => void;
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
  /** Trimmed on save; an empty string clears it. */
  setName: (name: string) => void;
  completeAssessment: (answers: AssessmentAnswers) => void;
  setGoalMinutes: (minutes: number) => void;
}

const defaultSettings = settingToggles.reduce<Record<string, boolean>>((acc, toggle) => {
  acc[toggle.id] = toggle.defaultOn;
  return acc;
}, {});

const initialState: PersistedState = {
  // Nothing saved or played until the reader does it.
  favorites: [],
  recents: [],
  settings: defaultSettings,
  onboarded: false,
  reflections: [],
  sessions: [],
  favoriteStories: [],
  // Both start empty on purpose: a seeded night or score would be a number the
  // reader never gave, on a screen whose whole job is to report what they did.
  sleepLogs: [],
  ratings: {},
  name: '',
  assessment: null,
  goalMinutes: DAILY_GOAL_MINUTES,
};

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Read once on mount so the server and first client render always agree.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(personalKey(STORAGE_KEY));
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
          name: parsed.name ?? current.name,
          assessment: parsed.assessment ?? current.assessment,
          goalMinutes: validGoal(parsed.goalMinutes) ?? current.goalMinutes,
        }));
      }

      // The tour and the theme belong to the phone, whoever is signed in.
      const device = readDevice();
      setState((current) => ({
        ...current,
        onboarded: device.onboarded ?? current.onboarded,
        settings: { ...current.settings, lightMode: device.lightMode ?? current.settings.lightMode },
      }));

      // Greets a reader by the name on their account, unless they chose one here.
      const firstName = storedAccount()?.firstName;
      if (firstName && !window.localStorage.getItem(personalKey(NAMED_KEY))) {
        setState((current) => (current.name ? current : { ...current, name: firstName.slice(0, 40) }));
        window.localStorage.setItem(personalKey(NAMED_KEY), '1');
      }
    } catch {
      // A blocked or unavailable store simply falls back to the seeded defaults.
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(personalKey(STORAGE_KEY), JSON.stringify(state));
    } catch {
      // Persistence is a convenience here, never a requirement.
    }
  }, [state, hydrated]);

  React.useEffect(() => {
    if (hydrated) writeDevice({ onboarded: state.onboarded, lightMode: state.settings.lightMode === true });
  }, [hydrated, state.onboarded, state.settings.lightMode]);

  /*
   * The latest state, for the writers' side effects (analytics, sync). Those
   * run outside the state updaters, which React may run twice, so each goes
   * out once.
   */
  const stateRef = React.useRef(state);
  stateRef.current = state;

  // Brings ratings level with the account on launch, and when a signal returns.
  React.useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const sync = () =>
      void loadRatings(() => stateRef.current.ratings).then((ratings) => {
        if (ratings && !cancelled) setState((current) => ({ ...current, ratings }));
      });
    sync();
    window.addEventListener('online', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('online', sync);
    };
  }, [hydrated]);

  // Writers use functional updates, so they never need `state` as a dependency
  // and keep a stable identity for the life of the provider.
  const toggleFavorite = React.useCallback((id: string) => {
    track(stateRef.current.favorites.includes(id) ? 'favorite_removed' : 'favorite_added', { id });
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
    if (!stateRef.current.onboarded) track('onboarding_completed');
    setState((current) => ({ ...current, onboarded: true }));
  }, []);

  /**
   * Upserts by id. A single sitting can be committed more than once — when the
   * app is backgrounded, and again when it finishes — and the later, longer
   * record simply replaces the earlier one instead of double-counting.
   */
  const recordSession = React.useCallback((record: SessionRecord, options?: { interim?: boolean }) => {
    // One event when a sitting first counts, and one when it runs to the end.
    const previous = stateRef.current.sessions.find((item) => item.id === record.id);
    const properties = { meditation_id: record.meditationId, seconds: record.seconds };
    if (!previous) track('session_recorded', properties);
    if (record.completed && !previous?.completed) track('session_completed', properties);
    // Storage first: this may be the last code to run before the page is gone.
    saveSessionNow(window.localStorage, personalKey(STORAGE_KEY), record);
    // To the reader's account too, when signed in. Repeat sends are harmless.
    if (!options?.interim || !previous) void pushSession(record);
    setState((current) => ({ ...current, sessions: withSession(current.sessions, record) }));
  }, []);

  // Merged into the history as it is now: a sitting may have been saved while
  // the account was being asked.
  const mergeSessions = React.useCallback((records: SessionRecord[]) => {
    setState((current) => ({
      ...current,
      sessions: mergeSessionLists(current.sessions, records).slice(0, MAX_SESSIONS),
    }));
  }, []);

  const toggleFavoriteStory = React.useCallback((id: string) => {
    track(stateRef.current.favoriteStories.includes(id) ? 'story_unsaved' : 'story_saved', { id });
    setState((current) => ({
      ...current,
      favoriteStories: current.favoriteStories.includes(id)
        ? current.favoriteStories.filter((item) => item !== id)
        : [id, ...current.favoriteStories],
    }));
  }, []);

  const saveReflection = React.useCallback((entry: Reflection) => {
    // Only that an entry was written, never what it says.
    track('reflection_saved');
    setState((current) => ({
      ...current,
      reflections: [entry, ...current.reflections.filter((item) => item.date !== entry.date)].sort(
        (a, b) => b.date.localeCompare(a.date),
      ),
    }));
  }, []);

  const saveSleepLog = React.useCallback((entry: SleepLog) => {
    track('sleep_logged');
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

  /**
   * Tapping the score already given takes it back (toggle-to-clear).
   * The change is applied locally immediately, then synced to Supabase in the
   * background (lib/ratings) — the UI never waits for the network.
   */
  const rateMeditation = React.useCallback((id: string, score: number) => {
    const wanted = stateRef.current.ratings[id] === score ? null : score;
    if (wanted !== null) track('meditation_rated', { meditation_id: id });
    setState((current) => {
      const next = { ...current.ratings };
      if (wanted === null) delete next[id];
      else next[id] = wanted;
      return { ...current, ratings: next };
    });
    void queueRating(id, wanted);
  }, []);

  const setName = React.useCallback((name: string) => {
    setState((current) => ({ ...current, name: name.trim().slice(0, 40) }));
  }, []);

  const completeAssessment = React.useCallback((answers: AssessmentAnswers) => {
    // The answers themselves stay on the phone.
    track('assessment_completed');
    setState((current) => ({
      ...current,
      assessment: { answers, completedAt: new Date().toISOString() },
    }));
  }, []);

  const setGoalMinutes = React.useCallback((minutes: number) => {
    const goal = validGoal(minutes);
    if (goal === null) return;
    setState((current) => ({ ...current, goalMinutes: goal }));
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
    if (meta) meta.setAttribute('content', light ? '#FFFFFF' : '#000000');
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
      mergeSessions,
      toggleFavoriteStory,
      saveReflection,
      removeReflection,
      saveSleepLog,
      removeSleepLog,
      rateMeditation,
      setName,
      completeAssessment,
      setGoalMinutes,
    }),
    [
      state,
      hydrated,
      toggleFavorite,
      markPlayed,
      setSetting,
      completeOnboarding,
      recordSession,
      mergeSessions,
      toggleFavoriteStory,
      saveReflection,
      removeReflection,
      saveSleepLog,
      removeSleepLog,
      rateMeditation,
      setName,
      completeAssessment,
      setGoalMinutes,
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
