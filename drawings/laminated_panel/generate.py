"""Generate DXF and PDF for the laminated panel transcribed from a hand sketch.

Units: inches. Origin: left end of the body, bottom face.
X runs along the 44 1/4 length, Y runs through the thickness (profile on top).

Requires: pip install ezdxf matplotlib
Run: python generate.py  ->  laminated_panel.dxf, laminated_panel.pdf
"""
from pathlib import Path

import ezdxf
from ezdxf.addons.drawing import matplotlib as dxf_mpl
from ezdxf.addons.drawing.config import ColorPolicy, Configuration

OUT_DIR = Path(__file__).parent
NAME = "laminated_panel"

# ---- Dimensions from the sketch -------------------------------------------
LENGTH = 44.25
LAYERS = [  # (name, thickness), bottom to top
    ("A", 0.375),
    ("B", 0.875),
    ("C_CORE", 0.75),
    ("D", 0.875),
]
TENON_LEN = 0.875           # core extends past each end

PROFILE_START = 1.625       # left end -> start of raised profile
PROFILE_LEN = 33.5          # raised profile length at base
STEP_LEN = 3.0              # first step length, measured from profile start
# Profile edge segments, each stacked on the previous (per GE sample photos):
CHAMFER_H = 5 / 16          # 45 deg chamfer up from the low edge
RISER_H = 9 / 16            # vertical step at the end of the 3" flat
SLOPE_H = 13 / 16           # 45 deg slope to the full-height section
H_STEP = CHAMFER_H                      # level of the 3" flat
H_RISER = H_STEP + RISER_H              # top of vertical step
H_TOP = H_RISER + SLOPE_H               # full-height section
NOTCH_WIDTH = 4 + 9 / 16    # center notch, width at top flat
NOTCH_DEPTH = 0.25          # ASSUMED, not dimensioned on sketch
# Chamfers / slopes are not dimensioned on the sketch: 45 degrees assumed.

ASSUMPTIONS = [
    "Transcribed from hand sketch. Verify before fabrication.",
    "All dims in inches. Profile edge heights are chained: 5/16 + 9/16 + 13/16.",
    "1 5/8 + 33 1/2 + 9 1/8 = 44 1/4: raised profile spans 33 1/2 at base.",
    "3\" steps measured from profile start/end to the vertical riser.",
    "Chamfer (5/16) and slope (13/16) at 45 deg, per GE sample.",
    "Center notch: 4 9/16 wide, centered on profile, 1/4 deep (depth ASSUMED).",
    "Core tenon 3/4 x 7/8 both ends, assumed flush with core faces.",
]


def layer_bounds():
    y, out = 0.0, {}
    for name, t in LAYERS:
        out[name] = (y, y + t)
        y += t
    return out


def profile_points(base_y):
    """Top edge of layer D, left to right, including the raised profile."""
    x0 = PROFILE_START
    x1 = PROFILE_START + PROFILE_LEN
    slope_run = H_TOP - H_RISER
    mid = (x0 + x1) / 2
    n0, n1 = mid - NOTCH_WIDTH / 2, mid + NOTCH_WIDTH / 2

    rel = [
        (0.0, 0.0),
        (x0, 0.0),
        (x0 + H_STEP, H_STEP),
        (x0 + STEP_LEN, H_STEP),
        (x0 + STEP_LEN, H_RISER),
        (x0 + STEP_LEN + slope_run, H_TOP),
        (n0, H_TOP),
        (n0 + NOTCH_DEPTH, H_TOP - NOTCH_DEPTH),
        (n1 - NOTCH_DEPTH, H_TOP - NOTCH_DEPTH),
        (n1, H_TOP),
        (x1 - STEP_LEN - slope_run, H_TOP),
        (x1 - STEP_LEN, H_RISER),
        (x1 - STEP_LEN, H_STEP),
        (x1 - H_STEP, H_STEP),
        (x1, 0.0),
        (LENGTH, 0.0),
    ]
    return [(x, base_y + h) for x, h in rel]


def setup_doc():
    doc = ezdxf.new("R2010", setup=True)
    doc.header["$INSUNITS"] = 1      # inches
    doc.header["$MEASUREMENT"] = 0   # imperial
    for name, color in [("OUTLINE", 7), ("DIM", 1), ("TEXT", 3)]:
        doc.layers.add(name, color=color)
    style = doc.dimstyles.new("FRAC_IN")
    style.dxf.dimtxt = 0.16
    style.dxf.dimasz = 0.12
    style.dxf.dimexo = 0.06
    style.dxf.dimexe = 0.08
    style.dxf.dimgap = 0.05
    style.dxf.dimtad = 1
    style.dxf.dimclrd = 1
    style.dxf.dimclre = 1
    return doc


def add_dim(msp, p1, p2, base, text, angle=0):
    dim = msp.add_linear_dim(
        base=base, p1=p1, p2=p2, angle=angle, text=text,
        dimstyle="FRAC_IN", dxfattribs={"layer": "DIM"},
    )
    dim.render()


def clip_segments(points, x_min, x_max):
    """Clip an open polyline to x_min <= x <= x_max, returned as segments."""
    out = []
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        lo, hi = min(ax, bx), max(ax, bx)
        if hi < x_min or lo > x_max:
            continue
        if ax == bx:
            out.append(((ax, ay), (bx, by)))
            continue

        def at(x):
            return (x, ay + (x - ax) * (by - ay) / (bx - ax))

        ca = at(min(max(ax, x_min), x_max))
        cb = at(min(max(bx, x_min), x_max))
        if ca != cb:
            out.append((ca, cb))
    return out


def part_polylines():
    """Part geometry as open polylines in part coordinates."""
    b = layer_bounds()
    lines = []
    for name in ("A", "B"):
        y0, y1 = b[name]
        lines.append([(0, y0), (LENGTH, y0), (LENGTH, y1), (0, y1), (0, y0)])
    d0, d1 = b["D"]
    lines.append([(0, d0)] + profile_points(d1) + [(LENGTH, d0), (0, d0)])
    c0, c1 = b["C_CORE"]
    lines.append([(-TENON_LEN, c0), (LENGTH + TENON_LEN, c0),
                  (LENGTH + TENON_LEN, c1), (-TENON_LEN, c1), (-TENON_LEN, c0)])
    for x in (0, LENGTH):  # tenon shoulders
        lines.append([(x, c0), (x, c1)])
    return lines


def draw_part(msp, origin=(0, 0), scale=1.0, x_range=None):
    """Draw the part, optionally clipped to x_range (part coords) and scaled."""
    attribs = {"layer": "OUTLINE"}
    if x_range is None:
        tf = make_tf(origin, scale, 0.0)
        for line in part_polylines():
            msp.add_lwpolyline([tf(x, y) for x, y in line], dxfattribs=attribs)
        return
    tf = make_tf(origin, scale, x_range[0])
    for line in part_polylines():
        for p, q in clip_segments(line, *x_range):
            msp.add_line(tf(*p), tf(*q), dxfattribs=attribs)


def make_tf(origin, scale, x0):
    ox, oy = origin
    return lambda x, y: (ox + (x - x0) * scale, oy + y * scale)


def label(msp, text, pos, height):
    msp.add_text(text, height=height,
                 dxfattribs={"layer": "TEXT"}).set_placement(pos)


def build():
    doc = setup_doc()
    msp = doc.modelspace()
    b = layer_bounds()
    c0, c1 = b["C_CORE"]
    t_body = b["D"][1]
    x0, x1 = PROFILE_START, PROFILE_START + PROFILE_LEN
    mid = (x0 + x1) / 2
    n0, n1 = mid - NOTCH_WIDTH / 2, mid + NOTCH_WIDTH / 2
    yt = t_body + H_TOP

    # ---- Main view, full length ------------------------------------------
    draw_part(msp)
    add_dim(msp, (0, 0), (LENGTH, 0), (0, -1.0), "44 1/4")
    add_dim(msp, (-TENON_LEN, c0), (0, c0), (0, -0.5), "7/8")
    add_dim(msp, (LENGTH, c0), (LENGTH + TENON_LEN, c0), (0, -0.5), "7/8")
    add_dim(msp, (0, 0), (0, t_body), (-1.6, 0), "2 7/8", angle=90)
    add_dim(msp, (0, t_body), (x0, t_body), (0, yt + 1.2), "1 5/8")
    add_dim(msp, (x0, t_body), (x1, t_body), (0, yt + 1.2), "33 1/2")
    add_dim(msp, (x1, t_body), (LENGTH, t_body), (0, yt + 1.2), "9 1/8")
    add_dim(msp, (x0, t_body), (x0 + STEP_LEN, t_body + H_RISER),
            (0, yt + 0.6), "3\"")
    add_dim(msp, (x1 - STEP_LEN, t_body + H_RISER), (x1, t_body),
            (0, yt + 0.6), "3\"")
    add_dim(msp, (n0, yt), (n1, yt), (0, yt + 0.6), "4 9/16")
    label(msp, "SIDE ELEVATION  (SCALE NTS)", (0, yt + 2.6), 0.4)
    label(msp, "SEE DETAIL A", (0, yt + 1.95), 0.2)
    label(msp, "SEE DETAIL B", (mid - 0.8, yt + 1.95), 0.2)

    # ---- Detail A: left end, 3:1 -----------------------------------------
    s, xa0, xa1 = 3.0, -1.5, 6.0
    org = (0, -25.0)
    tf = make_tf(org, s, xa0)
    draw_part(msp, org, s, (xa0, xa1))
    for name, txt in (("A", "3/8"), ("B", "7/8"), ("C_CORE", "3/4"),
                      ("D", "7/8")):
        y0, y1 = b[name]
        add_dim(msp, tf(0, y0), tf(0, y1), (tf(-1.3, 0)[0], 0), txt, angle=90)
    add_dim(msp, tf(-TENON_LEN, c0), tf(0, c0), (0, tf(0, -0.4)[1]), "7/8")
    add_dim(msp, tf(0, t_body), tf(x0, t_body), (0, tf(0, yt + 0.9)[1]),
            "1 5/8")
    add_dim(msp, tf(x0, t_body), tf(x0 + STEP_LEN, t_body + H_RISER),
            (0, tf(0, yt + 0.9)[1]), "3\"")
    xs = x0 + STEP_LEN + H_TOP - H_RISER
    for lo, hi, xp, txt in ((0.0, H_STEP, x0 + H_STEP, "5/16"),
                            (H_STEP, H_RISER, x0 + STEP_LEN, "9/16"),
                            (H_RISER, H_TOP, xs, "13/16")):
        add_dim(msp, tf(xp, t_body + lo), tf(xp, t_body + hi),
                (tf(xs + 0.5, 0)[0], 0), txt, angle=90)
    add_dim(msp, tf(xs, t_body), tf(xs, yt), (tf(xs + 1.0, 0)[0], 0),
            "1 11/16", angle=90)
    label(msp, "DETAIL A - LEFT END  (SCALE 3:1)", tf(xa0, -0.9), 0.3)
    label(msp, "Right end mirrors left end (9 1/8 from end to profile).",
          tf(xa0, -1.1), 0.22)

    # ---- Detail B: center notch, 3:1 -------------------------------------
    xb0, xb1 = mid - 4.0, mid + 4.0
    org_b = (28.0, -25.0)
    tfb = make_tf(org_b, s, xb0)
    draw_part(msp, org_b, s, (xb0, xb1))
    add_dim(msp, tfb(n0, yt), tfb(n1, yt), (0, tfb(0, yt + 0.6)[1]),
            "4 9/16")
    add_dim(msp, tfb(n1, yt), tfb(n1 - NOTCH_DEPTH, yt - NOTCH_DEPTH),
            (tfb(n1 + 0.6, 0)[0], 0), "1/4 ASSUMED", angle=90)
    add_dim(msp, tfb(n1, yt), tfb(xb1, t_body),
            (tfb(xb1 + 0.3, 0)[0], 0), "1 11/16", angle=90)
    label(msp, "DETAIL B - CENTER NOTCH  (SCALE 3:1)", tfb(xb0, -0.9), 0.3)
    label(msp, "Notch centered on 33 1/2 profile, 45 deg sides.",
          tfb(xb0, -1.1), 0.22)

    # ---- Title and notes -------------------------------------------------
    label(msp, "LAMINATED PANEL", (0, -3.0), 0.5)
    label(msp, "UNITS: INCHES    SOURCE: HAND SKETCH    DATE: 2026-10-02",
          (0, -3.6), 0.25)
    for i, line in enumerate(ASSUMPTIONS):
        label(msp, f"{i + 1}. {line}", (0, -4.3 - i * 0.4), 0.22)
    return doc


def main():
    doc = build()
    dxf_path = OUT_DIR / f"{NAME}.dxf"
    pdf_path = OUT_DIR / f"{NAME}.pdf"
    doc.saveas(dxf_path)
    dxf_mpl.qsave(doc.modelspace(), str(pdf_path), bg="#FFFFFF",
                  fg="#000000", size_inches=(17, 11),
                  config=Configuration(color_policy=ColorPolicy.BLACK))
    print(f"wrote {dxf_path.name}, {pdf_path.name}")


if __name__ == "__main__":
    main()
