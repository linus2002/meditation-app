import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The one Supabase client, used from the browser only.
 *
 * There is no server of our own: the Capacitor build is a static export, so
 * every request goes straight from the device to Supabase, and row level
 * security (supabase/migrations) is what decides what each person may see.
 *
 * Returns null when the keys are not set, or during prerendering. Everything
 * that uses Circles checks for that and shows "not available" rather than
 * failing, so a build without keys is still a complete app.
 */

// Written out in full so Next inlines them at build time. The publishable key
// (`sb_publishable_…`) replaces the legacy anon key, which Supabase retires at
// the end of 2026; either one works here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isCirclesConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined' || !url || !anonKey) return null;

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Email linking uses a typed code, never a redirect back into the app.
        detectSessionInUrl: false,
        storageKey: 'serenity.auth.v1',
      },
    });
  }
  return client;
}
