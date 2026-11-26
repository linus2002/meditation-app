# Serenity internal testing — explainer video

1:58, 1920 × 1080, 30 fps → `serenity-internal-testing.mp4`

A 15.6 s showreel-style motion intro, then an explainer of the internal-testing
announcement (install, features, what to test, how to send feedback), read by one
Kokoro voice (af_heart). Poppins only, sentence case, semibold at most.

| File | What it does |
| --- | --- |
| `vo.mjs` | Records each voice-over line with Kokoro (kokoro-js). |
| `build_timeline.py` | Builds `timeline.json` from the recorded line lengths: line start times, on-screen beats placed where their words fall, chapter labels, SFX cues. |
| `index.html` + `comp.js` | The composition; `render(t)` paints any frame. |
| `prep_assets.py` | Film-grain tiles. |
| `render.mjs` | Renders frames in headless Chrome (no npm deps). |
| `audio.py` | Synthesizes music + SFX, mixes and ducks the voice, normalizes to −14 LUFS. |

Rebuild from the project root (edit a line in `vo.mjs`, then run all of these):

```powershell
node design/testing-video/vo.mjs
python design/testing-video/build_timeline.py
python design/testing-video/prep_assets.py
node design/testing-video/render.mjs --workers 8
python design/testing-video/audio.py
ffmpeg -y -framerate 30 -i design/testing-video/build/frames/f%04d.jpg -i design/testing-video/build/audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -af "alimiter=limit=0.84:level=disabled" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart design/testing-video/serenity-internal-testing.mp4
```
