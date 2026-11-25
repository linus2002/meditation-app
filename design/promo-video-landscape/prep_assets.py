"""Derived images for the landscape promo: session artwork thumbnails and grain tiles.

Run from the project root:  python design/promo-video-landscape/prep_assets.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.getcwd()
OUT = os.path.join(ROOT, "design", "promo-video-landscape", "build", "assets")
os.makedirs(OUT, exist_ok=True)
ART = ["openheart", "oceandrift", "settlesoften-clean", "morningclarity-clean", "freeyourmind-clean",
       "nightwinddown-clean", "quietthenoise-clean", "rainonglass-clean", "boxbreathe-clean", "thelighthousekeeper"]
for n in ART:
    im = Image.open(os.path.join(ROOT, "src", "assets", "images", f"{n}.png")).convert("RGB")
    im.resize((560, 560), Image.LANCZOS).save(os.path.join(OUT, f"{n.replace('-clean', '')}.jpg"), quality=90)
# a large one for the whip transition
Image.open(os.path.join(ROOT, "src", "assets", "images", "openheart.png")).convert("RGB").save(os.path.join(OUT, "openheart-big.jpg"), quality=90)
rng = np.random.default_rng(7)
for i in range(6):
    g = (np.clip(rng.normal(0.5, 0.17, (360, 360)), 0, 1) * 255).astype(np.uint8)
    Image.fromarray(g, "L").convert("RGB").save(os.path.join(OUT, f"grain-{i}.png"))
print("ok")
