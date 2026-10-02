"""Generate plasma-cutter G-code (.gm) for the laminated panel outline.

Cuts the full side-elevation silhouette (body, top profile, both tenons) as one
outside contour from 16 ga sheet.

Plasma conventions used:
- XY only. No Z words, no spindle speed: torch height and pierce delay are
  left to the table's THC/controller settings.
- M07 = cut (torch) on, M08 = cut off, per Hypertherm/Phoenix-style EIA.
- Kerf offset computed in the path (no G41/G42).
- Outside contour cut clockwise so the good side of the cut faces the part.
- Straight lead-in/lead-out on the bottom edge, pierce point off the part.

Coordinates: inches. X/Y origin = bottom-left corner of the body (tenon
extends to X -0.875).

Requires: pip install shapely ezdxf matplotlib
Run: python gcode.py  ->  laminated_panel.gm
"""
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon

from generate import LENGTH, TENON_LEN, layer_bounds, profile_points

OUT = Path(__file__).parent / "laminated_panel.gm"

# ---- Cut parameters (ASSUMED, edit to suit the table) ----------------------
MATERIAL = "16 GA MILD STEEL, 0.0598 IN"
KERF = 0.060             # kerf width; path is offset by KERF / 2
FEED = 150.0             # in/min cut speed
LEAD_LEN = 0.25          # straight lead-in/out length, perpendicular to edge
LEAD_X = 10.0            # X position of the lead-in on the bottom edge
TORCH_ON = "M07"
TORCH_OFF = "M08"
ARC_SEGMENTS = 8         # segments per quarter circle on outside corners


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
    """Kerf-offset path, clockwise, starting at the bottom edge at LEAD_X."""
    ring = part_outline().buffer(KERF / 2, quad_segs=ARC_SEGMENTS,
                                 join_style="round").exterior
    if ring.is_ccw:
        ring = ring.reverse()
    coords = list(ring.coords)[:-1]
    # split the bottom-edge segment that crosses LEAD_X and start there
    y_bot = -KERF / 2
    for i in range(len(coords)):
        (ax, ay), (bx, by) = coords[i], coords[(i + 1) % len(coords)]
        if abs(ay - y_bot) < 1e-9 and abs(by - y_bot) < 1e-9 \
                and min(ax, bx) < LEAD_X < max(ax, bx):
            start = (LEAD_X, y_bot)
            seq = coords[i + 1:] + coords[:i + 1]
            return [start] + seq + [start]
    raise ValueError("lead-in point not on bottom edge")


def fmt(v):
    return f"{v:.4f}"


def build():
    path = toolpath()
    sx, sy = path[0]
    pierce = (sx, sy - LEAD_LEN)
    lines = [
        "(LAMINATED PANEL - PLASMA OUTSIDE PROFILE)",
        f"(MATERIAL: {MATERIAL})",
        f"(KERF {KERF} IN, OFFSET APPLIED IN PATH)",
        "(XY0 = BOTTOM-LEFT CORNER OF BODY)",
        "G20",
        "G90",
        f"G0 X{fmt(pierce[0])} Y{fmt(pierce[1])}",
        TORCH_ON,
        f"G1 X{fmt(sx)} Y{fmt(sy)} F{FEED:.0f}",
    ]
    lines += [f"G1 X{fmt(x)} Y{fmt(y)}" for x, y in path[1:]]
    lines += [
        f"G1 X{fmt(pierce[0] + LEAD_LEN)} Y{fmt(pierce[1])}",
        TORCH_OFF,
        "G0 X0.0000 Y0.0000",
        "M30",
    ]
    return "\n".join(lines) + "\n"


def main():
    OUT.write_text(build())
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
