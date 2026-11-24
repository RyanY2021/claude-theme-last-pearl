"""Write the scene's formula, Re(s) = 1/2, in a hand, and turn it into one compact outline path.

The backdrop can carry no fonts, so the formula is set by LaTeX in a handwriting font from TeX Live
(a hand, so that it does not read as more of the conversation's serif text), converted to glyph
outlines by dvisvgm, and rewritten here as a single path of small whole numbers.

usage (needs TeX Live's latex and dvisvgm on the PATH, e.g. /Library/TeX/texbin):
  uv run --with svgpathtools python equation.py [HAND]     writes vector/equation.json
HAND is one of the names in HANDS below (default: the first). The JSON holds {width, height, d}:
`d` starts at the formula's top left corner; traced.mjs places it.
"""
import json, pathlib, re, subprocess, sys, tempfile

from svgpathtools import CubicBezier, Line, QuadraticBezier, parse_path

# name -> (the LaTeX that selects the font, how much to enlarge its "=", the size of the fraction's digits)
HANDS = {
    # Jana Skrivana (aurical): pen handwriting; its "=" and figures are slight, so they are set larger
    "skrivan": (r"\Fontskrivan", 1.5, r"\Large"),
    "augie": (r"\fontfamily{augie}\selectfont", 1, ""),   # Augie: a marker on a whiteboard
    "chorus": (r"\fontfamily{qzc}\selectfont", 1, ""),    # TeX Gyre Chorus: chancery italic
}
hand = sys.argv[1] if len(sys.argv) > 1 else next(iter(HANDS))
font, equals, figures = HANDS[hand]
# the fraction is stacked, in the same hand, with a bar about as heavy as its pen
TEX = r"""\documentclass[border=1pt]{standalone}
\usepackage[T1]{fontenc}
\usepackage{amsmath,graphicx}
\usepackage{aurical}
\begin{document}
{FONT Re(s)\,\raisebox{-0.12ex}{\scalebox{EQUALS}{=}}\,$\genfrac{}{}{0.8pt}{1}{\text{FONT\FIGURES 1}}{\text{FONT\FIGURES 2}}$}
\end{document}
""".replace("\\FIGURES", figures).replace("FONT", font).replace("EQUALS", str(equals))
UNITS_PER_PT = 14  # whole numbers at this scale are fine enough for a small hand-written label

here = pathlib.Path(__file__).parent
with tempfile.TemporaryDirectory() as tmp:
    (pathlib.Path(tmp) / "equation.tex").write_text(TEX)
    subprocess.run(["latex", "-interaction=nonstopmode", "equation.tex"], cwd=tmp, check=True, capture_output=True)
    # -n1: every glyph as its own path, no fonts and no references
    subprocess.run(["dvisvgm", "-n1", "--exact-bbox", "-o", "equation.svg", "equation.dvi"], cwd=tmp, check=True, capture_output=True)
    svg = (pathlib.Path(tmp) / "equation.svg").read_text()

shapes = [parse_path(d) for d in re.findall(r"<path d='([^']+)'", svg)]
# rules (the fraction bar) come as rectangles
for x, y, hgt, wid in re.findall(r"<rect x='([-\d.]+)' y='([-\d.]+)' height='([-\d.]+)' width='([-\d.]+)'", svg):
    x, y, hgt, wid = float(x), float(y), float(hgt), float(wid)
    shapes.append(parse_path(f"M{x} {y}H{x + wid}V{y + hgt}H{x}Z"))

xs, ys = [], []
for shape in shapes:
    x0, x1, y0, y1 = shape.bbox()
    xs += [x0, x1]
    ys += [y0, y1]
ox, oy = min(xs), min(ys)
pt = lambda z: (round((z.real - ox) * UNITS_PER_PT), round((z.imag - oy) * UNITS_PER_PT))


def numbers(values):
    """Numbers side by side: a minus sign separates as well as a space does."""
    text = ""
    for v in values:
        text += (" " if text and v >= 0 else "") + str(v)
    return text


out = []
for shape in shapes:
    for sub in shape.continuous_subpaths():
        cur = pt(sub[0].start)
        out.append(f"M{cur[0]} {cur[1]}")
        for seg in sub:
            end = pt(seg.end)
            if isinstance(seg, Line):
                dx, dy = end[0] - cur[0], end[1] - cur[1]
                if (dx, dy) != (0, 0):
                    out.append(f"h{dx}" if dy == 0 else f"v{dy}" if dx == 0 else "l" + numbers([dx, dy]))
            elif isinstance(seg, CubicBezier):
                c1, c2 = pt(seg.control1), pt(seg.control2)
                out.append("c" + numbers([c1[0] - cur[0], c1[1] - cur[1], c2[0] - cur[0], c2[1] - cur[1], end[0] - cur[0], end[1] - cur[1]]))
            elif isinstance(seg, QuadraticBezier):
                c1 = pt(seg.control)
                out.append("q" + numbers([c1[0] - cur[0], c1[1] - cur[1], end[0] - cur[0], end[1] - cur[1]]))
            else:
                raise SystemExit(f"unexpected segment {type(seg).__name__}")
            cur = end
        out.append("z")
d = "".join(out)
width, height = round((max(xs) - ox) * UNITS_PER_PT), round((max(ys) - oy) * UNITS_PER_PT)
(here / "vector" / "equation.json").write_text(json.dumps({"width": width, "height": height, "d": d}))
(here / "vector" / "equation.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 {width + 40} {height + 40}" width="{width + 40}" height="{height + 40}"><path fill="#ffe3a8" d="{d}"/></svg>')
print(f"vector/equation.json ({hand}): {width}x{height} units, {len(d)} characters")
