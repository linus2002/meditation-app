"""Grain tiles for the internal-testing explainer.

Run from the project root:  python design/testing-video/prep_assets.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.getcwd()
OUT = os.path.join(ROOT, "design", "testing-video", "build", "assets")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
for i in range(6):
    g = (np.clip(rng.normal(0.5, 0.17, (360, 360)), 0, 1) * 255).astype(np.uint8)
    Image.fromarray(g, "L").convert("RGB").save(os.path.join(OUT, f"grain-{i}.png"))
print("ok")
