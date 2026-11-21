"""Contact sheet of rendered stills: python design/promo-video/sheet.py [cols] [width]"""
import glob, os, sys
from PIL import Image, ImageDraw

d = os.path.join("design", "promo-video", "build", sys.argv[3] if len(sys.argv) > 3 else "stills")
files = sorted(glob.glob(os.path.join(d, "t*.jpg")), key=lambda p: float(os.path.basename(p)[1:-4]))
cols = int(sys.argv[1]) if len(sys.argv) > 1 else 6
w = int(sys.argv[2]) if len(sys.argv) > 2 else 300
h = int(w * 1920 / 1080)
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + 6), rows * (h + 6)), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).resize((w, h))
    x, y = (i % cols) * (w + 6), (i // cols) * (h + 6)
    sheet.paste(im, (x, y))
    dr.rectangle([x, y, x + 64, y + 22], fill=(255, 0, 90))
    dr.text((x + 4, y + 4), os.path.basename(f)[1:-4], fill=(255, 255, 255))
sheet.save(os.path.join("design", "promo-video", "build", "sheet.jpg"), quality=88)
print(len(files), "stills")
