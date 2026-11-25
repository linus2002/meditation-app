# Serenity promo — 16:9

21 s, 1920 × 1080, 30 fps → `serenity-promo-16x9.mp4`

Same toolchain as `design/promo-video/` (portrait): `timeline.json` drives picture and sound,
`comp.js` paints any frame, `render.mjs` renders in headless Chrome, `audio.py` synthesizes
music + SFX and mixes the two-voice Kokoro VO (af_heart / am_michael) from `vo.mjs`.

Rebuild from the project root:

```powershell
node design/promo-video-landscape/vo.mjs
python design/promo-video-landscape/prep_assets.py
node design/promo-video-landscape/render.mjs --workers 8
python design/promo-video-landscape/audio.py
ffmpeg -y -framerate 30 -i design/promo-video-landscape/build/frames/f%04d.jpg -i design/promo-video-landscape/build/audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -t 21 -movflags +faststart design/promo-video-landscape/serenity-promo-16x9.mp4
```
