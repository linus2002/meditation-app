# Serenity promo video

25 s, 1080 × 1920 (9:16), 30 fps → `serenity-promo.mp4`

Everything is generated locally from the project's own assets: the screenshots in
`public/landing/screens/dark/`, the app icon `public/icons/icon-1024.png`, the Kapwa
art `src/assets/images/kapwaicon.png`, Poppins from `src/assets/fonts/`, and the brand
mark paths and colours from `design/brand-board/`.

| File | What it does |
| --- | --- |
| `timeline.json` | Scene cuts, voice-over cue times and every sound-effect cue. Picture and audio both read it. |
| `index.html` + `comp.js` | The composition: `render(t)` paints any frame. CSS-3D titanium phone, pop-out UI cards, kinetic type. |
| `vo.mjs` | Voice-over with Kokoro (open source, Apache-2.0) via `kokoro-js`, voice `af_heart`. |
| `prep_assets.py` | Cleans the Kapwa art's edge halo and makes the film-grain tiles. |
| `render.mjs` | Renders frames in headless Chrome over the DevTools protocol (no npm deps). |
| `audio.py` | Synthesizes the 100 BPM music and all SFX from scratch, mixes the VO with ducking, normalizes to −14 LUFS. |

Rebuild from the project root:

```powershell
node design/promo-video/vo.mjs
python design/promo-video/prep_assets.py
node design/promo-video/render.mjs --workers 8
python design/promo-video/audio.py
ffmpeg -y -framerate 30 -i design/promo-video/build/frames/f%04d.jpg -i design/promo-video/build/audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -t 25 -movflags +faststart design/promo-video/serenity-promo.mp4
```

Preview single moments while editing: `node design/promo-video/render.mjs --at 4.9,10.3,24.5`
(stills land in `build/stills/`; `python design/promo-video/sheet.py` tiles them).
