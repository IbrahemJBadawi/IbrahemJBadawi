"""Builds public/og.png (1200x630) from the original logo mark.

Run once when the brand line changes: python3 scripts/make-og.py
Needs Pillow with raqm (Arabic shaping) and `npm install` (for the font files).
"""
from PIL import Image, ImageDraw, ImageFont

FONTS = "node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-"
W, H = 1200, 630
NAVY, ROYAL, SKY, MUTED = (11, 27, 63), (29, 78, 216), (56, 189, 248), (71, 85, 105)

img = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(img)
# quiet technical grid
for x in range(0, W, 40):
    d.line([(x, 0), (x, H)], fill=(241, 245, 252))
for y in range(0, H, 40):
    d.line([(0, y), (W, y)], fill=(241, 245, 252))
d.rectangle([0, H - 10, W, H], fill=ROYAL)
d.rectangle([0, H - 10, 260, H], fill=SKY)

mark = Image.open("public/brand/logo.png").convert("RGBA").resize((300, 300), Image.LANCZOS)
img.paste(mark, (820, 150), mark)

latin = lambda w, s: ImageFont.truetype(f"{FONTS}latin-{w}-normal.woff", s)
arabic = lambda w, s: ImageFont.truetype(f"{FONTS}arabic-{w}-normal.woff", s)
d.text((90, 170), "TechMood", font=latin(700, 92), fill=NAVY)
d.text((92, 272), "TECHNOLOGY", font=latin(500, 34), fill=ROYAL, spacing=8)
d.text((92, 350), "Building Future Digital Leaders", font=latin(500, 38), fill=MUTED)
d.text((92, 420), "تيك مود للتكنولوجيا، نبني قادة المستقبل الرقمي", font=arabic(600, 34), fill=NAVY,
       direction="rtl", language="ar")
img.save("public/og.png", optimize=True)
print("public/og.png written")
