import sys, numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageDraw
src, out = sys.argv[1], sys.argv[2]
base = Image.open(src).convert('RGB').resize((600, 900))
a = np.asarray(base).astype(float) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299*r + 0.587*g + 0.114*b
ink = np.clip((0.85 - lum) / 0.6, 0, 1)
gold = np.clip(((r - b) - 0.25) / 0.3, 0, 1) * np.clip((r - 0.45) / 0.3, 0, 1)
ink = ink * (1 - gold)
paper = np.array([0.95, 0.93, 0.88]); inkc = np.array([0.11, 0.10, 0.13]); goldc = np.array([0.86, 0.68, 0.32])
def comp(inkm, goldm, bg=paper, ic=inkc, gc=goldc):
    img = bg*(1-inkm[..., None]) + ic*inkm[..., None]
    img = img*(1-goldm[..., None]) + gc*goldm[..., None]
    return Image.fromarray((np.clip(img, 0, 1)*255).astype('uint8'))
def blur(m, rad):
    return np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(rad))).astype(float)/255
def dilate(m, k):
    return np.asarray(Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(k))).astype(float)/255
# Balanced
bal = comp(ink, gold)
# Too Much: over-inked lines, doubled offset, gold flooding
heavy = np.clip(dilate(ink, 5) + 0.6*np.roll(dilate(ink, 3), 6, axis=1), 0, 1)
flood = np.clip(gold + 1.6*blur(gold, 28), 0, 1)
much = comp(heavy*(1-0.6*flood), flood)
# Too Little: faded, broken line, dim gold
rng = np.random.default_rng(7)
noise = blur(rng.random(ink.shape), 3)
broken = ink * (noise > 0.5) * 0.45
little = comp(broken, gold*0.35)
# Unacknowledged: the shadow - light on night
night = np.array([0.04, 0.04, 0.08]); light = np.array([0.93, 0.88, 0.76])
unack = comp(ink, gold, bg=night, ic=light, gc=goldc)
glow = unack.filter(ImageFilter.GaussianBlur(5))
unack = ImageChops.screen(unack, Image.blend(Image.new('RGB', unack.size), glow, 0.5))
W, H = 600, 900
sheet = Image.new('RGB', (4*W + 5*20, H + 70), (30, 30, 30)); d = ImageDraw.Draw(sheet)
for k, (im, lab) in enumerate([(bal, 'BALANCED: clean ink, one gold'), (much, 'TOO MUCH: over-inked, gold floods'), (little, 'TOO LITTLE: faded, broken line'), (unack, 'UNACKNOWLEDGED: the shadow (negative)')]):
    x = 20 + k*(W+20); sheet.paste(im, (x, 55)); d.text((x, 20), lab, fill=(235, 235, 235))
sheet.save(out, quality=88)
