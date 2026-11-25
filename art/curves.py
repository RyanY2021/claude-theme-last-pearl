"""Outlines traced by potrace, as cubic curves, and the parts of them between two points.

Used by figure_svg.py. Curves are lists of segments [p0, c1, c2, p1] in the caller's units.
"""
import re


def from_potrace(curves, k=1.0):
    """potracer curves, divided by k, as closed lists of cubic segments (a corner is two straight lines)."""
    out = []
    for c in curves:
        segs = []
        p = (c.start_point.x / k, c.start_point.y / k)
        for s in c.segments:
            e = (s.end_point.x / k, s.end_point.y / k)
            if s.is_corner:
                q = (s.c.x / k, s.c.y / k)
                for a, b in ((p, q), (q, e)):
                    segs.append([a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b])
            else:
                segs.append([p, (s.c1.x / k, s.c1.y / k), (s.c2.x / k, s.c2.y / k), e])
            p = e
        out.append(segs)
    return out


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def at(sg, t):
    u = 1 - t
    return tuple(u ** 3 * sg[0][i] + 3 * u * u * t * sg[1][i] + 3 * u * t * t * sg[2][i] + t ** 3 * sg[3][i] for i in (0, 1))


def split(sg, t):
    a, b, c = lerp(sg[0], sg[1], t), lerp(sg[1], sg[2], t), lerp(sg[2], sg[3], t)
    d, e = lerp(a, b, t), lerp(b, c, t)
    m = lerp(d, e, t)
    return [sg[0], a, d, m], [m, e, c, sg[3]]


def nearest(segs, pt):
    """(squared distance, position) of the point on the closed curve nearest pt; position is
    segment index + t."""
    best = None
    for i, sg in enumerate(segs):
        for j in range(41):
            q = at(sg, j / 40)
            dd = (q[0] - pt[0]) ** 2 + (q[1] - pt[1]) ** 2
            if best is None or dd < best[0]:
                best = (dd, i + j / 40)
    return best


def between(curves, a, b):
    """The open run of segments along the curve passing nearest both points, from about one to
    about the other, the shorter way round."""
    segs = min(curves, key=lambda sg: max(nearest(sg, a)[0], nearest(sg, b)[0]))
    fa, fb = sorted((nearest(segs, a)[1], nearest(segs, b)[1]))
    n = len(segs)
    if fb - fa > n / 2:
        fa, fb = fb, fa + n
    run, f = [], fa
    while f < fb - 1e-9:
        i = int(f) % n
        t0, t1 = f - int(f), min(1.0, fb - int(f))
        sg = segs[i]
        if t1 < 1.0:
            sg = split(sg, t1)[0]
            t0 = t0 / t1
        if t0 > 0:
            sg = split(sg, t0)[1]
        run.append(sg)
        f = int(f) + 1.0
    return run


def num(v):
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    if s.startswith("0."):
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return "0" if s in ("", "-0", "-") else s


def path(runs, closed):
    """Relative path data with one decimal, each run its own subpath, rounded against the rounded
    previous point so nothing drifts."""
    out = []
    for run in runs:
        r = lambda q: (round(q[0], 1), round(q[1], 1))
        prev = r(run[0][0])
        text = f"M{num(prev[0])} {num(prev[1])}"
        for sg in run:
            pts = [r(q) for q in sg[1:]]
            straight = all(abs((q[0] - prev[0]) * (pts[-1][1] - prev[1]) - (q[1] - prev[1]) * (pts[-1][0] - prev[0])) < 0.05 for q in pts[:2])
            if straight:
                text += f"l{num(pts[-1][0] - prev[0])} {num(pts[-1][1] - prev[1])}"
            else:
                text += "c" + " ".join(f"{num(q[0] - prev[0])} {num(q[1] - prev[1])}" for q in pts)
            prev = pts[-1]
        out.append(text + ("z" if closed else ""))
    return re.sub(r" -", "-", "".join(out))
