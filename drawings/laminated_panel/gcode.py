"""Generate Torchmate plasma G-code (.gm) for the laminated panel outline.

Cuts the full side-elevation silhouette (body, top profile, both tenons) as one
outside contour. Output matches the shop's working Torchmate files
(PLT-47x47_RevE.gm):
- G70 (inch), G90, M06 T1 header; M02 end. No comments, no Z, no spindle.
- M64 = torch on, M65 = torch off.
- Explicit G00/G01 on every move, 3 decimals, F on the first cut move.
- Torch path offset 0.030 toward the part side of every edge (shop convention).
- Outside contour cut clockwise; pierce in scrap below the bottom edge,
  straight lead-in, 0.125 overcut past the start.

Coordinates: inches, all positive. The part's bounding box (including the
tenons) starts at (MARGIN, MARGIN) from the table origin.

Requires: pip install shapely ezdxf matplotlib
Run: python gcode.py  ->  laminated_panel.gm
"""
from pathlib import Path

from shapely.affinity import translate
from shapely.geometry import Polygon

from generate import LENGTH, TENON_LEN, layer_bounds, profile_points

OUT = Path(__file__).parent / "laminated_panel.gm"

# ---- Cut parameters (match shop file; edit to suit) ------------------------
PATH_OFFSET = 0.030      # torch path inset toward the part side
FEED = 60.0              # in/min, same as PLT-47x47_RevE
MARGIN = 0.5             # part bounding box offset from table origin
LEAD_LEN = 0.25          # straight lead-in length from pierce point
LEAD_X = 10.0            # lead-in position along the bottom edge (part X)
OVERCUT = 0.125          # cut past the start point before torch off


def part_outline():
    """Closed silhouette of the part, counterclockwise."""
    b = layer_bounds()
    c0, c1 = b["C_CORE"]
    top = profile_points(b["D"][1])  # left -> right
    pts = [(-TENON_LEN, c0), (0, c0), (0, 0), (LENGTH, 0), (LENGTH, c0),
           (LENGTH + TENON_LEN, c0), (LENGTH + TENON_LEN, c1), (LENGTH, c1)]
    pts += list(reversed(top))
    pts += [(0, c1), (-TENON_LEN, c1)]
    return Polygon(pts)


def toolpath():
    """Torch path: outline inset by PATH_OFFSET, clockwise, placed at MARGIN,
    starting on the bottom edge at LEAD_X."""
    part = translate(part_outline(), MARGIN + TENON_LEN, MARGIN)
    ring = part.buffer(-PATH_OFFSET, join_style="mitre").exterior
    if ring.is_ccw:
        ring = ring.reverse()
    coords = list(ring.coords)[:-1]
    y_bot = MARGIN + PATH_OFFSET
    x_start = MARGIN + TENON_LEN + LEAD_X
    for i in range(len(coords)):
        (ax, ay), (bx, by) = coords[i], coords[(i + 1) % len(coords)]
        if abs(ay - y_bot) < 1e-9 and abs(by - y_bot) < 1e-9 \
                and min(ax, bx) < x_start < max(ax, bx):
            start = (x_start, y_bot)
            return [start] + coords[i + 1:] + coords[:i + 1] + [start]
    raise ValueError("lead-in point not on bottom edge")


def fmt(v):
    return f"{v:.3f}"


def build():
    path = toolpath()
    sx, sy = path[0]
    nx, _ = path[1]
    direction = -1 if nx < sx else 1
    lines = [
        "G70",
        "G90",
        "M06 T1",
        f"G00 X{fmt(sx)} Y{fmt(sy - LEAD_LEN)}",
        "M64",
        f"G01 X{fmt(sx)} Y{fmt(sy)} F{FEED:.3f}",
    ]
    lines += [f"G01 X{fmt(x)} Y{fmt(y)}" for x, y in path[1:]]
    lines += [
        f"G01 X{fmt(sx + direction * OVERCUT)} Y{fmt(sy)}",
        "M65",
        "G00 X0.000 Y0.000",
        "M02",
    ]
    return "\n".join(lines) + "\n"


def main():
    OUT.write_text(build())
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
