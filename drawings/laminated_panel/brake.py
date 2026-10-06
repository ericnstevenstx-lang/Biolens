"""Press brake sheet (PDF + DXF) for the laminated panel flat blank.

Reads the sketch as a 16 ga flat blank: the plasma cuts the outline
(laminated_panel.gm), and the three long lines across the blank are bend lines.

Run: python brake.py  ->  laminated_panel_brake.pdf, laminated_panel_brake.dxf
"""
from pathlib import Path

from ezdxf.addons.drawing import matplotlib as dxf_mpl
from ezdxf.addons.drawing.config import ColorPolicy, Configuration

from generate import (LENGTH, TENON_LEN, add_dim, clip_segments, label,
                      layer_bounds, make_tf, part_polylines, setup_doc)

OUT_DIR = Path(__file__).parent
NAME = "laminated_panel_brake"


def bend_lines():
    """(label, y) for each bend line, bottom edge = 0."""
    b = layer_bounds()
    ys = [b["A"][1], b["B"][1], b["C_CORE"][1]]
    return [(f"BL{i + 1}", y) for i, y in enumerate(ys)]


def draw_detail(msp, blank):
    """Left end of the blank at 4:1 with bend lines and dimensions."""
    s, x0, x1 = 4.0, -1.5, 5.5
    tf = make_tf((0, -22.0), s, x0)
    for p, q in clip_segments(blank, x0, x1):
        msp.add_line(tf(*p), tf(*q), dxfattribs={"layer": "OUTLINE"})
    for name, y in bend_lines():
        msp.add_line(tf(0, y), tf(x1, y), dxfattribs={"layer": "BEND"})
        label(msp, name, tf(x1 + 0.1, y - 0.03), 0.22)
    prev, chain = 0.0, ["3/8", "7/8", "3/4"]
    for (_, y), txt in zip(bend_lines(), chain):
        add_dim(msp, tf(0, prev), tf(0, y), (tf(-1.25, 0)[0], 0), txt,
                angle=90)
        prev = y
    top = layer_bounds()["D"][1]
    add_dim(msp, tf(0, prev), tf(0, top), (tf(-1.25, 0)[0], 0), "7/8",
            angle=90)
    add_dim(msp, tf(0, 0), tf(0, top), (tf(1.0, 0)[0], 0), "2 7/8 BLANK",
            angle=90)
    c0 = layer_bounds()["C_CORE"][0]
    add_dim(msp, tf(-TENON_LEN, c0), tf(0, c0), (0, tf(0, -0.3)[1]), "7/8")
    label(msp, "DETAIL - LEFT END  (SCALE 4:1)  right end is the same",
          tf(x0, -0.8), 0.3)


def build():
    doc = setup_doc()
    doc.linetypes.add("DASHED", pattern=[0.5, 0.3, -0.2],
                      description="Dashed __ __ __")
    doc.layers.add("BEND", color=5, linetype="DASHED")
    msp = doc.modelspace()

    # Blank outline (outer silhouette only; internal layer lines are bends)
    outline = part_polylines()[2:]  # D (profile) + core with tenons
    b = layer_bounds()
    d0, _ = b["D"]
    c0, c1 = b["C_CORE"]
    profile = outline[0]
    pts = [(-TENON_LEN, c0), (0, c0), (0, 0), (LENGTH, 0), (LENGTH, c0),
           (LENGTH + TENON_LEN, c0), (LENGTH + TENON_LEN, c1), (LENGTH, c1)]
    top = [p for p in profile[1:-2]]  # profile, left -> right, on top of D
    pts += list(reversed(top)) + [(0, c1), (-TENON_LEN, c1), (-TENON_LEN, c0)]
    msp.add_lwpolyline(pts, dxfattribs={"layer": "OUTLINE"})
    draw_detail(msp, pts)

    # Bend lines, full body length
    for name, y in bend_lines():
        msp.add_line((0, y), (LENGTH, y),
                      dxfattribs={"layer": "BEND", "ltscale": 1.0})
        label(msp, name, (LENGTH + TENON_LEN + 0.4, y - 0.08), 0.18)

    # Dimensions: bend locations from bottom edge, chained, plus overall
    prev = 0.0
    chain = {0.375: "3/8", 1.25: "7/8", 2.0: "3/4"}
    for _, y in bend_lines():
        add_dim(msp, (0, prev), (0, y), (-1.0, 0), chain[y], angle=90)
        prev = y
    add_dim(msp, (0, 2.0), (0, d0 + 0.875), (-1.0, 0), "7/8", angle=90)
    add_dim(msp, (0, 0), (0, 1.25), (-1.9, 0), "1 1/4", angle=90)
    add_dim(msp, (0, 0), (0, 2.0), (-2.6, 0), "2", angle=90)
    add_dim(msp, (0, 0), (LENGTH, 0), (0, -0.8), "44 1/4")
    add_dim(msp, (-TENON_LEN, c0), (0, c0), (0, -0.4), "7/8")
    add_dim(msp, (LENGTH, c0), (LENGTH + TENON_LEN, c0), (0, -0.4), "7/8")

    # Title, bend table, notes
    label(msp, "LAMINATED PANEL - FLAT BLANK / PRESS BRAKE", (0, 5.3), 0.45)
    label(msp, "MATERIAL: 16 GA (0.0598)   UNITS: INCHES   SCALE: NTS   "
               "PLASMA PROGRAM: laminated_panel.gm", (0, 4.8), 0.22)

    y = -1.6
    label(msp, "BEND TABLE  (dims from bottom edge of blank)", (0, y), 0.28)
    rows = [("BEND", "FROM BOTTOM", "LENGTH", "ANGLE", "DIRECTION")]
    rows += [(n, {0.375: "3/8", 1.25: "1 1/4", 2.0: "2"}[yy], "44 1/4",
              "____", "UP / DOWN") for n, yy in bend_lines()]
    cols = [0, 3, 7, 11, 15]
    for r, row in enumerate(rows):
        for c, txt in zip(cols, row):
            label(msp, txt, (c, y - 0.55 - r * 0.42), 0.22)

    notes = [
        "Bend lines are at the sketch dimensions on the flat blank.",
        "Confirm whether sketch dims are flat or formed; bend deduction not applied.",
        "Angle and direction not on sketch: fill in before forming.",
        "End tabs (7/8 x 3/4) sit between BL2 and BL3; check tab/flange clearance.",
    ]
    for i, n in enumerate(notes):
        label(msp, f"{i + 1}. {n}", (21, y - 0.55 - i * 0.42), 0.22)
    return doc


def main():
    doc = build()
    doc.saveas(OUT_DIR / f"{NAME}.dxf")
    dxf_mpl.qsave(doc.modelspace(), str(OUT_DIR / f"{NAME}.pdf"),
                  bg="#FFFFFF", fg="#000000", size_inches=(17, 11),
                  config=Configuration(color_policy=ColorPolicy.BLACK))
    print(f"wrote {NAME}.dxf, {NAME}.pdf")


if __name__ == "__main__":
    main()
