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
the *Daily reminder* toggle does not schedule anything yet.

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
- **Today's Reflection is added below the reference content**, so the screen still
  opens exactly as drawn and the new section is found by scrolling past *Start
  Your Goal*. Nothing in the reference composition moved.

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

## Structure

```
src/
  app/
    page.tsx              intro screen
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
  hooks/                  use-player, use-breath, use-countdown,
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
