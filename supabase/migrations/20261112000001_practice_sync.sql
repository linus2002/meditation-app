    -- Practice sync: a signed-in reader's sittings and the places they left
    -- sessions, so both follow them to another phone (src/lib/cloud-sync.ts).
    --
    -- The phone stays the first copy; these tables are its backup and the way a
    -- second device catches up. Each person may read and write only their own
    -- rows, and anonymous accounts (the kind video likes create) none at all.
    --
    -- Support-track listening is deliberately absent: it never leaves the phone.

    -- One row per sitting, as recorded on the phone (SessionRecord in src/types).
    create table public.practice_sessions (
      user_id uuid not null references auth.users (id) on delete cascade,
      -- The phone's own id for the sitting: `<meditation id>-<started ms>`.
      id text not null check (char_length(id) between 1 and 160),
      meditation_id text not null check (meditation_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
      -- The reader's local calendar day, as the phone counted it for streaks.
      day date not null,
      seconds integer not null check (seconds between 0 and 86400),
      completed boolean not null default false,
      started_at timestamptz not null,
      updated_at timestamptz not null default now(),
      primary key (user_id, id)
    );

    create index practice_sessions_user_started_idx
      on public.practice_sessions (user_id, started_at desc);

    -- Where each session was left part-way. Keys follow src/lib/resume.ts:
    -- a meditation id, or `yoga:<id>` / `story:<id>:<unit>`.
    create table public.resume_points (
      user_id uuid not null references auth.users (id) on delete cascade,
      item_key text not null check (item_key ~ '^[a-z0-9][a-z0-9:-]{0,119}$'),
      position integer not null check (position >= 0),
      saved_at timestamptz not null,
      primary key (user_id, item_key)
    );

    alter table public.practice_sessions enable row level security;
    alter table public.resume_points enable row level security;

    -- Signed in with a real account: not anonymous.
    -- `is_anonymous` is a claim on every Supabase access token.
    create policy "practice sessions: own rows" on public.practice_sessions
      for all to authenticated
      using (
        user_id = (select auth.uid())
        and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      )
      with check (
        user_id = (select auth.uid())
        and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      );

    create policy "resume points: own rows" on public.resume_points
      for all to authenticated
      using (
        user_id = (select auth.uid())
        and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      )
      with check (
        user_id = (select auth.uid())
        and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      );

    grant select, insert, update, delete on public.practice_sessions to authenticated;
    grant select, insert, update, delete on public.resume_points to authenticated;
