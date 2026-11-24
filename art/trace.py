"""Turn a generated picture (a figure on flat green, or on a transparent background) into a compact
flat-colour SVG fragment for the theme's backdrop.

The backdrop must be pure vector, so each generated element is keyed, mapped to a few flat colours
(the cut-paper look), cleaned and traced:

  1. key      the background is the alpha channel if there is one, else the green around the border
  2. flatten  every pixel goes to its nearest palette colour (compared in OKLab)
  3. clean    slivers and lines thinner than --thin, specks under --min-area and pinholes under
              --fill-holes are handed to the colours around them, so colour blocks stay whole and
              no blended fringe is left along their edges
  4. trace    layers painted bottom to top: the whole figure first, in one colour, then each other
              colour block, running a little way under its neighbours and whole under any patch
              painted over it later, so no seam can show between two colour blocks

usage (run through uv so nothing is installed globally):
  uv run --with vtracer --with pillow --with numpy --with scipy python trace.py IN.png OUT.svg \
      --palette "#ee5d10>#f0762a,#fbf4e3>#f8f1e4,..." [options]

A palette entry is SOURCE>OUTPUT (the colour to look for, the colour to draw); a bare colour is both.
Several sources may share one output. OUT.svg is a standalone preview; OUT.json holds
{width, height, pearl, fruits?, flower?, layers:[{fill, d, sil?}]} for traced.mjs to place, and OUT.flat.png the
cleaned picture before tracing.
"""
import argparse, json, os, re, tempfile

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
import vtracer

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--palette", required=True)
ap.add_argument("--scale", type=float, default=1.0, help="resize before tracing (coordinates are whole numbers, so larger = finer)")
ap.add_argument("--key-tol", type=float, default=60, help="distance from the border colour that counts as background")
ap.add_argument("--smooth", type=int, default=3, help="median filter (px) before flattening; 0 = off")
ap.add_argument("--mode", type=int, default=5, help="majority filter (px) on the flat colours; 0 = off")
ap.add_argument("--thin", type=float, default=2.0, help="parts of a colour narrower than about twice this go to their neighbours")
ap.add_argument("--gap", type=float, default=None, help="the same for gaps of background inside the figure (default: --thin)")
ap.add_argument("--min-area", type=int, default=60, help="specks of colour smaller than this (px) go to their neighbours")
ap.add_argument("--fill-holes", type=int, default=200, help="enclosed background holes smaller than this (px) are filled")
ap.add_argument("--order", default=None, help="comma-separated output colours, bottom to top; default: longest border first, then by area")
ap.add_argument("--no-under", action="store_true", help="no whole-figure bottom layer: every colour is its own block (lighter for a tree of many small leaves)")
ap.add_argument("--overlap", type=float, default=1.0, help="each layer grows this far (px) under its neighbours")
ap.add_argument("--length", type=float, default=4.0, help="vtracer length_threshold: larger = fewer, longer segments")
ap.add_argument("--corner", type=int, default=60, help="vtracer corner_threshold (degrees)")
ap.add_argument("--speckle", type=int, default=4, help="vtracer filter_speckle")
ap.add_argument("--tip", action="store_true", help="anchor the scene's pearl just above the topmost point (a raised fingertip)")
ap.add_argument("--fruit", default=None, help="#rrggbb output colour: round patches standing clear on thin stems are painted this colour whole")
ap.add_argument("--fruit-radius", default="16,36", help="R0,R1 in source pixels: how big such a round patch may be")
ap.add_argument("--trunk", default=None, help="#rrggbb output colour: everything thicker than --trunk-radius (trunk, main bough) is painted this colour whole, whatever its shading")
ap.add_argument("--trunk-radius", type=float, default=14, help="in source pixels")
ap.add_argument("--slim", type=float, default=1.0, help="below 1: every part keeps its length but this share of its thickness (a slimmer trunk, boughs and leaves)")
ap.add_argument("--fruit-scale", type=float, default=1.0, help="below 1: each round patch of the --blobs colour shrinks to this size, still hanging from its stem")
ap.add_argument("--round-fruit", action="store_true", help="with --blobs: leave that colour out of the trace; the scene draws each fruit as a true circle from its recorded place and size")
ap.add_argument("--blobs", default=None, help="#rrggbb output colour whose round patches are recorded as [x, y, r] (the tree's fruit, for their glow)")
ap.add_argument("--flower", default=None, help="X,Y,R in source pixels: where the scene draws her hair flower")
ap.add_argument("--detail", default=None, help="X0,Y0,X1,Y1 in source pixels: a box cleaned with the finer --detail-thin / --detail-min-area (her head)")
ap.add_argument("--detail-thin", type=float, default=1.0)
ap.add_argument("--detail-min-area", type=int, default=20)
ap.add_argument("--blank", default=None, help="X0,Y0,X1,Y1 in source pixels: a blank face. Inside the box only the palest colour and the --blank-keep colours stay, and islands of those inside the face are filled")
ap.add_argument("--blank-keep", default="", help="comma-separated output colours that survive inside --blank (her hair)")
args = ap.parse_args()
stem = args.dst[:-4] if args.dst.endswith(".svg") else args.dst


def hex3(c):
    c = c.strip().lstrip("#")
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def oklab(rgb):
    c = np.asarray(rgb, np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = np.cbrt(0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2])
    m = np.cbrt(0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2])
    s = np.cbrt(0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2])
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)


def disc(r):
    k = int(np.ceil(r))
    y, x = np.ogrid[-k:k + 1, -k:k + 1]
    return x * x + y * y <= r * r + 0.25


# ---- palette: sources, and the output colour each one draws as
sources, outputs, out_of = [], [], []
for entry in args.palette.split(","):
    src, _, out = entry.partition(">")
    out = (out or src).strip().lower()
    if not out.startswith("#"):
        out = "#" + out
    if out not in outputs:
        outputs.append(out)
    sources.append(hex3(src))
    out_of.append(outputs.index(out))
N = len(outputs)
BG = N  # the background's label

# ---- 1. key
src_img = Image.open(args.src)
has_alpha = src_img.mode in ("RGBA", "LA") and np.asarray(src_img.convert("RGBA"))[..., 3].min() < 200
rgba_img = src_img.convert("RGBA")
if args.scale != 1.0:
    rgba_img = rgba_img.resize((round(rgba_img.width * args.scale), round(rgba_img.height * args.scale)), Image.LANCZOS)
full = np.asarray(rgba_img).astype(np.int32)
a = full[..., :3]
h, w, _ = a.shape
if has_alpha:
    bgmask = full[..., 3] < 128
else:
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    near = np.sqrt(((a - bg) ** 2).sum(-1)) < args.key_tol
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenish = ((g > r + 40) & (g > b + 40)) | ((g > r + 10) & (g >= b - 4))  # green, or a grey-green cast
    lab_, _n = ndi.label(near | greenish)
    edge = np.unique(np.concatenate([lab_[0], lab_[-1], lab_[:, 0], lab_[:, -1]]))
    bgmask = np.isin(lab_, edge[edge > 0]) | greenish

# ---- 2. flatten
rgb_img = Image.fromarray(a.astype(np.uint8))
if args.smooth > 1:
    rgb_img = rgb_img.filter(ImageFilter.MedianFilter(args.smooth | 1))
px = oklab(np.asarray(rgb_img))
pal = oklab(np.array(sources))
d2 = ((px[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(-1)
lab = np.array(out_of)[d2.argmin(-1)]
lab[bgmask] = BG
if args.blank:
    # a blank face: within the box everything but hair goes to the palest colour, and so do
    # islands of hair colour that float inside the face (closed eyes, a mouth)
    bx0, by0, bx1, by1 = [int(float(v) * args.scale) for v in args.blank.split(",")]
    box = np.zeros(lab.shape, bool)
    box[by0:by1, bx0:bx1] = True
    pale = int(np.argmax([sum(hex3(o)) for o in outputs]))
    kept = {pale} | {outputs.index("#" + c.strip().lstrip("#").lower()) for c in args.blank_keep.split(",") if c.strip()}
    for L in range(N):
        if L not in kept:
            lab[box & (lab == L)] = pale
    other = box & (lab != pale) & (lab != BG)
    comp, n = ndi.label(other)
    if n:
        rim = np.zeros(lab.shape, bool)
        rim[by0, bx0:bx1] = rim[by1 - 1, bx0:bx1] = True
        rim[by0:by1, bx0] = rim[by0:by1, bx1 - 1] = True
        touching = set(np.unique(comp[rim]).tolist())
        islands = [i for i in range(1, n + 1) if i not in touching]
        lab[np.isin(comp, islands)] = pale
if args.fruit:
    # fruit: what survives when everything thinner than a fruit is opened away, and is small and round
    FL = outputs.index("#" + args.fruit.strip().lstrip("#").lower())
    r0, r1 = [float(v) * args.scale for v in args.fruit_radius.split(",")]
    figm = lab != BG
    thick = ndi.binary_opening(figm, structure=disc(r0 * 0.8))
    comp, n = ndi.label(thick)
    for i, sl in enumerate(ndi.find_objects(comp), 1):
        m = comp[sl] == i
        area, (bh, bw) = int(m.sum()), m.shape
        round_ = area / (np.pi / 4 * max(bw, bh) ** 2)  # 1 for a disc, low for a slanted leaf
        if np.pi * r0 ** 2 * 0.6 <= area <= np.pi * r1 ** 2 and 0.75 < bw / bh < 1.35 and round_ > 0.8:
            # and it hangs free: nearly all of the ring around it is background (a knot on a branch is not)
            one = comp == i
            ring = ndi.binary_dilation(one, structure=disc(4)) & ~one
            if (~figm)[ring].mean() < 0.78:
                continue
            lab[ndi.binary_dilation(one, structure=disc(2)) & figm] = FL
if args.trunk:
    TL = outputs.index("#" + args.trunk.strip().lstrip("#").lower())
    tr = args.trunk_radius * args.scale
    solid = (lab != BG) & ((lab != FL) if args.fruit else True)
    thick = ndi.binary_opening(solid, structure=disc(tr))
    comp, n = ndi.label(thick)
    if n:
        sizes = np.bincount(comp.ravel())
        big = [i for i in range(1, n + 1) if sizes[i] > 12 * np.pi * tr ** 2]
        lab[np.isin(comp, big)] = TL
if args.mode > 1:
    lab = np.asarray(Image.fromarray(lab.astype(np.uint8)).filter(ImageFilter.ModeFilter(args.mode | 1))).astype(np.int64)

# ---- 3. clean (on an edge-padded copy, so shapes that run off the picture are not eaten at its border)
P = 12
lab = np.pad(lab, P, mode="edge")


def reassign(lab, keep, labels):
    """Pixels outside `keep` take the label that dominates the kept pixels around them."""
    out = lab.copy()
    todo = ~keep
    best = np.zeros(lab.shape, np.float32)
    for L in labels:
        gk = ndi.gaussian_filter((keep & (lab == L)).astype(np.float32), 2.5)
        upd = todo & (gk > best)
        out[upd] = L
        best = np.maximum(best, gk)
    far = todo & (best < 1e-3)
    if far.any():
        ok = keep & np.isin(lab, labels)
        idx = ndi.distance_transform_edt(~ok, return_distances=False, return_indices=True)
        out[far] = lab[idx[0][far], idx[1][far]]
    return out


ALL = list(range(N + 1))
gap = args.thin if args.gap is None else args.gap


def clean(lab, thin, gap, min_area, fill_holes):
    for _ in range(2):
        # slivers and thin lines
        keep = np.zeros(lab.shape, bool)
        for L in ALL:
            m = lab == L
            rr = gap if L == BG else thin
            keep |= ndi.binary_opening(m, structure=disc(rr)) if rr > 0 else m
        lab = reassign(lab, keep, ALL)
        # specks
        keep = np.ones(lab.shape, bool)
        for L in range(N):
            comp, n = ndi.label(lab == L)
            if n:
                sizes = np.bincount(comp.ravel())
                small = np.where(sizes < min_area)[0]
                small = small[small > 0]
                if len(small):
                    keep &= ~np.isin(comp, small)
        lab = reassign(lab, keep, ALL)
        # pinholes: enclosed background smaller than fill_holes
        comp, n = ndi.label(lab == BG)
        if n:
            sizes = np.bincount(comp.ravel())
            edge = set(np.unique(np.concatenate([comp[0], comp[-1], comp[:, 0], comp[:, -1]])).tolist())
            holes = [i for i in range(1, n + 1) if sizes[i] < fill_holes and i not in edge]
            if holes:
                lab = reassign(lab, ~np.isin(comp, holes), list(range(N)))
    return lab


coarse = clean(lab, args.thin, gap, args.min_area, args.fill_holes)
if args.detail:
    dx0, dy0, dx1, dy1 = [int(float(v) * args.scale) + P for v in args.detail.split(",")]
    fine = clean(lab, args.detail_thin, min(gap, args.detail_thin), args.detail_min_area, args.fill_holes)
    coarse[dy0:dy1, dx0:dx1] = fine[dy0:dy1, dx0:dx1]
lab = coarse
lab = lab[P:-P, P:-P]

if args.fruit_scale < 1 and args.blobs:
    # each fruit shrinks toward the top of its own outline, where its stem holds it
    FB = outputs.index("#" + args.blobs.strip().lstrip("#").lower())
    comp, n = ndi.label(lab == FB)
    for i, sl in enumerate(ndi.find_objects(comp), 1):
        m = comp[sl] == i
        bh, bw = m.shape
        if m.sum() < 150 * args.scale ** 2:
            continue
        nh, nw = max(2, round(bh * args.fruit_scale)), max(2, round(bw * args.fruit_scale))
        small = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)) > 127
        lab[sl][m] = BG
        top, left = sl[0].start, sl[1].start + (bw - nw) // 2
        lab[top:top + nh, left:left + nw][small] = FB
if args.slim < 1:
    # Slimming: find how thick the tree is around each pixel (the largest disc that fits inside the
    # shape and covers it), then keep only what lies deeper than (1 - slim) of that half-thickness.
    # Outlines move inward in proportion, so lengths stay and nothing turns ragged.
    keepers = (lab == outputs.index("#" + args.blobs.strip().lstrip("#").lower())) if args.blobs else np.zeros(lab.shape, bool)
    body = (lab != BG) & ~keepers
    dt = ndi.distance_transform_edt(body)
    q = np.pad(dt, 1, mode="edge")
    c = q[1:-1, 1:-1]
    ridge = np.zeros(lab.shape, bool)
    hh, ww = lab.shape
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        a_ = q[1 + dy:hh + 1 + dy, 1 + dx:ww + 1 + dx]
        b_ = q[1 - dy:hh + 1 - dy, 1 - dx:ww + 1 - dx]
        ridge |= (c >= a_) & (c >= b_) & ((c > a_) | (c > b_))
    ridge &= body
    half = np.round(dt * 2) / 2
    thick = np.zeros(lab.shape)
    for r in sorted(np.unique(half[ridge]), reverse=True):
        if r <= 0:
            continue
        near = ndi.distance_transform_edt(~(ridge & (half == r))) < r
        thick[near & (thick == 0)] = r
    # hair-thin parts (fruit stems) keep what they have
    keep = (dt >= (1 - args.slim) * thick) | (thick <= 1.5)
    lab[body & ~keep] = BG
    lab = np.pad(lab, P, mode="edge")
    lab = clean(lab, 1.0, 0.0, args.min_area, args.fill_holes)[P:-P, P:-P]

fig = lab != BG
ys, xs = np.where(fig)
pad = 3
y0, x0 = max(0, ys.min() - pad), max(0, xs.min() - pad)
y1, x1 = min(h, ys.max() + 1 + pad), min(w, xs.max() + 1 + pad)
lab = lab[y0:y1, x0:x1]
fig = lab != BG
H, W = lab.shape
flat = np.zeros((H, W, 4), np.uint8)
for L in range(N):
    flat[lab == L] = hex3(outputs[L]) + [255]
Image.fromarray(flat, "RGBA").save(stem + ".flat.png")

pearl = None
if args.tip:
    ay, ax = np.where(fig)
    topy = ay.min()
    k = 14.0 * args.scale
    pearl = [float(ax[ay < topy + 5].mean()), float(topy) - k, k]

blobs = None
if args.blobs:
    L = outputs.index("#" + args.blobs.strip().lstrip("#").lower())
    comp, n = ndi.label(lab == L)
    blobs = []
    for i, sl in enumerate(ndi.find_objects(comp), 1):
        m = comp[sl] == i
        area = int(m.sum())
        bh, bw = m.shape
        # round enough: fills most of its bounding box and is about as wide as tall
        if area >= 150 * args.scale ** 2 and 0.6 < bw / bh < 1.6 and area > 0.6 * bw * bh:
            cy, cx = ndi.center_of_mass(m)
            blobs.append([round(sl[1].start + cx, 1), round(sl[0].start + cy, 1), round(float(np.sqrt(area / np.pi)), 1)])
if args.round_fruit and args.blobs:
    lab[lab == outputs.index("#" + args.blobs.strip().lstrip("#").lower())] = BG
flower = None
if args.flower:
    fx, fy, fr = [float(v) for v in args.flower.split(",")]
    flower = [round(fx * args.scale - x0, 1), round(fy * args.scale - y0, 1), round(fr * args.scale, 1)]

# ---- 4. trace: each mask on its own, as black on white
tmp = tempfile.mkdtemp()


def minify(d, tx, ty):
    """Absolute vtracer path -> relative whole-number commands, translation applied."""
    tokens = re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d)
    out, cmd, prev, start, last = [], None, (0, 0), (0, 0), None
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in "MLCZ":
            cmd = t
            if t == "Z":
                out.append("z")
                prev, last = start, "z"
            i += 1
            continue
        k = {"M": 1, "L": 1, "C": 3}[cmd]
        pts = [(round(float(tokens[i + 2 * j]) + tx), round(float(tokens[i + 2 * j + 1]) + ty)) for j in range(k)]
        i += 2 * k
        if cmd == "M":
            out.append(f"M{pts[0][0]} {pts[0][1]}")
            start = prev = pts[0]
            cmd, last = "L", "M"
            continue
        if cmd == "L":
            body, letter = f"{pts[0][0] - prev[0]} {pts[0][1] - prev[1]}", "l"
            if body == "0 0":
                continue
            prev = pts[0]
        else:
            body, letter = " ".join(f"{p[0] - prev[0]} {p[1] - prev[1]}" for p in pts), "c"
            prev = pts[-1]
        # a repeated command needs no letter when the minus sign already separates the numbers
        out.append(body if last == letter and body.startswith("-") else letter + body)
        last = letter
    return re.sub(r" -", "-", "".join(out))


def trace(mask):
    if not mask.any():
        return ""
    png, svg = os.path.join(tmp, "m.png"), os.path.join(tmp, "m.svg")
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("RGB").save(png)
    vtracer.convert_image_to_svg_py(
        png, svg, colormode="binary", mode="spline", filter_speckle=args.speckle,
        corner_threshold=args.corner, length_threshold=args.length, max_iterations=10,
        splice_threshold=45, path_precision=1)
    text = open(svg).read()
    parts = []
    for m in re.finditer(r'<path d="([^"]+)"[^>]*?transform="translate\(([-\d.]+),([-\d.]+)\)"', text):
        parts.append(minify(m.group(1), float(m.group(2)), float(m.group(3))))
    return "".join(parts)


# Layers, painted bottom to top. The bottom one is the whole figure in the colour with the longest
# border, so that colour needs no outline of its own. Each layer above is its own colour block,
# plus any patch of a later colour that lies mostly inside it (the patch is painted over it
# afterwards, so its border is traced once, not twice), grown by --overlap px so no seam shows.
present = [L for L in range(N) if (lab == L).any()]
fig = lab != BG


def perimeter(mask):
    return int((mask[:, 1:] != mask[:, :-1]).sum() + (mask[1:] != mask[:-1]).sum())


if args.order:
    order = [outputs.index("#" + c.strip().lstrip("#").lower()) for c in args.order.split(",")]
else:
    base = max(present, key=lambda L: perimeter(lab == L))
    order = [base] + sorted((L for L in present if L != base), key=lambda L: -int((lab == L).sum()))
print("layers, bottom to top:", ",".join(outputs[L] for L in order))

grow = disc(args.overlap) if args.overlap > 0 else None
# the bottom layer keeps the true outline only where its own colour is at the edge; elsewhere it
# stops just inside, so it can never peek out from under the colour painted over it
own0 = lab == order[0]
under = ndi.binary_erosion(fig, structure=disc(1.5)) | (ndi.binary_dilation(own0, structure=disc(2.5)) & fig)
layers = [] if args.no_under else [{"fill": outputs[order[0]], "sil": True, "d": trace(under)}]
for i, L in enumerate(order):
    if i == 0 and not args.no_under:
        continue
    own = lab == L
    later = np.isin(lab, order[i + 1:])
    mask = own.copy()
    comp, n = ndi.label(later)
    if n:
        inside = np.zeros(n + 1)
        outside = np.zeros(n + 1)
        other = ~own & ~later
        for dy, dx in ((0, 1), (1, 0)):
            for c_, t_ in ((comp[:H - dy, :W - dx], (own[dy:, dx:], other[dy:, dx:])),
                           (comp[dy:, dx:], (own[:H - dy, :W - dx], other[:H - dy, :W - dx]))):
                inside += np.bincount(c_[t_[0]], minlength=n + 1)
                outside += np.bincount(c_[t_[1]], minlength=n + 1)
        absorb = np.where(inside > outside)[0]
        absorb = absorb[absorb > 0]
        if len(absorb):
            mask |= np.isin(comp, absorb)
    if grow is not None:
        mask = ndi.binary_dilation(mask, structure=grow) & fig
    layers.append({"fill": outputs[L], "d": trace(mask)})

size = sum(len(l["d"]) for l in layers)
with open(stem + ".json", "w") as fh:
    meta = {"width": W, "height": H, "pearl": pearl, "layers": layers}
    if blobs is not None:
        meta["fruits"] = blobs
        if args.round_fruit:
            meta["fruitFill"] = "#" + args.blobs.strip().lstrip("#").lower()
    if flower:
        meta["flower"] = flower
    json.dump(meta, fh)
with open(args.dst, "w") as fh:
    fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    for l in layers:
        fh.write(f'<path fill="{l["fill"]}" fill-rule="evenodd" d="{l["d"]}"/>')
    fh.write("</svg>")
print(f"{args.dst}: {W}x{H}, {len(layers)} layers, {size} characters of path data")
for l in layers:
    print(f"  {l['fill']}{' (whole figure)' if l.get('sil') else ''}  {len(l['d'])}")
