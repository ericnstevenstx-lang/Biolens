"""Generate CNC G-code (.gm) for the laminated panel outer profile.

Cuts the full side-elevation silhouette (body, top profile, both tenons) as one
outside contour, with the tool offset computed here (no G41/G42), so the file
runs on GRBL, Mach3/4 and Fanuc-style controllers.

Coordinates: inches. X/Y origin = bottom-left corner of the body (tenon
extends to X -0.875). Z0 = top of stock.

Requires: pip install shapely ezdxf matplotlib
Run: python gcode.py  ->  laminated_panel.gm
"""
from pathlib import Path

from shapely.geometry import Polygon

from generate import LENGTH, TENON_LEN, layer_bounds, profile_points

OUT = Path(__file__).parent / "laminated_panel.gm"

# ---- Machining parameters (ASSUMED, edit to suit the machine) --------------
TOOL_DIA = 0.25          # flat end mill
STOCK_THICKNESS = 0.75   # cut depth to get through the stock
BREAKTHROUGH = 0.02      # extra depth below stock bottom (into spoilboard)
STEP_DOWN = 0.25         # depth per pass
SAFE_Z = 0.5
FEED = 100.0             # in/min, cutting
PLUNGE = 30.0            # in/min, plunge
SPINDLE_RPM = 18000
ARC_SEGMENTS = 16        # segments per quarter circle on rounded outside corners


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
    """Tool-center path: outline offset outward by tool radius, CCW
    (conventional cut with M3), starting at the bottom-left corner."""
    path = part_outline().buffer(TOOL_DIA / 2, quad_segs=ARC_SEGMENTS,
                                 join_style="round").exterior
    if not path.is_ccw:
        path = path.reverse()
    coords = list(path.coords)[:-1]
    start = min(range(len(coords)),
                key=lambda i: coords[i][0] + coords[i][1])
    coords = coords[start:] + coords[:start]
    return coords + [coords[0]]


def depth_levels():
    final = -(STOCK_THICKNESS + BREAKTHROUGH)
    z, levels = 0.0, []
    while z - STEP_DOWN > final + 1e-9:
        z -= STEP_DOWN
        levels.append(round(z, 4))
    levels.append(round(final, 4))
    return levels


def fmt(v):
    return f"{v:.4f}"


def build():
    path = toolpath()
    x0, y0 = path[0]
    lines = [
        "%",
        "(LAMINATED PANEL - OUTSIDE PROFILE)",
        "(SOURCE: HAND SKETCH, SEE laminated_panel.pdf FOR ASSUMPTIONS)",
        f"(TOOL: {TOOL_DIA} IN FLAT END MILL, OFFSET APPLIED IN PATH)",
        f"(STOCK: {STOCK_THICKNESS} IN, Z0 = TOP OF STOCK)",
        "(XY0 = BOTTOM-LEFT CORNER OF BODY, TENON AT X-0.875)",
        "G20 G90 G17 G94",
        f"M3 S{SPINDLE_RPM}",
        f"G0 Z{fmt(SAFE_Z)}",
        f"G0 X{fmt(x0)} Y{fmt(y0)}",
    ]
    for z in depth_levels():
        lines.append(f"(PASS Z{fmt(z)})")
        lines.append(f"G1 Z{fmt(z)} F{PLUNGE:.0f}")
        lines.append(f"G1 X{fmt(path[1][0])} Y{fmt(path[1][1])} F{FEED:.0f}")
        lines += [f"X{fmt(x)} Y{fmt(y)}" for x, y in path[2:]]
    lines += [f"G0 Z{fmt(SAFE_Z)}", "M5", "G0 X0 Y0", "M30", "%"]
    return "\n".join(lines) + "\n"


def main():
    OUT.write_text(build())
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
