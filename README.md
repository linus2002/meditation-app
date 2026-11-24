# Serenity — Meditation & Mindfulness

A meditation and mindfulness web app built to reproduce the supplied UI reference
exactly. Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS ·
shadcn/ui · Lucide React.

## Running

Next is pinned to a **patched** 15.1.x. Releases carrying CVE-2025-66478 are
refused by some hosts (Vercel fails the build outright), so do not downgrade
below 15.1.11.

```bash
npm install
npm run dev           # http://localhost:3000
npm run build         # production web build
npm run build:mobile  # static export into out/ for the native apps
npm run typecheck     # tsc --noEmit
```

## Putting it on a phone

See **[MOBILE.md](MOBILE.md)** for the full walkthrough: installing it from the
browser as a home-screen app, or shipping it to the Play Store and App Store
with Capacitor. The repo already carries the app icons, web manifest, offline
service worker, static-export build mode and `capacitor.config.ts`.

Note the two caveats covered there: **iOS suspends WebView audio when the screen
locks**, so sleep sounds need a native audio plugin for background playback, and
reminders only arrive with the app closed in a native build.

## Fidelity to the reference

The three screens in the reference artwork are reproduced without redesign:

| Reference screen | Route | Notes |
| --- | --- | --- |
| "Keep track of Your Health" | `/` | Headline weight mix, wave lines, leaning bars, gradient pill |
| "Hello, Sherman" home | `/home` | Overlapping gradient deck, hairline divider, prompt cards, three-icon nav |
| "Daily Activities" | `/activities` | Open progress ring, date strip, three figures, bleeding Sleep Analytics pill |

Decisions that follow directly from the artwork:

- **No bottom navigation on `/activities`.** The reference shows that screen with a
  back chevron and no nav bar, so it lives outside the navigation route group and
  owns the full height of the frame.
- **The bottom bar has since grown to five labelled tabs:** Home, Meditations,
  Kapwa (the raised middle button), Yoga and Sleep. Every other screen — the
  timer, stories, Saved, Downloads, Mixes, the calendar, the assessment and
  more — is in the home screen's menu, under Profile → Shortcuts, and in
  search (`src/data/shortcuts.ts` is the one list all three read).
- **Layout follows the reference; placeholder copy does not.** The reference's
  stand-in text (Lorem ipsum on the intro, the name "Sherman Whitaker", the
  "sessiom" typo, "Watch Complete sessions") has been replaced with real copy.
  Home greets by time of day and by the name the reader gives on Profile, if
  any. Accounts are covered under **Accounts and the server** below.
- **Dark by default, with a light mode.** The reference shows a dark treatment,
  and that is what a new install gets. *Profile → Preferences → Light mode*
  switches to the light tokens in `globals.css`. Hairlines, rings and hover
  fills use the `overlay` tint, which is white on the dark canvas and ink on the
  light one, so they show in both; never draw them in fixed white.
- The deck cards keep the flat gradients as drawn — no photography behind them.
- **The home screen has since been reordered at the author's request.** The
  greeting bar is now pinned to the top of the scrolling region, and the
  Recommended rail sits directly beneath it, above the gradient deck. The deck,
  the hairline and the prompt cards are otherwise unchanged, but they no longer
  open at the top of the screen as the reference shows.
- The pinned bar carries a solid canvas fill plus a short gradient fade below
  its edge; without the fade the deck's gradients and shadows cut off against a
  hard line as they pass underneath.

The Recommended rail (`src/components/home/recommended-rail.tsx`) follows a
second reference the author supplied: artwork with a pill label over its
top-left, title and narrator beneath, a filled pill action, and a small centred
control. Cards are 82vw so the next one peeks in, with scroll snapping — note
`scroll-px-5` alongside `px-5`, or the snap point pulls the first card past the
left inset and it stops aligning with the heading. Only the composition is
borrowed; the sessions, photography and copy are the app's own.

## Session tracking

Every progress figure in the app is derived from sittings actually recorded on
the device. Nothing is fabricated, and nothing is stored twice, so the numbers
cannot drift apart.

- `src/lib/session-stats.ts` — day summaries, streak, lifetime totals, the week
- `SessionRecord` — what was played, which local day, seconds *actually*
  listened, and whether it ran to the end

**What counts.** A sitting is recorded once it passes 60 seconds
(`MIN_RECORDED_SECONDS`), whether or not you reach the end — leaving part-way
still counts, marked incomplete.

**Surviving the way phones behave.** React runs no cleanup when a page unloads,
and on a phone an app is far more often backgrounded or killed than closed
tidily. Sittings are therefore flushed on `pagehide` and whenever the document
becomes hidden, as well as on unmount. Recording upserts on the sitting's id, so
repeated flushes refine one record instead of double-counting, and a flush can
never downgrade a sitting that already finished.

**Streaks.** Consecutive days, counted back from yesterday when nothing has been
recorded today yet — a streak that resets at midnight, before you have had a
chance to sit, is just a nag.

### Labels on the activities screen

The reference artwork reads *Active Cal 205/500*, *Wake Time* and *Active Time*.
Those are fitness metrics this app has no way to measure, and keeping them would
have meant inventing numbers. The layout, type scale and ring are untouched, but
the three figures now read **Mindful Min**, **First Sit** and **Total Time** —
the same visual shape, all genuinely measured. Restoring the original wording
honestly would mean Apple Health / Google Fit integration in the native build.

A new install starts empty rather than seeded with a fabricated history.

## First-run tour

Four steps at `/welcome`, shown once on a fresh install and never again.

1. Full-bleed abstract sweep, wordmark and tagline low on the screen, a filled
   primary and an outlined secondary.
2. A tilted grid of session artwork running off every edge, with the promise
   set over it.
3. **What's in Serenity** — Meditations, Programs, Yoga, Kapwa, read-aloud
   stories, sleep and soundscapes, mixes and the calendar, and daily
   inspiration, each an icon and one line, over a soft blue and green glow.
4. The original reference intro screen — headline weight mix, wave lines,
   leaning bars, gradient pill — unchanged. It was always an intro with a Get
   Started button, so this is where it belongs in the flow.

`/` is the gate: it waits for `onboarded` to be read from `localStorage`, then
sends first-timers to `/welcome` and everyone else to `/home`. Waiting for
hydration avoids flashing the wrong screen, and `router.replace` keeps the tour
out of the back stack — finishing it and pressing back must not re-enter it.
Skipping marks it done too.

The sweep on step one is layered CSS gradients rather than an image: it scales
to any handset without a large asset. The bands are narrow and only lightly
blurred on purpose — a wide, heavy blur flattens it into a wash and loses the
folded look.

The layout follows a reference the author supplied. The composition is shared;
the branding, copy and artwork are Serenity's own, and no third-party marks or
product imagery are reproduced.

## Read-aloud stories

Six original stories — written for this app, nothing licensed or scraped — at
`/stories`, with a reader at `/stories/[id]`. Each carries a title, a one-line
description, an estimated duration and a category (sleep, relaxation,
mindfulness). Reachable from Discover, the sleep screen and Profile.

Narration uses the **Web Speech API**, for the same reasons as the soundscapes:
nothing unverifiable is shipped, there is no licence to honour, and it works
offline on device voices.

**Sentences, not one long utterance.** Speech synthesis exposes no timeline, so
a naive implementation gives play and pause and nothing else. `segmentStory`
splits the text into sentences and `useNarration` speaks them one at a time,
chaining on `onend`. That single decision is what makes the rest work:

- progress measured in characters read, weighted so the bar is honest
- skip back and forward, by converting 15 seconds into a position in the text
- scrubbing to any point in the story
- the paragraph being spoken lifts out of the page as it is read

It also sidesteps the long-standing Chrome bug where one long utterance stops
after about fifteen seconds.

Care is needed in two places. `speechSynthesis.cancel()` fires `onend` for the
utterance in flight, so every stop sets a guard first or the chain advances
through the whole story. And a voice the browser refuses to accept must not take
narration down with it — assignment is wrapped, falling back to the default
voice.

**Honest limits, surfaced in the UI rather than hidden.** Durations are
estimates: the real pace depends on the device voice. Volume and rate apply from
the next sentence, because an utterance already being spoken cannot be changed.
Where a browser has no speech synthesis at all, the screen says so and the story
is still there to read.

The sleep timer stops the reading and fades the ambient bed over twelve seconds.
Saved stories live in their own list, apart from session favourites, so ids
cannot collide.

## Unguided timer

A plain sit at `/timer`, reached from the top of Discover and from Profile.
Choose a length (3-60 min), optional interval bells, an optional pause to settle
before the opening bell, and an optional ambient bed. Three distinct pitches:
C5 opens, E5 marks each interval, G4 closes.

Sits are recorded like any other session, so a plain sit feeds the activities
ring, the streak and the weekly chart.

Built to stay smooth:

- The ring is driven by `stroke-dashoffset` with a 260ms linear transition
  matched to the clock's 250ms tick, so it glides without React re-rendering at
  frame rate.
- The countdown measures against the wall clock rather than counting ticks, so a
  backgrounded tab does not drift.
- Figures are `tabular-nums`, so digits do not jitter as they change.
- `navigator.wakeLock` holds the screen on during a sit and re-acquires it when
  the tab returns. Purely an enhancement — the timer runs fine without it.

Recording behaviour is shared with the player through `useSessionRecorder`
rather than duplicated: the background flush, the upsert-by-id and the rule that
a later flush can never downgrade a finished sit are subtle enough that two
copies would have drifted.

## The end of a sitting

`SessionComplete` is shared by the guided player and the unguided timer, so both
endings feel the same. It does three things, in order:

1. Says what was just added — the minutes, where the day now stands against the
   goal, and the streak once it reaches two days.
2. Offers the day's reflection **only if it has not been written yet**, so it
   never reads as a chore. It reuses `ReflectionCard`, so writing here and
   writing on the home screen are the same entry.
3. Points somewhere next — one quiet suggestion, preferring the category you
   were already in.

Deliberately calm: no confetti, no score, and no warning about breaking a streak.

## Daily reflection

A prompt a day on the home screen, a sentence in reply, and a note of how it
sat. History lives at `/reflections`.

- `src/data/reflections.ts` — the 14 prompts, the weight scale, date helpers
- `src/components/reflections/` — the home card and the five-point scale
- Entries persist in `localStorage` beside favourites and settings

The prompt rotates **deterministically by date**, not at random, so it cannot
change under you mid-sentence.

**This is deliberately not a self-scoring instrument.** The rating asks how the
reflection sat (Heavy → Light), never how you rate yourself as a person, and the
history screen says so in plain text: *"Taller is lighter. This is a record, not
a score."* A wellbeing app that hands someone a number for their worth invites
exactly the self-judgement the rest of the app is trying to settle. The prompts
are written to invite noticing rather than grading, and none of them are
clinical screening questions.

## Daily inspiration

One short, uplifting line a day — *"You don't have to be strong every moment.
Just take the next breath."* — chosen for each reader from 55 messages written
for Serenity (`src/data/inspirations.ts`), each tagged with keywords: calm,
sleep, focus, self-kindness, hard-day, new-start, momentum.

**How the message is chosen** (`src/lib/inspiration.ts`, all on the phone):

| What the app notices | Leans towards |
| --- | --- |
| A reflection rated Heavy or Uneasy, today or yesterday | hard-day, self-kindness |
| Last night logged as poor, or under six hours | sleep |
| Four or more days since the last sit | new-start — a welcome back, never guilt |
| A streak of three days or more | momentum |
| Themes the reader picked (Calm, Sleep, Focus, Self-kindness) | those themes |

The best matches rotate by date, so the message is stable all day and changes
the next. Passing moods only shape today's and tomorrow's message. With nothing
to go on, everyone gets the same everyday rotation. A day's message is settled
the first time it is sent or shown (`src/lib/inspiration-plan.ts`), so the
notification and the app always agree. Nothing about mood or sleep leaves the
device.

- **In the app:** today's message tops the Notifications screen, with the
  previous three days beneath it. The bell shows a small dot until today's has
  been read — only for readers who switched the inspiration on.
- **On the phone:** *Profile → Preferences → Daily inspiration* (or the
  Notifications screen) sends it at 08:00 as "Daily Inspiration". In a native
  build the next fortnight is scheduled day by day, each with its own words,
  and refreshed on every launch. In a browser it arrives while Serenity is open,
  any time until 10 PM.

## Support during cancer

A separate track for people in and after cancer treatment, and for the people
caring for them. It is organised by the **moment someone is living through**,
not by meditation technique: waiting for scan results, the chemo chair, a
no-energy day, a sleepless steroid night, the time after treatment ends, and
looking after someone.

**Scope:** comfort and coping alongside medical care — never a substitute for
it. Nothing in the track may claim or imply any effect on cancer, treatment,
results or survival.

| Piece | Where |
| --- | --- |
| Sessions, moments, disclaimer (all DRAFT wording) | `src/data/support-track.ts` |
| Guard-rail tests (no claim words, short tired-day sessions, no breath holds…) | `src/data/support-track.test.ts` |
| The track's front door — "Where are you right now?" | `/support` |
| One page per session, so each is precached for offline | `src/app/support/<id>/page.tsx` |
| Player — one Start button, no streaks, scores or ratings | `src/components/support/support-player.tsx` |
| Private listening history and larger text, kept apart from app stats | `src/lib/support-history.ts` |
| On/off switch | `NEXT_PUBLIC_SUPPORT_TRACK` (`src/lib/support-track.ts`) |

How it behaves:

- **Low effort on a hard day.** One question, large targets, then a single
  Start button. While playing, one large pause button. An "Aa" switch makes
  the text larger across the track. No breath holds, no cue tones, no
  vibration.
- **No streaks anywhere in the track.** Listening goes into a private list
  ("Just for you"), never into the app's streak, activity screen or daily
  goal.
- **Built for the moment.** The two tired-day sessions are 2 and 5 minutes; the
  chemo-chair session is 30 minutes and offers to keep going; the steroid-night
  session fades away with no bell and does not keep the screen on.
- **Offline.** Every session page is precached by the service worker, and the
  sound is generated on the device, so the track works in hospitals with no
  signal once Serenity is installed.
- **My appointments.** A reader can add the date of a scan, scan results or
  chemo (`src/lib/support-appointments.ts`). On the day and the day before, a
  card at the top of the track offers the session made for it — Scan Day
  Companion for scans and results, Chemo Chair for chemo — e.g. *"Your scan is
  tomorrow"*. Only the kind and date are saved, on the phone; past dates clear
  themselves. It is in-app only: no notifications. The card wording is draft
  and goes through the same clinical review.

### Before launch — required, in this order

1. **Clinical review before the wording is final.** An oncology social worker,
   psycho-oncologist or certified mindfulness-in-oncology instructor reviews
   the moment list, every session's wording, the breath pacing and the
   disclaimer. Their changes go into `support-track.ts`, and each session is
   set to `review: 'approved'` (the in-app "Draft wording" notice disappears
   once all are approved).
2. **Legal check** that no copy can be read as a medical or treatment claim.
   The test's word list is a safety net, not a substitute.
3. **Soft launch** through a partner cancer-support organisation: turn the
   track on (`NEXT_PUBLIC_SUPPORT_TRACK=1` in Vercel, then redeploy) and share
   the `/support` link with a small group, collecting feedback before a wide
   release. A Profile shortcut appears automatically once it is on.
4. **Home-screen shortcut** (long-press on the app icon) — add to
   `public/manifest.webmanifest` at launch, not before, since every installed
   copy would see it:
   ```json
   "shortcuts": [
     { "name": "Support during cancer", "url": "/support",
       "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] },
     { "name": "Five minutes", "url": "/support/five-minutes",
       "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] }
   ]
   ```

Later: human-narrated audio for each session, recorded after review.

## Accounts on a shared phone

Everything personal kept on the phone is stored per account
(`src/lib/account-scope.ts`). Signing out hides it and signing in brings it
back; the tour and the theme stay with the phone. A change of account loads a
fresh page, so nothing in memory crosses over. Read and write any new personal
store through `personalKey`.

Data from builds before this goes to the account it last synced with, else to
whoever is signed in. Private data with neither is kept under
`:unclaimed` keys, shown to nobody. Older builds cannot read the new keys, so
rolling back past this change makes local data look empty until rolling forward.

Analytics consent and identity are per account too. Autocapture and session
replay are off (`src/lib/analytics.ts`), and Android backup is off, so private
entries are not copied to the cloud or to a new phone.

## Deleting an account

Profile → Delete account (typed confirmation) calls Studio's `/api/account`
(`studio/api/_lib/account.ts`). It removes the person's support conversations,
then their PostHog person and events, then the Supabase account, which takes
every synced table with it (`on delete cascade`). The phone then erases that
account's local stores.

PostHog deletion needs `POSTHOG_PERSONAL_API_KEY` with the **person:write**
scope on the Studio's Vercel project. With the Analytics tab's read-only key the
account is still deleted, the person is told the team will remove analytics, and
the Studio logs it. `/account-deletion` is the public page for store listings.

## Kapwa, the built-in guide

The raised button in the middle of the bottom bar, drawn with the app's own
logo ring, opens a chat with **Kapwa** (`/kapwa`), named for the Filipino idea
of shared humanity. On the device it matches keywords in what the reader
types (`src/lib/kapwa.ts`) to replies written for Serenity
(`src/data/kapwa.ts`) and offers tap-to-start sessions and screens.

With `NEXT_PUBLIC_KAPWA_AI=1`, replies are written by an AI on Ollama Cloud
instead (`src/lib/kapwa-ai.ts`). The app never holds the Ollama key: it calls
the `kapwa-chat` Supabase edge function (`supabase/functions/kapwa-chat`),
which adds Kapwa's system prompt, enforces an hourly quota per account or IP
(`kapwa_take_quota`), and streams the reply back. Crisis and medical messages
that the on-device check recognises never reach the AI, then or later as
history, and for 30 minutes afterwards nothing typed in that chat does either.
The keyword match still picks the buttons under each
reply, and if the AI is off, offline or over quota the keyword reply is used.

To set it up:

1. Create a key at ollama.com (Settings → Keys).
2. `npx supabase login`, then `npx supabase link --project-ref <ref>`.
3. `npx supabase db push` (adds the quota table and function).
4. `npx supabase secrets set OLLAMA_API_KEY=<key>` (optionally `KAPWA_MODEL`,
   default `gpt-oss:20b`, and `KAPWA_HOURLY_LIMIT`, default 30).
5. `npx supabase functions deploy kapwa-chat --no-verify-jwt`.
6. Set `NEXT_PUBLIC_KAPWA_AI=1` in `.env.local` and rebuild.

- Covers stress, sleep, focus, low moods, anger, body tension, short on time,
  getting started, and the way to the timer, stories, reminders and
  progress. Cancer-support replies appear only where that track is on.
- The crisis and medical patterns (`src/data/kapwa-safety.ts`: English,
  Filipino, some Cebuano) are not clinically validated and cannot catch
  everything (60% of an unseen test set when written), so the chat always
  shows a crisis line, also in every "didn't understand" reply. Keep that.
  Have the patterns reviewed, and add each missed phrase to
  `src/lib/kapwa-safety.test.ts`.
- Anything about suicide or self-harm is checked first, and answered with care
  and a pointer to local emergency services, a crisis line or someone
  trusted — never a meditation.
- Kapwa says plainly what it is (a keyword guide, or an AI when switched on),
  that it is not a person, and not a substitute for professional care. The
  chat history is kept on the phone only, with a Clear button; with the AI on,
  each message is sent to Supabase and Ollama Cloud to be answered.

## Yoga

Six short, gentle yoga sessions written for Serenity (`src/data/yoga.ts`), from
a 5-minute seated desk stretch to 15 minutes of floor stretches before bed.
They live in the **Yoga** tab of Meditations (`/meditations?tab=yoga` opens it
directly), with a four-card **Yoga for today** overview on the home screen.

Each session (`/yoga/<id>`) opens on an overview — length, level, every pose
with its time, and a safety note — then plays **one pose at a time**: the
pose's name, one instruction, a countdown ring, what comes next, and a soft
bell as each pose begins. Poses done on both sides run left then right. Pause
keeps your place; skip moves on; the screen stays awake; an ambient bed plays
if ambience is on. Time spent counts toward the day, the streak and the weekly
chart like any sit.

A session's length is always the sum of its poses (`src/lib/yoga.ts`), and the
pose clock (`src/hooks/use-yoga-session.ts`) runs on the wall clock so a
backgrounded tab does not drift. Every session is prerendered and precached,
so yoga works offline once Serenity is installed.

## Progressive web app

Serenity installs to the home screen and works with no connection at all.

| Piece | Where |
| --- | --- |
| Manifest | `public/manifest.webmanifest` |
| Service worker | `public/sw.js` |
| Route list (generated) | `scripts/build-routes.mjs` -> `public/precache.json` |
| Registration | `src/components/layout/service-worker.tsx` |
| Install affordance | `src/components/layout/install-prompt.tsx` (Profile) |
| Offline fallback | `src/app/offline/page.tsx` |

**Everything is cached on install, not as you browse.** Caching route HTML alone
is not enough: those documents reference content-hashed chunks the browser only
fetches when it actually renders the page, so a route you had never opened would
still fail offline.

The route list is generated by `scripts/build-routes.mjs` as a **`prebuild`
step**, from source rather than from `.next`. That ordering matters: generating
it after `next build` means writing into `public/` once the build has already
consumed that directory, so the file never reaches the deployment. The worker
then fetches each route, caches the HTML, and reads that HTML for the
`/_next/static/...` files the page needs — so the chunk list is always correct
for the deployment that served it, with nothing generated after the build.

Assets are cached individually so one missing file cannot fail the whole
install, and the cache is named for the build's version so a new deploy drops the
old one. After install the worker serves stale-while-revalidate. A navigation
with nothing cached and no connection gets `/offline` rather than the browser's
error page.

**Verified with the server stopped**, not with emulated offline — Chrome's
network emulation does not apply to service worker fetches, so it will happily
report success while the worker is still reaching a live origin. With the origin
genuinely unreachable and only `/home` ever visited, Discover, Timer, Sleep and a
player route all load and stay interactive.

The install row on Profile replays Chrome's deferred `beforeinstallprompt`, shows
an installed state once added, and on iOS Safari — which has no such event —
points at Share -> Add to Home Screen instead. The iOS branch is checked first,
rather than relying on the event being absent.

Note the service worker is deliberately skipped in the Capacitor builds: those
serve from `capacitor://` or a local origin where the files are already on the
device.

## Handheld only

Serenity is not offered on laptop or desktop screens. The gate lives in
`src/components/layout/device-stage.tsx` and is pure CSS at the custom `desktop`
breakpoint (**1025px**, defined in `tailwind.config.ts`):

- **≤ 1024px** — the app renders at handset width (`max-w-[430px]`), centred and
  full height. Covers phones, tablets in portrait, and a 1024pt iPad in landscape.
- **> 1024px** — the app is `display: none` and a "Made for phones and tablets"
  screen is shown instead.

Because the gate is `display: none` rather than a JS width check, the app is never
painted at desktop sizes, is removed from the accessibility tree along with it, and
there is no flash of the wrong layout on first paint. To change where support ends,
edit the single `desktop` value in `tailwind.config.ts`.

## Photography

Real photographs ship with the repo in `src/assets/images/` and are imported
statically in `src/data/images.ts`, so Next emits intrinsic dimensions and a blur
placeholder for each. They appear as session thumbnails, the discovery mood tiles,
and the player backdrop.

Images are from Unsplash under the Unsplash License — see
`src/assets/images/CREDITS.md` for per-file photo IDs. The profile avatar stays as
gradient initials rather than a stock face, so no real person's likeness is attached
to the fictional account.

## Phone sizing

Layout is fluid rather than fixed, so the design holds from a 320px iPhone SE to a
430px iPhone Pro Max and across Android widths (360/393/412). Type and the larger
blocks use `clamp(min, vw, max)` with the **max pinned to the 390x844 reference
value** — so an iPhone 14 renders the reference exactly, and everything else scales
from it instead of overflowing or stretching.

- The progress ring and its figures on `/activities` are sized in `vw` and share the
  row proportionally, so the calorie figure never clips out of its column.
- Vertical rhythm uses `vh` clamps, which matters on short screens (568/667/740px)
  where fixed spacing previously squashed the player controls into the scrubber.
- The device frame scrolls on the Y axis and clips on the X axis, so a screen that
  still cannot fit a very short viewport scrolls instead of being cut off — while
  the Sleep Analytics pill keeps its intentional bleed off the right edge.

Verified with an automated audit (`scrollWidth` overflow, clipped containers, and
off-viewport elements) across nine devices: iPhone SE 1/2/3, iPhone 13 mini,
iPhone 14, iPhone 15 Pro, iPhone 14 Pro Max, Galaxy S8/S20 and Pixel 7.

## Sound

Two kinds of sound. **Recorded guided sessions and story readings** are
uploaded in Sanity and streamed from its CDN (`track` on a meditation, a
recorded reading on a story); Downloads keeps a copy for offline. **Everything
else** — soundscapes, bells, breath cues — is **synthesised in the browser with
the Web Audio API**, so no ambient audio files ship in the repo: synthesis is
verifiable, licence-free, works offline and never audibly loops. A session or
story with no recording falls back to the breath-paced player or the device's
own voice.

`src/lib/audio/`

| File | Role |
| --- | --- |
| `noise.ts` | White / pink (Kellet filter) / brown noise buffers, LFO helper |
| `voices.ts` | One-shots: struck bells, breath cues, droplets, crickets, bird calls, leaf rustle |
| `soundscapes.ts` | The eight beds, and the lookahead scheduler for sparse events |
| `engine.ts` | The single `AudioContext`, master chain, crossfades, volume, fades |

Eight soundscapes: **Rain, Ocean, Forest, Night, Singing Bowl, Warm Pad, Deep
Drone, Chimes**. Each session in `src/data/meditations.ts` names the one that
plays behind it.

Where sound is used:

- **Player** — play and pause, back and forward 10 seconds, and a scrubber;
  `Space` or `K` play and pause from anywhere on the screen. The session's bed
  starts and stops with the transport. Under a
  recorded voice it plays at about a third of its level so the words stay
  clear; "Ambient background" in Settings switches it off. There is no in-app
  volume or mute control: the phone's own volume buttons set the level (iOS
  ignores a web page's volume anyway). A struck bell closes a completed session
  and the bed fades away over four seconds.
- **Breath cues** — a soft tone at the top of each inhale (528Hz) and exhale
  (396Hz), driven by the same clock as the orb. Toggleable in Preferences.
- **Haptics** — `navigator.vibrate` pulses on the same breath phases, where the
  device supports it. Off by default.
- **Sleep** — a four-sound ambient mixer (Rain, Ocean, Night, Drone). When the
  wind-down timer finishes it fades the sound to silence over 20 seconds rather
  than stopping dead, and deliberately does not ring a bell.

Audio only ever starts from a user gesture, as browsers require, and is torn
down when you leave the screen. A `DynamicsCompressor` on the master bus keeps a
bell landing on a full bed from clipping. In development the engine is exposed as
`window.__serenityAudio` for debugging; the guard strips it from production
builds.

A recording plays through an `<audio>` element beside the engine; the engine
keeps the bed under it (`play(id, level)`).

## Screens beyond the reference

These are not depicted in the artwork, so they are designed in the same language
(same palette, radii, card treatment and type scale):

- `/meditations` — the library by mood, with programs, stories and yoga in tabs
- `/discover` — category filters, session list, mood grid
- `/search` — programs, sessions, stories, yoga, soundscapes and screens in one
  search, forgiving a slip in words of four letters or more
- `/player/[id]` — breathing orb or recorded guide, transport, scrubber,
  session completion
- `/sleep` — the night log (edit or delete last night), summary tiles,
  per-night chart, wind-down timer, sleep sessions
- `/favorites` — Saved: saved sessions and stories, and recently played
- `/downloads`, `/mixes`, `/calendar`, `/reflections`, `/notifications`
- `/help` — sign-in tips for guests; conversations with the Serenity team once
  signed in
- `/profile` — name, account, weekly mindful minutes, preferences, shortcuts

Removing a saved item, an offline copy, a sleep entry, a reflection, a mix or a
calendar entry offers **Undo** for eight seconds (`undo-toast.tsx`). An offline
copy is only deleted once the Undo has passed, since it cannot be fetched back
without a connection.

## Accounts and the server

Much of Serenity works for a guest, on the phone alone. An account is needed
for the player, timer, yoga, stories, Kapwa, reflections, mixes, the calendar,
the assessment and the cancer-support sessions (`MEMBER_ROUTES` in
`src/components/layout/account-gate.tsx`). Help is open to everyone, since
someone who can't sign in is who needs it most.

**Signing in** is by emailed code, with no password (`src/lib/auth.ts`):
Create Account sends a code along with the reader's name, Sign in sends one to
an existing account, and the code is typed into the app. The backend is
**Supabase**, called straight from the app so it works in the static export
and the Capacitor builds alike.

What goes to the server, and nothing more:

| Data | Where it is kept | Code |
| --- | --- | --- |
| Every sitting, and where each session was left | `practice_sessions`, `resume_points` | `src/lib/cloud-sync.ts` |
| Session ratings | `meditation_ratings` | `src/lib/ratings.ts` |
| Video likes (an anonymous account until sign-in) | `video_likes` | `src/lib/video-likes.ts` |
| Kapwa AI replies, when switched on | `kapwa-chat` edge function | `src/lib/kapwa-ai.ts` |
| Help conversations with the Serenity team | Studio's support API | `src/lib/support.ts` |

The phone is always written first, so the app behaves the same offline; sync
follows behind. Reflections, sleep logs, Saved, mixes and settings stay on the
phone, kept per account (see **Accounts on a shared phone**).

**Setting it up**

1. Create a project at [supabase.com](https://supabase.com) (move to Pro before
   launch: Free projects pause after a week of inactivity and have no
   backups).
2. Copy `.env.example` to `.env.local` and fill in the project URL and the
   **publishable** key (`sb_publishable_…`) from **Connect**, or *Settings →
   API Keys*.
3. `npx supabase link --project-ref <ref>`, then `npx supabase db push`.
4. *Authentication → Sign In / Providers*: enable **Email** with OTP codes (set
   *Email OTP Length* to match `NEXT_PUBLIC_AUTH_CODE_LENGTH`, default 6) and
   **Anonymous sign-ins** (used for video likes).

Without the keys the app still builds and runs, as a guest-only app with no
accounts or sync.

Circles, the small groups that sat together each day, has been removed from
the app. Its tables are still created by the five `circles_*` migrations and
tested in `supabase/tests/circles_rls.test.sql`; nothing in the app reads them.

## Structure

```
src/
  app/
    page.tsx              entry gate -> tour or home
    welcome/              four-step first-run tour
    login/                sign in and create account (emailed code)
    activities/           reference screen 3 (no bottom nav)
    (app)/                routes that carry the bottom nav: home, meditations,
                          kapwa, yoga, sleep, help, profile, favorites, ...
    player/ timer/ yoga/ stories/ support/   full-screen players
  components/
    ui/                   shadcn/ui primitives
    layout/               device gate, account gate, nav, menu, undo bar
    home/ meditations/ player/ sleep/ kapwa/ help/ shared/ ...
  content/                content.json, pulled from Sanity at build time
  data/                   shapes the content for screens; settings, shortcuts
  hooks/                  use-downloads, use-narration, use-session-recorder, ...
  lib/                    audio engine, search, sync, auth, stats, reminders
  providers/              app-provider (saved, recents, settings), audio-provider
  types/                  shared domain types
scripts/
  build-routes.mjs        generates the service worker's route list (prebuild)
  sanity/                 content pull, import, narration and recordings
supabase/
  migrations/ functions/  database, row level security, kapwa-chat
studio/                   Sanity Studio and the team's support and analytics API
```

## Behaviour

Content is pulled from Sanity at build time, so browsing needs no server;
accounts and sync are covered above.

- Sessions play on a wall-clock timer (accurate through tab throttling); scrub,
  skip ±10s, pause and resume all work. `Space` / `K` toggle playback.
- The breathing orb derives its phase from the session clock, so the ring, the
  phase label and the countdown can never drift apart.
- Saved items, recently played and preferences persist to `localStorage` (per
  account) and fall back to defaults when storage is unavailable. There is no
  in-app volume; the phone's buttons set it.
- Sessions and sleep sounds are audible: see **Sound** above.
- **Navigation is immediate.** Screens carry no entry animation, the bottom-nav
  highlight moves on tap rather than when the route commits, and destinations
  are prefetched. Measured on a production build: 14-99ms per transition, most
  under 45ms. If navigation feels slow, check you are not on `npm run dev` —
  the dev server compiles each route the first time you visit it, which can add
  seconds that do not exist in `npm run build && npm start`.
- The day selected on `/activities` drives every figure on that screen and is
  keyboard navigable with the arrow keys.

## Accessibility

Every control is reachable and operable by keyboard with a single consistent
focus ring. Icon-only controls carry `aria-label`s, the date strip is a proper
`radiogroup`, toggles are labelled, decorative artwork is `aria-hidden`, and the
breathing phase is announced through an `aria-live` region.
`prefers-reduced-motion` disables all animation.
