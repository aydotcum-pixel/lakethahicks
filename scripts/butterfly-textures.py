"""Procedural, photographic-style butterfly wing textures for lakethahicks.com.

Renders, per species, the LEFT wing pair (forewing + hindwing, hinge at the right edge)
for the upper side (dorsal) and the underside (ventral), plus a body with antennae.
The site mirrors the left wing for the right side and folds them in 3D.
Everything is supersampled 4x and downscaled for clean edges.
"""
import math, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SS = 1536            # working resolution
OUT = 384            # final size (square, per wing pair)
OUTDIR = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUTDIR, exist_ok=True)
rng = np.random.default_rng(7)

Y, X = np.mgrid[0:SS, 0:SS].astype(np.float32)
S = SS / 1024.0      # control points are authored on a 1024 grid


def catmull(points, n=24, closed=True):
    pts = [(x * S, y * S) for x, y in points]
    if closed:
        pts = pts[-1:] + pts + pts[:2]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    return out


def mask_of(poly):
    im = Image.new('L', (SS, SS), 0)
    ImageDraw.Draw(im).polygon(poly, fill=255)
    return np.asarray(im, np.float32) / 255.0


def lattice(shape, seed):
    r = np.random.default_rng(seed)
    return r.random(shape).astype(np.float32)


def value_noise(u, v, seed, period_u=None):
    """Smooth value noise sampled at float coordinates (u, v)."""
    g = lattice((int(np.max(u)) + 3, int(np.max(v)) + 3), seed)
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - iu, v - iv
    fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
    a = g[iu, iv]; b = g[iu + 1, iv]; c = g[iu, iv + 1]; d = g[iu + 1, iv + 1]
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv


def fbm(u, v, seed, oct=4):
    tot, amp, norm = 0, 1.0, 0
    for o in range(oct):
        tot = tot + value_noise(u * (2 ** o), v * (2 ** o), seed + o * 17) * amp
        norm += amp; amp *= .5
    return tot / norm


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    t = t[..., None] if np.ndim(t) == 2 else t
    return a * (1 - t) + b * t


def col(*rgb):
    return np.array(rgb, np.float32) / 255.0


def smooth_open(pts, n=10):
    if len(pts) < 3:
        return pts
    P = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1])
    return out


def draw_lines(lines, width, blur=0):
    lines = [smooth_open(l) for l in lines]
    im = Image.new('L', (SS, SS), 0)
    d = ImageDraw.Draw(im)
    for ln in lines:
        pts = [(x * S, y * S) for x, y in ln]
        w = width
        # taper: draw segments thinner toward the end
        for i in range(len(pts) - 1):
            ww = max(1, int(w * S * (1 - 0.55 * i / max(1, len(pts) - 1))))
            d.line([pts[i], pts[i + 1]], fill=255, width=ww)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur * S))
    return np.asarray(im, np.float32) / 255.0


def dots(centers, radius, blur=1.5):
    im = Image.new('L', (SS, SS), 0)
    d = ImageDraw.Draw(im)
    for (x, y, r) in centers:
        rr = (r if r else radius) * S
        d.ellipse([x * S - rr, y * S - rr * .85, x * S + rr, y * S + rr * .85], fill=255)
    im = im.filter(ImageFilter.GaussianBlur(blur * S))
    return np.asarray(im, np.float32) / 255.0


def finish(rgb, alpha, name):
    # soft translucency at the very edge, fine fringe of scales
    a = np.clip(alpha, 0, 1)
    rgba = np.dstack([np.clip(rgb, 0, 1), a])
    im = Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA').resize((OUT, OUT), Image.LANCZOS)
    im.save(os.path.join(OUTDIR, name + '.webp'), 'WEBP', quality=88, method=6)
    im.save(os.path.join(OUTDIR, name + '.png'))
    return im


# ----------------------------------------------------------------- shapes
# Left wing pair, hinge at the right edge around x = 990, body axis vertical.
SHAPES = {
    'morpho': {
        'fore': [(994, 372), (900, 300), (760, 210), (600, 140), (430, 92), (270, 66), (150, 64), (92, 92), (88, 150), (110, 240), (148, 340), (190, 430), (232, 505), (300, 540), (420, 556), (580, 566), (760, 566), (900, 552), (994, 530)],
        'hind': [(994, 470), (820, 470), (600, 476), (420, 488), (300, 520), (248, 600), (244, 700), (282, 800), (350, 885), (450, 950), (580, 986), (712, 970), (830, 912), (920, 820), (976, 715), (994, 620)],
        'base': (985, 500),
    },
    'monarch': {
        'fore': [(994, 380), (900, 300), (760, 200), (600, 120), (430, 70), (280, 44), (160, 46), (96, 80), (86, 140), (106, 228), (150, 320), (206, 410), (270, 486), (360, 530), (500, 552), (680, 560), (850, 552), (994, 532)],
        'hind': [(994, 470), (820, 470), (620, 478), (460, 494), (350, 530), (296, 600), (288, 700), (320, 800), (386, 880), (480, 944), (600, 976), (720, 962), (830, 906), (916, 818), (972, 712), (994, 620)],
        'base': (985, 500),
    },
}


def radial_veins(base, outer_pts, bend=0.12):
    """Veins from near the base out to points on the margin, gently curved."""
    bx, by = base
    lines = []
    for (ox, oy) in outer_pts:
        mx, my = (bx + ox) / 2, (by + oy) / 2
        nx, ny = -(oy - by), (ox - bx)
        L = math.hypot(nx, ny) or 1
        mx += nx / L * bend * math.hypot(ox - bx, oy - by) * 0.25
        my += ny / L * bend * math.hypot(ox - bx, oy - by) * 0.25
        line = []
        for k in range(13):
            t = k / 12
            x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * mx + t * t * ox
            y = (1 - t) ** 2 * by + 2 * (1 - t) * t * my + t * t * oy
            line.append((x, y))
        lines.append(line)
    return lines


def venation(sp):
    # forewing: discal cell, veins branching from its outer edge, costal and anal veins
    if sp == 'morpho':
        fcell = [(975, 452), (790, 342), (590, 320), (476, 378), (540, 452), (760, 486), (975, 496)]
        fout = [(250, 72), (150, 92), (104, 160), (112, 250), (146, 340), (190, 425), (238, 500)]
        hcell = [(975, 560), (790, 556), (620, 600), (550, 680), (600, 762), (780, 724), (975, 612)]
        hout = [(256, 640), (262, 740), (300, 830), (380, 915), (500, 968), (640, 982), (770, 940), (880, 860)]
        costa = [(975, 440), (760, 290), (520, 170), (300, 96), (170, 70)]
        anal = [(975, 512), (700, 548), (420, 548), (250, 516)]
    else:
        fcell = [(975, 452), (790, 340), (590, 318), (470, 372), (530, 446), (760, 484), (975, 496)]
        fout = [(250, 50), (150, 76), (100, 140), (110, 230), (150, 320), (206, 405), (262, 478)]
        hcell = [(975, 560), (790, 556), (630, 600), (560, 680), (610, 760), (790, 724), (975, 612)]
        hout = [(304, 640), (300, 740), (340, 840), (420, 912), (530, 962), (660, 972), (780, 930), (880, 850)]
        costa = [(975, 440), (760, 280), (520, 150), (300, 70), (180, 52)]
        anal = [(975, 512), (700, 548), (450, 546), (285, 498)]
    lines = [fcell, hcell, costa, anal]
    def along(poly, i0, i1, n):
        pts = poly[i0:i1 + 1]
        out = []
        for k in range(n):
            t = k / max(1, n - 1) * (len(pts) - 1)
            j = min(int(t), len(pts) - 2); f = t - j
            out.append((pts[j][0] * (1 - f) + pts[j + 1][0] * f, pts[j][1] * (1 - f) + pts[j + 1][1] * f))
        return out
    for (a, b) in zip(along(fcell, 1, 4, len(fout)), fout):
        lines.append([a, ((a[0] + b[0]) / 2 + (b[1] - a[1]) * .05, (a[1] + b[1]) / 2 - (b[0] - a[0]) * .05), b])
    for (a, b) in zip(along(hcell, 2, 5, len(hout)), hout):
        lines.append([a, ((a[0] + b[0]) / 2 - (b[1] - a[1]) * .04, (a[1] + b[1]) / 2 + (b[0] - a[0]) * .04), b])
    return lines


def dots_along(poly_pts, mask, inset, spacing, radius, skip=None):
    pts = catmull(poly_pts, n=40)
    m = mask > .5
    centers = []
    acc = 0
    for i in range(len(pts)):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % len(pts)]
        seg = math.hypot(x1 - x0, y1 - y0)
        acc += seg
        if acc < spacing * S:
            continue
        acc = 0
        tx, ty = (x1 - x0) / (seg or 1), (y1 - y0) / (seg or 1)
        for sgn in (1, -1):
            nx, ny = -ty * sgn, tx * sgn
            cx, cy = x0 + nx * inset * S, y0 + ny * inset * S
            if 0 <= int(cy) < SS and 0 <= int(cx) < SS and m[int(cy), int(cx)]:
                if not (skip and skip(cx / S, cy / S)):
                    centers.append((cx / S, cy / S, radius))
                break
    return dots(centers, radius, 1.4)


def edge_distance(mask):
    return ndimage.distance_transform_edt(mask > 0.5) / S   # in 1024-grid units


def scale_texture(seed, base):
    bx, by = base[0] * S, base[1] * S
    r = np.hypot(X - bx, Y - by) / S
    th = np.arctan2(Y - by, X - bx)
    # rows of scales: fine across (theta), coarser along the radius
    tex = value_noise((th + math.pi) * 420, r * 0.9 + 1, seed)
    tex2 = value_noise(X / S * 0.35 + 1, Y / S * 0.35 + 1, seed + 3)
    return tex, tex2, r, th


def wing_masks(sp):
    sh = SHAPES[sp]
    fore = mask_of(catmull(sh['fore']))
    hind = mask_of(catmull(sh['hind']))
    return fore, hind


# ----------------------------------------------------------------- Blue Morpho
def morpho(side):
    fore, hind = wing_masks('morpho')
    base = SHAPES['morpho']['base']
    tex, tex2, r, th = scale_texture(11 if side == 'dorsal' else 23, base)
    alpha = np.maximum(fore, hind)
    dF, dH = edge_distance(fore), edge_distance(hind)
    fore_only = fore
    hind_only = hind * (1 - fore)
    veins = draw_lines(venation('morpho'), 5.0, 1.1)

    if side == 'dorsal':
        deep, mid, bright, ice = col(8, 26, 110), col(22, 92, 230), col(70, 175, 255), col(170, 235, 255)
        rr = r / 900
        sheen = smooth(.15, .95, np.sin((X / S * .9 + Y / S * .55) / 160) * .5 + .5)
        c = mix(np.broadcast_to(deep, (SS, SS, 3)), mid, smooth(.05, .42, rr))
        c = mix(c, bright, smooth(.35, .8, rr) * (.55 + .45 * sheen))
        c = mix(c, ice, smooth(.55, 1.0, sheen) * smooth(.25, .7, rr) * .35)
        # structural-colour shimmer: fine scale rows catch the light
        c = c * (0.86 + 0.24 * tex[..., None]) * (0.92 + 0.16 * tex2[..., None])
        # dark velvet base near the body
        c = mix(c, col(10, 14, 40), smooth(.12, 0, rr) * .85)
        # black border: broad at the forewing apex and leading edge, thin elsewhere
        apex = smooth(560, 180, X / S) * smooth(420, 120, Y / S)
        inner = smooth(470, 520, Y / S) * smooth(240, 340, X / S)
        bw_f = (18 + 70 * apex + 22 * smooth(300, 60, Y / S)) * (1 - inner) + 6 * inner
        bw_h = 16 + 10 * value_noise(X / S * .05 + 1, Y / S * .05 + 1, 5)
        border = np.maximum(fore_only * smooth(bw_f + 6, bw_f - 6, dF), hind_only * smooth(bw_h + 5, bw_h - 5, dH))
        brd = col(14, 12, 18) * (0.85 + 0.25 * tex[..., None])
        c = mix(c, brd, border)
        # white spots in the dark apex, small marginal spots on the hindwing
        sp = dots([(150, 120, 13), (205, 98, 10), (122, 185, 11), (250, 150, 8), (110, 250, 9), (300, 112, 7)], 10, 1.6) * fore_only
        sp2 = dots([(330, 935, 6), (420, 965, 6), (520, 960, 6), (620, 925, 6), (300, 860, 5)], 6, 1.2) * hind_only * border
        c = mix(c, col(235, 240, 245), np.clip(sp * border * 1.3, 0, 1) * .9)
        c = mix(c, col(150, 200, 240), np.clip(sp2, 0, 1) * .7)
        # veins: darker blue lines over the blue, black within the border
        c = mix(c, col(10, 30, 95), veins * (1 - border) * .38)
        # hindwing slightly deeper where the forewing overlaps (shadow)
        sh = ndimage.gaussian_filter(fore, 10 * S) * hind_only
        c = c * (1 - .35 * sh[..., None])
        # hairs at the base
        hair = smooth(150, 40, np.hypot(X - 985 * S, Y - 500 * S) / S) * (0.7 + 0.3 * value_noise((th + 4) * 900, r * .2 + 1, 9))
        c = mix(c, col(25, 32, 60), hair * .8)
    else:
        brown, dark, tan, rust = col(96, 64, 38), col(52, 34, 22), col(176, 134, 86), col(140, 82, 40)
        c = np.broadcast_to(brown, (SS, SS, 3)).copy()
        m = fbm(X / S * .012 + 1, Y / S * .012 + 1, 31)
        c = mix(c, dark, smooth(.35, .75, m) * .7)
        # pale postmedian band and fine wavy striations
        band_f = smooth(40, 0, np.abs(dF - 85)) * fore_only
        band_h = smooth(40, 0, np.abs(dH - 70)) * hind_only
        c = mix(c, tan, np.clip(band_f + band_h, 0, 1) * .55)
        wav = np.sin(r / S * 0.26 + 4 * value_noise(X / S * .03 + 1, Y / S * .03 + 1, 4)) * .5 + .5
        c = c * (0.94 + 0.08 * wav[..., None]) * (0.86 + 0.28 * tex[..., None])
        mott = fbm(X / S * .03 + 1, Y / S * .03 + 1, 61)
        c = c * (0.85 + 0.3 * mott[..., None])
        # rust flush near the base, dark margin line
        c = mix(c, rust, smooth(.18, .02, r / 900) * .6)
        c = mix(c, dark, np.maximum(fore_only * smooth(10, 3, dF), hind_only * smooth(10, 3, dH)) * .9)
        # eyespots: ochre ring, dark ring, black, white highlight
        eyes = [(330, 300, 30, fore_only), (250, 420, 24, fore_only),
                (360, 690, 44, hind_only), (470, 838, 38, hind_only), (640, 905, 28, hind_only)]
        for (ex, ey, er, m_) in eyes:
            d = np.hypot((X - ex * S) / S, (Y - ey * S) / S * 1.12)
            ring = lambda r0, r1: smooth(r1 + 1.5, r1 - 1.5, d) * smooth(r0 - 1.5, r0 + 1.5, d)
            c = mix(c, col(60, 36, 20), smooth(er * 1.35 + 2, er * 1.35 - 2, d) * m_ * .8)
            c = mix(c, col(232, 176, 58), smooth(er + 2, er - 2, d) * m_)
            c = mix(c, col(150, 84, 30), smooth(er * .82 + 2, er * .82 - 2, d) * m_ * .55)
            c = mix(c, col(22, 14, 10), smooth(er * .62 + 2, er * .62 - 2, d) * m_)
            hd = np.hypot((X - (ex - er * .18) * S) / S, (Y - (ey - er * .2) * S) / S)
            c = mix(c, col(245, 240, 225), smooth(er * .2 + 1.5, er * .2 - 1.5, hd) * m_)
        c = mix(c, col(40, 26, 16), veins * .45)
        sh = ndimage.gaussian_filter(fore, 10 * S) * hind_only
        c = c * (1 - .3 * sh[..., None])
    # gentle light falloff toward the outer edge, slight edge translucency
    edge = np.minimum(np.where(fore > .5, dF, 999), np.where(hind > .5, dH, 999))
    c = c * (0.9 + 0.1 * smooth(0, 40, edge))[..., None]
    a = alpha * (0.88 + 0.12 * smooth(0, 6, edge))
    return finish(c, a, f'morpho-{side}')


# ----------------------------------------------------------------- Monarch
def monarch(side):
    fore, hind = wing_masks('monarch')
    base = SHAPES['monarch']['base']
    tex, tex2, r, th = scale_texture(41 if side == 'dorsal' else 53, base)
    alpha = np.maximum(fore, hind)
    dF, dH = edge_distance(fore), edge_distance(hind)
    fore_only = fore
    hind_only = hind * (1 - fore)
    veins = draw_lines(venation('monarch'), 13 if side == 'dorsal' else 10, 1.2)
    rr = r / 900
    if side == 'dorsal':
        o1, o2, o3 = col(196, 74, 8), col(236, 120, 18), col(250, 160, 56)
    else:
        o1, o2, o3 = col(200, 110, 30), col(238, 168, 70), col(248, 206, 128)
    c = mix(np.broadcast_to(o1, (SS, SS, 3)), o2, smooth(.05, .5, rr))
    c = mix(c, o3, smooth(.45, .95, rr) * .6)
    if side == 'ventral':
        c = mix(c, col(246, 214, 140), hind_only * .55)
    c = c * (0.88 + 0.2 * tex[..., None]) * (0.93 + 0.14 * tex2[..., None])
    black = col(16, 12, 10) * (0.9 + 0.2 * tex[..., None])
    # broad black apex and leading edge, black margins
    apex = smooth(520, 170, X / S) * smooth(380, 80, Y / S)
    inner = smooth(470, 520, Y / S) * smooth(240, 340, X / S)      # forewing's posterior edge
    bw_f = (34 + 95 * apex + 18 * smooth(260, 40, Y / S)) * (1 - inner) + 9 * inner
    bw_h = 40
    border = np.maximum(fore_only * smooth(bw_f + 5, bw_f - 5, dF), hind_only * smooth(bw_h + 5, bw_h - 5, dH))
    c = mix(c, black, border)
    # veins black, outlined slightly paler on the underside
    c = mix(c, black, veins * .95)
    # two rows of white dots in the margins, orange-white spots in the apex
    rows = []
    for poly, mask, dist, w in ((SHAPES['monarch']['fore'], fore_only, dF, bw_f), (SHAPES['monarch']['hind'], hind_only, dH, bw_h)):
        pass
    skip_inner = lambda x, y: y > 470 and x > 300
    shF, shH = SHAPES['monarch']['fore'], SHAPES['monarch']['hind']
    dotmask = np.maximum.reduce([
        dots_along(shF, fore_only, 13, 30, 5.5, skip_inner), dots_along(shF, fore_only, 29, 40, 4.5, skip_inner),
        dots_along(shH, hind_only, 13, 30, 5.5), dots_along(shH, hind_only, 29, 38, 5)])
    c = mix(c, col(246, 244, 236), np.clip(dotmask * 1.4 * border, 0, 1) * .95)
    ap = dots([(190, 120, 14), (240, 95, 11), (150, 175, 12), (290, 130, 9), (128, 238, 10), (205, 200, 9)], 10, 1.5) * fore_only
    c = mix(c, col(250, 236, 214), np.clip(ap, 0, 1) * .9)
    ap2 = dots([(330, 210, 16), (275, 270, 13), (390, 175, 12)], 12, 2) * fore_only
    c = mix(c, col(244, 150, 46), np.clip(ap2, 0, 1) * .85)
    hair = smooth(140, 40, np.hypot(X - 985 * S, Y - 500 * S) / S)
    c = mix(c, col(30, 20, 14), hair * .75)
    sh = ndimage.gaussian_filter(fore, 10 * S) * hind_only
    c = c * (1 - .3 * sh[..., None])
    edge = np.minimum(np.where(fore > .5, dF, 999), np.where(hind > .5, dH, 999))
    a = alpha * (0.9 + 0.1 * smooth(0, 6, edge))
    return finish(c, a, f'monarch-{side}')


# ----------------------------------------------------------------- body
def body(sp):
    W, H = 256 * 4, 640 * 4
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = W // 2
    dark = (22, 20, 26, 255) if sp == 'morpho' else (14, 12, 12, 255)
    fur = (52, 46, 40, 255) if sp == 'morpho' else (30, 26, 24, 255)
    # antennae with clubs
    for s in (-1, 1):
        pts = [(cx + s * 10, 205 * 4 / 4 * 4 // 4 * 1 + 600), ]
    ax0, ay0 = cx, 760
    for s in (-1, 1):
        path = [(ax0 + s * 14, ay0), (ax0 + s * 80, ay0 - 260), (ax0 + s * 150, ay0 - 520), (ax0 + s * 200, ay0 - 700)]
        d.line(path, fill=dark, width=16, joint='curve')
        ex, ey = path[-1]
        d.ellipse([ex - 26, ey - 40, ex + 26, ey + 40], fill=dark)
    # head
    d.ellipse([cx - 70, 700, cx + 70, 850], fill=dark)
    d.ellipse([cx - 64, 735, cx - 22, 790], fill=(70, 60, 50, 255))
    d.ellipse([cx + 22, 735, cx + 64, 790], fill=(70, 60, 50, 255))
    # thorax (furry)
    d.ellipse([cx - 110, 820, cx + 110, 1300], fill=fur)
    # abdomen, segmented and tapered
    for i in range(14):
        t = i / 13
        w = 92 * (1 - .55 * t)
        y0 = 1250 + i * 78
        d.ellipse([cx - w, y0, cx + w, y0 + 120], fill=dark)
    img = im.filter(ImageFilter.GaussianBlur(3))
    arr = np.asarray(img).astype(np.float32) / 255
    # fur noise and highlight down the spine
    yy, xx = np.mgrid[0:H, 0:W]
    n = np.random.default_rng(3).random((H, W)).astype(np.float32)
    n = ndimage.gaussian_filter(n, 2.5)
    shade = 1 - 0.5 * np.clip(np.abs(xx - cx) / 110, 0, 1) ** 2
    arr[..., :3] = arr[..., :3] * (0.8 + 0.5 * n[..., None]) * shade[..., None] + 0.06 * (np.abs(xx - cx) < 18)[..., None]
    if sp == 'monarch':
        spots = np.zeros((H, W), np.float32)
        for (sx, sy) in [(cx - 40, 760), (cx + 40, 760), (cx - 60, 900), (cx + 60, 900), (cx - 55, 1050), (cx + 55, 1050)]:
            spots += ((xx - sx) ** 2 + (yy - sy) ** 2 < 14 ** 2)
        arr[..., :3] = np.where(spots[..., None] > 0, 0.95, arr[..., :3])
    out = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((64, 160), Image.LANCZOS)
    out.save(os.path.join(OUTDIR, f'{sp}-body.webp'), 'WEBP', quality=90, method=6)
    out.save(os.path.join(OUTDIR, f'{sp}-body.png'))


if __name__ == '__main__':
    for f in (lambda: morpho('dorsal'), lambda: morpho('ventral'), lambda: monarch('dorsal'), lambda: monarch('ventral'), lambda: body('morpho'), lambda: body('monarch')):
        f()
    print('done')
