"""Prepares derived image assets for the promo composition.

Run from the project root:  python design/promo-video/prep_assets.py
- kapwa.png: the Kapwa mascot with its soft halo/fringe removed so it sits
  cleanly on the dark canvas at large sizes.
- grain-0..5.png: small noise tiles cycled per frame for film grain.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.getcwd()
OUT = os.path.join(ROOT, "design", "promo-video", "build", "assets")
os.makedirs(OUT, exist_ok=True)

# --- Kapwa: tighten alpha, then pull edge colours from the solid interior.
im = Image.open(os.path.join(ROOT, "src", "assets", "images", "kapwaicon.png")).convert("RGBA")
a = np.asarray(im).astype(np.float32) / 255.0
alpha = a[..., 3]
hard = np.clip((alpha - 0.62) / 0.3, 0, 1)
# Erode a touch to drop the bright cyan rim, then soften for anti-aliasing.
mask = Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
m = np.asarray(mask).astype(np.float32) / 255.0
rgb = a[..., :3]
out = np.dstack([rgb, m])
img = Image.fromarray((out * 255).astype(np.uint8), "RGBA")
bbox = img.getbbox()
img = img.crop(bbox)
img.save(os.path.join(OUT, "kapwa.png"))
print("kapwa", img.size)

# --- Grain tiles.
rng = np.random.default_rng(7)
for i in range(6):
    n = rng.normal(0.5, 0.17, (360, 360))
    n = np.clip(n, 0, 1)
    g = (n * 255).astype(np.uint8)
    Image.fromarray(g, "L").convert("RGB").save(os.path.join(OUT, f"grain-{i}.png"))
print("grain ok")
