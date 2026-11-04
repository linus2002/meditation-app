import { getSupabase } from '@/lib/supabase/client';

/*
 * Cloud sync for the reader's own meditation ratings
 * (supabase/migrations/…_meditation_ratings.sql).
 *
 * Ratings are always stored locally first (via app-provider) so the app works
 * offline and without an account. If the reader is signed in, every change is
 * also written to Supabase so it follows them to other devices.
 *
 * On first load after sign-in, fetchMyRatings() lets the provider merge the
 * server state over local state, restoring any ratings given on another device.
 *
 * All calls fail quietly: without keys, offline, or on any server error the
 * local copy is the source of truth.
 */

/** All ratings for the currently signed-in user, keyed by meditation id. */
export async function fetchMyRatings(): Promise<Record<string, number> | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data: session } = await client.auth.getSession();
  if (!session.session) return null;

  const { data, error } = await client.rpc('my_meditation_ratings');
  if (error || !Array.isArray(data)) return null;

  const ratings: Record<string, number> = {};
  for (const row of data as { meditation_id: string; score: number }[]) {
    ratings[row.meditation_id] = row.score;
  }
  return ratings;
}

/**
 * Writes or clears a single rating for the signed-in user.
 *
 * Passing the score already stored clears it (matches the toggle-to-clear
 * behaviour in the local store). Returns the new score, or null when cleared.
 * Returns undefined when Supabase is not available or the call fails.
 */
export async function syncRating(
  meditationId: string,
  score: number | null,
): Promise<number | null | undefined> {
  const client = getSupabase();
  if (!client) return undefined;

  const { data: session } = await client.auth.getSession();
  if (!session.session) return undefined;

  try {
    const { data, error } = await client.rpc('set_meditation_rating', {
      mid: meditationId,
      score: score as number, // null is valid — the SQL accepts it
    });
    if (error) return undefined;
    return (data as number | null) ?? null;
  } catch {
    return undefined;
  }
}

