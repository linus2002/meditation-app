# Getmeds Meditation landing page — drop-in

One component file plus its images, for a Next.js (App Router) site that uses Tailwind CSS.

## What's here

```
MeditationsLanding.tsx          the whole page, one file ('use client')
public/meditations-app/
  mockup.webp                   hand + phone photo (transparent screen)
  kapwa.png                     Kapwa icon
  screens/*.webp                13 dark-mode app screenshots shown in the phones
```

## Install

1. Copy `MeditationsLanding.tsx` into your components folder, e.g. `src/components/`.
2. Copy the `public/meditations-app` folder into your site's `public/` folder.
3. Install the icon library: `npm i lucide-react`
4. Render it on the page, e.g. `src/app/meditations/page.tsx`:

   ```tsx
   import MeditationsLanding from '@/components/MeditationsLanding';

   export default function Page() {
     return <MeditationsLanding />;
   }
   ```

Your site's own header and footer wrap it; the page has none of its own.

## Settings (top of the file)

- `APP_STORE_URL`, `PLAY_STORE_URL`: the store links (placeholders for now).
- `ASSET_BASE`: where the images are served from (`/meditations-app`).
- `COUNTS`: the numbers in "Calm you can see" (74 sessions, 10 programs, 16 stories, 20 yoga flows).
- `PROGRAMS`: the four programmes on the path; artwork loads from the app's Sanity CDN.

## Requirements

- Tailwind CSS 3.4+ or 4, scanning the folder you put the file in.
- Poppins (300–700) loaded by the site.
- No `tailwind.config` or `next.config` changes needed: images are plain `<img>` tags.
