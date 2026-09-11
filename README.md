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
- **The nav carries exactly three icon-only destinations** (heart, cog, alarm), as
  drawn. Discovery and saved sessions are reached from the header search control
  and the deck card overflow menus rather than by adding nav items.
- **Copy is transcribed verbatim**, including `Ready to start your first sessiom`
  on the Start Your Goal card — the reference spells it that way. Change the string
  in `src/components/home/start-goal-card.tsx` if you want it corrected.
- **Dark surface only.** The reference shows a single dark treatment, so no theme
  toggle is exposed. Light tokens exist in `globals.css` purely so the shadcn/ui
  primitives stay well-formed.
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

Three steps at `/welcome`, shown once on a fresh install and never again.

1. Full-bleed abstract sweep, wordmark and tagline low on the screen, a filled
   primary and an outlined secondary.
2. A tilted grid of session artwork running off every edge, with the promise
   set over it.
3. The original reference intro screen — headline weight mix, wave lines,
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

Every sound in the app is **synthesised in the browser with the Web Audio API** —
there are no audio files in the repo. That was a deliberate call: bundling stock
audio would mean shipping tracks whose contents could not be verified, plus tens
of megabytes of binaries and a licence to honour. Synthesis is verifiable,
license-free, works offline, and never audibly loops.

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

- **Player** — the session's bed starts and stops with the transport, with a
  mute toggle and level slider. A struck bell closes a completed session and the
  bed fades away over four seconds.
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

To use recorded tracks instead, give `Meditation` an audio URL and swap the
`engine.play()` body for an `<audio>` element or `AudioBufferSourceNode` — the
provider API (`play` / `stop` / `fadeOut` / `setVolume`) would not change.

## Screens beyond the reference

These are not depicted in the artwork, so they are designed in the same language
(same palette, radii, card treatment and type scale):

- `/discover` — search, category filters, session list, mood grid
- `/player/[id]` — breathing orb, transport, scrubber, session completion
- `/sleep` — sleep summary tiles, per-night chart, wind-down timer, sleep sessions
- `/favorites` — saved and recently played
- `/profile` — account, weekly mindful minutes, preference toggles, shortcuts

## Circles

Small groups — never more than twenty — that sit at the same time each day. It
is the one feature that talks to a server: **Supabase** (Postgres, Auth and
Realtime), called straight from the browser so it works in the static export
and in the Capacitor apps alike. Everything else stays on the device.

| Piece | Where |
| --- | --- |
| Schema, security rules, server functions, launch circles | `supabase/migrations/` |
| Security tests (pgTAP) | `supabase/tests/circles_rls.test.sql` |
| Pure logic — time zones, schedule, matching, streak, feed | `src/lib/circles/` (unit-tested) |
| The only module that calls Supabase | `src/lib/circles/api.ts` |
| Membership cache, local choices | `src/providers/circles-provider.tsx` |
| Posting sits, circle reminders | `src/components/layout/circle-sync.tsx` |
| Screens | `/circles`, `/circles/join`, `/circles/view?id=`, `/circles/live?id=` |

**How it behaves**

- **Joining.** Three questions (goal, time of day, experience) suggest two or
  three circles; the reader picks. The answers never leave the phone. Joining
  creates an anonymous account — no email — and nothing is created for anyone
  who never opens Circles.
- **Live sessions.** "Synced" means a shared clock, not a shared stream: the
  session starts at its scheduled instant for everyone, and a late arrival
  starts where the others are. The room opens five minutes early and closes to
  newcomers halfway through; after that the circle page offers a solo sit,
  which still counts. Presence shows who is actually connected, nothing more.
- **The feed** says who joined, who sat (never for how long) and each day's
  one-line prompt answer. Answers can be hidden per person or reported; two
  reports hide one.
- **The streak belongs to the circle.** A day counts once three members — or
  everyone, in a circle of fewer than three — have sat. Counted days are
  latched on the server, so leaving never rewrites the past. No leaderboards,
  no individual numbers, no "streak lost" messages.
- **Reminders** arrive ten minutes before each session, when switched on.
  Never after the start, never about anyone else's activity.
- **Nothing is invented.** Circles launch empty and say "Be one of the first".

**Setting it up**

1. Create a project at [supabase.com](https://supabase.com) (the Free plan is
   enough to build and test; move to Pro before launch — Free projects pause
   after a week of inactivity and have no backups).
2. Copy `.env.example` to `.env.local` and fill in the project URL and the
   **publishable** key (`sb_publishable_…`) from the **Connect** button at the
   top of the dashboard, or *Settings → API Keys*. A legacy anon key also works.
3. Apply the migrations — either `npx supabase link --project-ref <ref>` then
   `npx supabase db push`, or paste the four files into the SQL editor in order.
4. In the dashboard: *Authentication → Sign In / Providers* → enable
   **Anonymous sign-ins**, and *Realtime → Settings* → turn **off** "Allow
   public access" so the private-channel rules apply. Leave CAPTCHA **off** for
   now: the app does not send a CAPTCHA token yet, so switching it on would
   make every join fail. Adding Turnstile is a pre-launch task.
5. Optional: `npx supabase start` and `npx supabase test db` (needs Docker) to
   run the security tests locally.

Without the two keys the app still builds and runs; Circles shows as not
available. Launch circles are seeded for `Asia/Manila` and `Europe/London` —
change them in the seed migration for the markets you actually launch in.

## Structure

```
src/
  app/
    page.tsx              entry gate -> tour or home
    welcome/              three-step first-run tour
    activities/           reference screen 3 (no bottom nav)
    (app)/                routes that carry the bottom nav
      home/ discover/ sleep/ favorites/ profile/
    player/[id]/          full-screen session player
  components/
    ui/                   shadcn/ui primitives
    layout/               device gate, screen shell, nav, headers
    home/ activities/ player/ sleep/ discover/ shared/
  data/                   typed mock catalogue, stats, sleep, settings, photos, prompts
  assets/images/          bundled photography + CREDITS.md
  hooks/                  use-player, use-breath, use-countdown, use-narration,
                          use-session-recorder, use-wake-lock
  lib/audio/              Web Audio synthesis engine and soundscapes
  lib/session-stats.ts    progress derived from recorded sittings
scripts/
  build-routes.mjs        generates the service worker's route list (prebuild)
  providers/              app-provider (favorites, recents, settings), audio-provider
  lib/                    cn, formatters, SVG arc geometry
  types/                  shared domain types
```

## Behaviour

All interactions are functional against local TypeScript data — no backend.

- Sessions play on a wall-clock timer (accurate through tab throttling); scrub,
  skip ±15s, pause and resume all work. `Space` / `K` toggle playback.
- The breathing orb derives its phase from the session clock, so the ring, the
  phase label and the countdown can never drift apart.
- Favorites, recently played, preference toggles and the audio level persist to
  `localStorage` and degrade to seeded defaults when storage is unavailable.
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
