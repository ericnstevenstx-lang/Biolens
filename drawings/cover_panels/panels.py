"""Cover panels for the switchgear sections: flat blank, brake sheet, Torchmate .gm.

Each panel is a flat sheet with a 3/4 lip bent up on all four sides.
Finished sizes (outside): 25 x 90 and 26 x 90 (two of each).

Flat blank = finished size + 3/4 lip each side, with 3/4 x 3/4 corner notches.
No bend deduction is applied (matches the shop's other flat programs).

Run: python panels.py  ->  PNL-<W>x90.gm / .dxf / .pdf for each width
"""
from pathlib import Path

import ezdxf
from ezdxf.addons.drawing import matplotlib as dxf_mpl
from ezdxf.addons.drawing.config import ColorPolicy, Configuration
from shapely.affinity import translate
from shapely.geometry import Polygon

OUT_DIR = Path(__file__).parent

WIDTHS = [25.0, 26.0]      # finished outside width
HEIGHT = 90.0              # finished outside height
LIP = 0.75                 # lip on all four sides
QTY = {25.0: 2, 26.0: 2}

# Torchmate cut settings, same as PLT-47x47_RevE.gm
PATH_OFFSET = 0.030        # torch path inset toward the part
FEED = 60.0
MARGIN = 0.25              # blank offset from table origin
LEAD_LEN = 0.25
OVERCUT = 0.125


def blank_points(w, h):
    """Flat blank outline with corner notches, CCW, origin at bottom-left."""
    W, H, L = w + 2 * LIP, h + 2 * LIP, LIP
    return [(L, 0), (W - L, 0), (W - L, L), (W, L), (W, H - L), (W - L, H - L),
            (W - L, H), (L, H), (L, H - L), (0, H - L), (0, L), (L, L)]


def frac(v):
    n = round(v * 16)
    whole, r, d = n // 16, n % 16, 16
    while r and r % 2 == 0:
        r //= 2
        d //= 2
    return f"{whole} {r}/{d}" if r and whole else (f"{r}/{d}" if r else f"{whole}")


# ---------------------------------------------------------------- G-code
def toolpath(w, h):
    """Inset path, clockwise, starting on the top-left notch's bottom edge."""
    part = translate(Polygon(blank_points(w, h)), MARGIN, MARGIN)
    ring = part.buffer(-PATH_OFFSET, join_style="mitre").exterior
    if ring.is_ccw:
        ring = ring.reverse()
    coords = list(ring.coords)[:-1]
    H = h + 2 * LIP
    y_edge = MARGIN + H - LIP - PATH_OFFSET
    x_start = MARGIN + LIP / 2
    for i in range(len(coords)):
        (ax, ay), (bx, by) = coords[i], coords[(i + 1) % len(coords)]
        if abs(ay - y_edge) < 1e-9 and abs(by - y_edge) < 1e-9 \
                and min(ax, bx) < x_start < max(ax, bx):
            start = (x_start, y_edge)
            return [start] + coords[i + 1:] + coords[:i + 1] + [start]
    raise ValueError("start edge not found")


def gcode(w, h):
    f = lambda v: f"{v:.3f}"
    path = toolpath(w, h)
    sx, sy = path[0]
    nx = path[1][0]
    d = 1 if nx > sx else -1
    lines = ["G70", "G90", "M06 T1",
             f"G00 X{f(sx)} Y{f(sy + LEAD_LEN)}",   # pierce in notch scrap
             "M64",
             f"G01 X{f(sx)} Y{f(sy)} F{FEED:.3f}"]
    lines += [f"G01 X{f(x)} Y{f(y)}" for x, y in path[1:]]
    lines += [f"G01 X{f(sx + d * OVERCUT)} Y{f(sy)}", "M65",
              "G00 X0.000 Y0.000", "M02"]
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- drawing
def drawing(w, h):
    doc = ezdxf.new("R2010", setup=True)
    doc.header["$INSUNITS"] = 1
    doc.linetypes.add("DASHED", pattern=[1.0, 0.6, -0.4])
    for name, color, lt in [("OUTLINE", 7, "Continuous"), ("BEND", 5, "DASHED"),
                            ("DIM", 1, "Continuous"), ("TEXT", 3, "Continuous")]:
        doc.layers.add(name, color=color, linetype=lt)
    ds = doc.dimstyles.new("FRAC")
    ds.dxf.dimtxt, ds.dxf.dimasz, ds.dxf.dimexo, ds.dxf.dimexe = 0.9, 0.6, 0.2, 0.3
    ds.dxf.dimgap, ds.dxf.dimtad = 0.2, 1
    msp = doc.modelspace()

    W, H, L = w + 2 * LIP, h + 2 * LIP, LIP
    msp.add_lwpolyline(blank_points(w, h), close=True,
                       dxfattribs={"layer": "OUTLINE"})
    for p, q in [((L, L), (W - L, L)), ((L, H - L), (W - L, H - L)),
                 ((L, L), (L, H - L)), ((W - L, L), (W - L, H - L))]:
        msp.add_line(p, q, dxfattribs={"layer": "BEND"})

    def dim(p1, p2, base, text, angle=0):
        msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=angle, text=text,
                           dimstyle="FRAC", dxfattribs={"layer": "DIM"}).render()

    dim((0, L), (W, L), (0, -3.0), f"{frac(W)} BLANK")
    dim((L, L), (W - L, L), (0, -1.5), f"{frac(w)} BEND TO BEND")
    dim((0, 0 + L), (0, H - L), (-3.0, 0), f"{frac(h)} BEND TO BEND", angle=90)
    dim((L, 0), (L, H), (-5.0, 0), f"{frac(H)} BLANK", angle=90)
    dim((W - L, H), (W, H - L), (0, H + 1.5), "3/4")
    dim((W, H - L), (W - L, H), (W + 1.5, 0), "3/4", angle=90)

    def text(s, x, y, ht):
        msp.add_text(s, height=ht, dxfattribs={"layer": "TEXT"}).set_placement((x, y))

    tx = W + 6
    text(f"PNL-{frac(w)}x{frac(h)}  COVER PANEL", tx, H - 2, 1.4)
    notes = [
        f"QTY: {QTY[w]}    MATERIAL: 16 GA    UNITS: INCHES",
        f"FINISHED: {frac(w)} x {frac(h)} OUTSIDE, 3/4 LIP ALL 4 SIDES",
        f"FLAT BLANK: {frac(W)} x {frac(H)}, 3/4 x 3/4 CORNER NOTCHES",
        "BEND LINES (DASHED): 3/4 IN FROM EACH EDGE",
        "ALL 4 BENDS 90 DEG, SAME DIRECTION",
        "NO BEND DEDUCTION APPLIED - CHECK FIRST PART",
        f"PLASMA PROGRAM: PNL-{int(w)}x{int(h)}.gm",
    ]
    for i, n in enumerate(notes):
        text(n, tx, H - 5 - i * 2.0, 0.9)
    return doc


def main():
    for w in WIDTHS:
        name = f"PNL-{int(w)}x{int(HEIGHT)}"
        (OUT_DIR / f"{name}.gm").write_text(gcode(w, HEIGHT))
        doc = drawing(w, HEIGHT)
        doc.saveas(OUT_DIR / f"{name}.dxf")
        dxf_mpl.qsave(doc.modelspace(), str(OUT_DIR / f"{name}.pdf"),
                      bg="#FFFFFF", fg="#000000", size_inches=(11, 17),
                      config=Configuration(color_policy=ColorPolicy.BLACK))
        print("wrote", name)


if __name__ == "__main__":
    main()
