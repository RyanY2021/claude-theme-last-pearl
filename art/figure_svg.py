"""Turn a hand-built figure SVG into the scene's figure, art/vector/claude.json.

The figure in use is GPT's vector redraw of the figure picture (claude-gpt-3.png), made in that
picture's own pixels, 1012 by 1536 (candidates/external/claude-gpt-svg.svg; -hand.svg is the same with
the raised hand redrawn so that the index finger points up beside the thumb). It is already sharp
vector, so it is not traced; this script only fits it to the scene:

  - ids get a prefix, so they cannot meet the scene's own; xlink:href becomes href; title and desc go
  - every shape that lies wholly outside --keep (source pixels) goes: the window never shows it
  - the light-mode ink edge: the whole figure's outline, traced (potrace) from a rendering of it,
    drawn under the figure, so only its outer half shows
  - the raised arm's own edge where it meets other parts of her (--arm-edge): the edge of what shows
    of the arm (the group --arm, less what is painted over it), from about one point to about another,
    drawn over everything, so the sleeve reads as one shape over her hair and the cape's lining
  - the pearl: just above the topmost point (the raised fingertip), as trace.py --tip puts it, or
    where --pearl says (a figure that holds it elsewhere)

For a figure only dark mode shows (claude-seated-2.svg, GPT's SVG of claude-seated-2.png), --no-outline
leaves out the ink edge, which is light mode's, and --keep may be left out, to keep every shape.

It renders the figure with Google Chrome (or CHROME) to trace the outlines; curves.py holds the curve helpers.

usage (from art/):
  uv run --with potracer --with pillow --with numpy python figure_svg.py \
      candidates/external/claude-gpt-svg-hand.svg vector/claude.json --keep 0,0,830,912 \
      --arm raised-arm --arm-edge "440.6,258.1>472.5,389.4;377.5,330>421.2,453.1"
  uv run --with potracer --with pillow --with numpy python figure_svg.py \
      candidates/external/claude-seated-2.svg vector/claude-seated.json --prefix d- --no-outline \
      --pearl 163.4,665,48.5
"""
import argparse, json, math, os, re, subprocess, tempfile
import xml.etree.ElementTree as ET

import numpy as np
import potrace
from PIL import Image

from curves import between, from_potrace, path

ap = argparse.ArgumentParser()
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--keep", default=None, help="X0,Y0,X1,Y1 in source pixels: what the window can show (absent: all of it)")
ap.add_argument("--pearl", default=None, help="X,Y,R in source pixels: where the pearl is held (absent: above the topmost point)")
ap.add_argument("--no-outline", action="store_true", help="no light-mode ink edge (a figure only dark mode shows)")
ap.add_argument("--arm", default=None, help="id of the group whose edge is drawn inside the figure (her raised arm)")
ap.add_argument("--arm-edge", default=None, help="X0,Y0>X1,Y1;... in source pixels: the stretches of the arm's edge to draw")
ap.add_argument("--prefix", default="c-")
ap.add_argument("--k", type=float, default=2.0, help="rendering scale for the traced outlines (pixels per source pixel)")
args = ap.parse_args()

SVG = "http://www.w3.org/2000/svg"
XL = "http://www.w3.org/1999/xlink"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
KX0, KY0, KX1, KY1 = [float(v) for v in args.keep.split(",")] if args.keep else (-1e9, -1e9, 1e9, 1e9)

tree = ET.parse(args.src)
root = tree.getroot()
W, H = float(root.get("width")), float(root.get("height"))

# ---- plain tags and attributes, with no namespaces
for el in root.iter():
    el.tag = el.tag.split("}")[-1]
    for k in list(el.attrib):
        if k.startswith("{"):
            v = el.attrib.pop(k)
            el.set("href" if k == f"{{{XL}}}href" else k.split("}")[-1], v)
for el in list(root):
    if el.tag in ("title", "desc"):
        root.remove(el)

# ---- the box each shape covers, in source pixels, to leave out what the window never shows
def matrix(transform):
    m = np.eye(3)
    for name, nums in re.findall(r"(\w+)\(([^)]*)\)", transform or ""):
        v = [float(x) for x in re.split(r"[ ,]+", nums.strip())]
        if name == "translate":
            t = np.array([[1, 0, v[0]], [0, 1, v[1] if len(v) > 1 else 0], [0, 0, 1]])
        elif name == "scale":
            t = np.diag([v[0], v[1] if len(v) > 1 else v[0], 1])
        elif name == "rotate":
            a = math.radians(v[0])
            t = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
            if len(v) == 3:
                t = np.array([[1, 0, v[1]], [0, 1, v[2]], [0, 0, 1]]) @ t @ np.array([[1, 0, -v[1]], [0, 1, -v[2]], [0, 0, 1]])
        else:
            raise SystemExit(f"transform {name} not handled")
        m = m @ t
    return m

ids = {el.get("id"): el for el in root.iter() if el.get("id")}

def box(el):
    """[x0, y0, x1, y1] of the element in its parent's units, or None."""
    tag = el.tag
    pts = []
    if tag == "path":
        d = el.get("d")
        if re.search(r"[a-zA-Z]", re.sub(r"[MCQLZ]", "", d)):
            raise SystemExit(f"path with commands other than absolute M C Q L Z: {d[:40]}")
        n = [float(x) for x in re.findall(r"-?\d*\.?\d+", d)]
        pts = list(zip(n[0::2], n[1::2]))
    elif tag in ("ellipse", "circle"):
        cx, cy = float(el.get("cx", 0)), float(el.get("cy", 0))
        rx = float(el.get("rx", el.get("r", 0)))
        ry = float(el.get("ry", el.get("r", 0)))
        pts = [(cx - rx, cy - ry), (cx + rx, cy + ry), (cx - rx, cy + ry), (cx + rx, cy - ry)]
    elif tag == "use":
        b = box(ids[el.get("href").lstrip("#")])
        if b:
            pts = [(b[0], b[1]), (b[2], b[3]), (b[0], b[3]), (b[2], b[1])]
    elif tag == "g":
        bs = [b for b in (box(c) for c in el) if b]
        if bs:
            pts = [(min(b[0] for b in bs), min(b[1] for b in bs)), (max(b[2] for b in bs), max(b[3] for b in bs))]
    if not pts:
        return None
    m = matrix(el.get("transform"))
    p = np.array([[x, y, 1] for x, y in pts]).T
    q = m @ p
    return [q[0].min(), q[1].min(), q[0].max(), q[1].max()]

def prune(parent):
    for el in list(parent):
        if el.tag in ("defs",):
            continue
        b = box(el)
        if b is None or b[0] > KX1 or b[1] > KY1 or b[2] < KX0 or b[3] < KY0:
            parent.remove(el)
        elif el.tag == "g":
            prune(el)
            if len(el) == 0:
                parent.remove(el)

full = ET.tostring(root, encoding="unicode")  # the whole figure, for the frame and the pearl
if args.keep:
    prune(root)

# ---- render the whole figure, and the arm alone, as black on white
work = tempfile.mkdtemp()

def render(svg_text, name):
    k = args.k
    w, h = round(W * k), round(H * k)
    with open(os.path.join(work, f"{name}.svg"), "w") as fh:
        fh.write(svg_text)
    with open(os.path.join(work, f"{name}.html"), "w") as fh:
        fh.write(f'<html><body style="margin:0;background:#fff"><img src="{name}.svg" style="display:block;width:{w}px;height:{h}px;filter:brightness(0)"></body></html>')
    png = os.path.join(work, f"{name}.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                    f"--user-data-dir={os.path.join(work, 'profile')}", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", f"--screenshot={png}", f"file://{os.path.join(work, name + '.html')}"],
                   check=True, capture_output=True)
    a = np.asarray(Image.open(png).convert("L"))[:h, :w]
    return a < 128

def with_ns(text):
    return text.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ', 1) if 'xmlns="' not in text else text

whole = render(with_ns(full), "whole")
k = args.k
ys, xs = np.where(whole)
top = ys.min()
near_top = ys < top + 3 * k
pearl = [round(float(xs[near_top].mean()) / k, 2), round(float(top) / k - 14, 2), 14]
if args.pearl:
    pearl = [float(v) for v in args.pearl.split(",")]
# the frame's height: the whole figure, fingertip to boots, plus the 3-pixel pad trace.py leaves
# at its scale of 1.6 at each end, so the scene draws her the same size as the traced figure
height = round(float(ys.max() - top + 1) / k + 2 * 3 / 1.6, 2)

# ---- outlines, traced from the renderings, in source pixels
def traced(mask, turd=8):
    return from_potrace(potrace.Bitmap(~mask).trace(turdsize=turd, alphamax=1.0, opticurve=True, opttolerance=0.2), k)

cut = np.zeros_like(whole)
if args.keep:
    kx0, ky0, kx1, ky1 = [round(v * k) for v in (KX0, KY0, KX1, KY1)]
    cut[max(0, ky0):ky1, max(0, kx0):kx1] = True
else:
    cut[:] = True
sil = None if args.no_outline else path(traced(whole & cut), closed=True)

def only(keep):
    doc = ET.fromstring(full)
    for el in list(doc):
        if el.tag != "defs" and not keep(el):
            doc.remove(el)
    return with_ns(ET.tostring(doc, encoding="unicode"))

arm = None
if args.arm:
    groups = [el.get("id") for el in ET.fromstring(full) if el.tag == "g"]
    later = groups[groups.index(args.arm) + 1:]
    shown = render(only(lambda el: el.get("id") == args.arm), "arm") & ~render(only(lambda el: el.get("id") in later), "later")
    curves = traced(shown & cut)
    runs = []
    for pair in args.arm_edge.split(";"):
        a, b = [tuple(float(v) for v in xy.split(",")) for xy in pair.split(">")]
        runs.append(between(curves, a, b))
    arm = path(runs, closed=False)

# ---- the markup: ids prefixed, the defs first, then the shapes, split where the arm's outline goes
P = args.prefix
text_of = lambda el: ET.tostring(el, encoding="unicode")
arm_el = next((el for el in root if el.tag == "g" and el.get("id") == args.arm), None) if args.arm else None
if args.arm and arm_el is None:
    raise SystemExit(f"no group {args.arm} left inside --keep")
for el in root.iter():
    for a, v in list(el.attrib.items()):
        if a == "id":
            continue
        v2 = re.sub(r"url\(#([^)]+)\)", lambda m: f"url(#{P}{m.group(1)})", v)
        if a == "href" and v.startswith("#"):
            v2 = "#" + P + v[1:]
        el.set(a, v2)
defs_ids = {el.get("id") for d in root.findall("defs") for el in d.iter() if el.get("id")}
for el in root.iter():
    i = el.get("id")
    if i is not None:
        if i in defs_ids:
            el.set("id", P + i)
        else:
            el.attrib.pop("id")
defs = "".join(text_of(d) for d in root.findall("defs"))
kept = [el for el in root if el.tag == "g"]
order = [el for el in ET.fromstring(full) if el.tag == "g"]
before, after, seen = [], [], False
for el in kept:
    seen = seen or el is arm_el
    (after if seen else before).append(text_of(el))

clean = lambda s: re.sub(r"\s*\n\s*", "", s).replace(" />", "/>")
meta = {
    "width": W, "height": height, "scale": 1, "pearl": pearl,
    "defs": clean(defs), "parts": [clean("".join(before)), clean("".join(after))],
}
if sil:
    meta["sil"] = sil
if arm:
    meta["arm"] = arm
with open(args.dst, "w") as fh:
    json.dump(meta, fh)
size = len(meta["defs"]) + sum(len(p) for p in meta["parts"]) + len(sil or "") + len(arm or "")
print(f"{args.dst}: {len(kept)} groups kept of {len(order)}, pearl at {pearl}, height {height}; {size} characters "
      f"(drawing {len(meta['defs']) + sum(len(p) for p in meta['parts'])}, outline {len(sil or '')}, arm {len(arm or '')})")
