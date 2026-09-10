# Getting Serenity onto a phone

Three routes, in increasing order of effort. Start at 1 to hold it in your hand
today; go to 3 only when you actually want it in the app stores.

The repo is already prepared for all three: app icons, a web manifest, an
offline service worker, a static-export build mode, and a Capacitor config.

---

## 1. On your phone in two minutes (same Wi‑Fi, nothing to sign up for)

Good for showing someone, or checking how it feels in the hand.

```bash
npm run dev -- -H 0.0.0.0
```

Find your PC's address on the network:

```bash
ipconfig | findstr /i "IPv4"
```

On your phone (connected to the **same Wi‑Fi**), open `http://<that-address>:3000`
— for example `http://192.168.1.24:3000`.

Caveats: it only works while your PC is on and running the dev server, and
because it is plain `http` you cannot "install" it to the home screen properly.
For that, go to step 2.

---

## 2. Install it as a real home‑screen app (free, no stores, ~15 minutes)

This gives you an icon on the home screen, no browser chrome, and offline use.
On Android it is genuinely indistinguishable from a store app for something like
this. **This is the option I would pick first.**

### a. Put it on the internet

The app is a normal Next.js build, so any host works. Vercel is the least
friction:

```bash
npm i -g vercel
vercel            # answer the prompts; accept the defaults
vercel --prod
```

You get a URL like `https://serenity-xyz.vercel.app`. HTTPS matters here — the
service worker and home‑screen install only work over HTTPS.

### b. Install it

**Android (Chrome):** open the URL → menu ⋮ → **Install app** (or *Add to Home
screen*). Chrome may also show an install prompt on its own.

**iPhone (must be Safari):** open the URL → Share button → **Add to Home
Screen**. Chrome on iOS cannot install PWAs; it has to be Safari.

You now have a Serenity icon that launches full‑screen with no address bar, and
keeps working with no signal.

### What you do **not** get this way

- No Play Store / App Store listing.
- iOS is stricter: sound stops when you lock the screen or switch apps (see
  **Background audio** below).
- No push notifications on iOS unless the app was installed to the home screen,
  and even then support is limited.

---

## 3. Real Android and iOS apps with Capacitor

Capacitor (v8, already installed here) wraps the built web app in a native shell
and produces a real `.aab` / `.ipa` you can submit to the stores.

### The build the native apps use

```bash
npm run build:mobile
```

This runs Next in **static export** mode (`MOBILE_BUILD=1`) and writes a
self‑contained site to `out/`. The normal `npm run build` is unaffected.

### Android — you can do this on this PC

Android Studio is already installed on this machine. You also need a JDK;
Android Studio's bundled one is the safe choice.

```bash
npx cap add android      # once — creates the android/ project
npm run open:android     # rebuilds, syncs, and opens Android Studio
```

Then in Android Studio:

- Plug in a phone with **USB debugging** on (Settings → About phone → tap *Build
  number* 7 times → Developer options → USB debugging) and press **Run**. The app
  installs straight onto the device.
- To share a test build: **Build → Build Bundle(s)/APK(s) → Build APK(s)**, then
  send the `.apk` to anyone; they enable "install unknown apps" and open it.
- To publish: **Build → Generate Signed Bundle** (`.aab`), then upload it in the
  [Google Play Console](https://play.google.com/console). One‑time **$25**
  registration. Review typically takes a few days.

If a step complains about a missing tool, run `npx cap doctor` — it names exactly
what is missing.

### Reminders that arrive with the app closed

The daily reminder (07:00) and bedtime wind‑down (22:30) on the profile screen
work in two different ways, and it is worth knowing which you are getting.

In a **browser or installed PWA** they are delivered by the app itself, so they
only arrive while Serenity is open. That is a limit of the web platform, not a
bug: waking a closed web app needs a push server, and this app has none. The
profile screen says as much under the toggles.

In a **native build** the OS holds the schedule and the nudge arrives whether or
not the app has been opened for a week. That needs one plugin, installed once
per platform you have added:

```bash
npm install @capacitor/local-notifications
npx cap sync
```

Nothing else changes. The app reaches the plugin through the Capacitor bridge at
runtime ([`src/lib/notifications.ts`](src/lib/notifications.ts)), so the web
build never imports it, and a native build without it simply falls back to the
in‑app behaviour instead of erroring.

On Android 13+ the OS asks for notification permission the first time a toggle is
switched on. On iOS, permission is requested the same way; a reader who declines
sees the toggle stay off with an explanation, rather than an on switch that does
nothing.

### iOS — this needs a Mac

There is no way around this: building an iOS app requires **macOS with Xcode**.
It cannot be done on Windows.

On the Mac (with Xcode and CocoaPods installed):

```bash
npm install
npx cap add ios
npm run open:ios         # rebuilds, syncs, and opens Xcode
```

Then:

- **Free, on your own iPhone:** sign in with a normal Apple ID in Xcode →
  *Signing & Capabilities* → select your team → press Run. The app installs on
  your device but expires after **7 days** and must be re‑installed.
- **TestFlight / App Store:** needs the [Apple Developer
  Program](https://developer.apple.com/programs/), **$99/year**. Archive in Xcode
  → upload to App Store Connect → distribute via TestFlight or submit for
  review. Review typically takes 1–3 days.

### Before you submit to either store

Change the bundle identifier in `capacitor.config.ts` from the placeholder to
something you own:

```ts
appId: 'com.example.serenity',   // ← change this, e.g. com.yourname.serenity
```

It cannot be changed after a store listing exists.

---

## Things you should know before going native

These are real, and they affect this app specifically.

### Background audio

The soundscapes are generated with the Web Audio API inside a WebView. **When
the app is backgrounded or the screen locks, iOS suspends the WebView and the
sound stops.** For a sleep‑sounds feature that is a genuine problem, and it
applies to the PWA route too.

Options, cheapest first:

1. Keep the screen on during a session with
   [`@capacitor-community/keep-awake`](https://github.com/capacitor-community/keep-awake).
   A few lines; solves the "I'm looking at it" case, not the "phone in my pocket"
   case.
2. Render the eight soundscapes to seamless audio loops once, ship them as
   files, and play them through a native audio plugin with the background‑audio
   capability enabled. This is the proper fix, and the audio provider API
   (`play` / `stop` / `fadeOut` / `setVolume`) was written so the engine
   underneath can be swapped without touching any screen.

### The daily reminder toggle does nothing yet

`Preferences → Daily reminder` is currently just a stored boolean. To make it
real, add [`@capacitor/local-notifications`](https://capacitorjs.com/docs/apis/local-notifications)
and schedule from the toggle. Same for *Bedtime wind down*.

### Apple's "minimum functionality" rule

Apple rejects apps that are thin wrappers around a website (App Store Review
Guideline 4.2). Serenity is a reasonable case — it works fully offline, stores
data locally, and synthesises its own audio — but wrapping a web app always
attracts some scrutiny. Wiring up native notifications, haptics and background
audio both improves the app and materially helps it through review. Android has
no equivalent rule.

### The tablet gate

`DeviceStage` hides the app above **1024px** wide. An iPad in landscape is
1366pt, so it would show the "Made for phones and tablets" screen. If you want a
proper iPad app, raise or remove the `desktop` breakpoint in
`tailwind.config.ts`.

### Data lives on the device

Favourites, preferences and volume are in `localStorage`, which persists inside
the WebView. There is no account and no server, so nothing syncs between
devices. Adding that means adding a backend.

---

## Quick comparison

| | Wi‑Fi (1) | PWA (2) | Native (3) |
| --- | --- | --- | --- |
| Time | 2 min | ~15 min | Days |
| Cost | Free | Free | $25 Android, $99/yr iOS |
| Needs a Mac | No | No | **Yes, for iOS** |
| Home‑screen icon | No | Yes | Yes |
| Works offline | No | Yes | Yes |
| In the app stores | No | No | Yes |
| Audio with screen locked | No | No | Only with native audio |
