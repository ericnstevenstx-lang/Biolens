import { getPetroloadLevel } from "@/lib/biolens";

/**
 * Petroload arc gauge visualization.
 * Displays a half-circle arc meter with score marker and label.
 */
export default function PetroloadMeter({ score, size = "large" }) {
  const level = getPetroloadLevel(score);
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));

  // Arc geometry
  const isLarge = size === "large";
  const svgW = isLarge ? 220 : 140;
  const svgH = isLarge ? 130 : 85;
  const cx = svgW / 2;
  const cy = isLarge ? 110 : 72;
  const r = isLarge ? 90 : 58;
  const strokeW = isLarge ? 12 : 8;

  // Background arc: full semicircle from left to right
  const startAngle = Math.PI;   // 180° (leftmost)
  const endAngle = 0;           // 0° (rightmost)
  
  // Background arc coordinates
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  
  // Background path (full semicircle)
  const bgPath = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;

  // MARKER CALCULATION: Position marker at exact score location
  const scoreT = clampedScore / 100; // 0-1 range
  const scoreAngle = startAngle + (endAngle - startAngle) * scoreT;
  
  // Marker width in radians (creates a small colored segment)
  const markerWidthDegrees = isLarge ? 8 : 6; // degrees
  const markerWidth = (markerWidthDegrees * Math.PI) / 180; // convert to radians
  
  const markerStartAngle = scoreAngle - markerWidth / 2;
  const markerEndAngle = scoreAngle + markerWidth / 2;
  
  // Marker arc coordinates
  const xMarkerStart = cx + r * Math.cos(markerStartAngle);
  const yMarkerStart = cy + r * Math.sin(markerStartAngle);
  const xMarkerEnd = cx + r * Math.cos(markerEndAngle);
  const yMarkerEnd = cy + r * Math.sin(markerEndAngle);
  
  // Marker path (small arc segment at score position)
  const markerPath = `M ${xMarkerStart} ${yMarkerStart} A ${r} ${r} 0 0 1 ${xMarkerEnd} ${yMarkerEnd}`;

  return (
    <div data-testid="petroload-meter" className="flex flex-col items-center">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible"
      >
        {/* Background arc (gray semicircle) */}
        <path
          d={bgPath}
          fill="none"
          stroke="#E5E5E5"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        
        {/* Score marker (colored segment at exact score position) */}
        {clampedScore > 0 && (
          <path
            d={markerPath}
            fill="none"
            stroke={level.color}
            strokeWidth={strokeW + 2} // Slightly thicker for visibility
            strokeLinecap="round"
            style={{
              transition: "stroke 0.3s ease",
            }}
          />
        )}
        
        {/* Score text */}
        <text
          x={cx}
          y={cy - (isLarge ? 20 : 12)}
          textAnchor="middle"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: isLarge ? "2.2rem" : "1.4rem",
            fontWeight: 700,
            fill: "#1D1D1F",
          }}
        >
          {score != null ? score : "—"}
        </text>
        <text
          x={cx}
          y={cy - (isLarge ? 2 : 0)}
          textAnchor="middle"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isLarge ? "0.65rem" : "0.5rem",
            fontWeight: 500,
            fill: "#86868B",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <div className="text-center" style={{ marginTop: isLarge ? '-8px' : '-4px' }}>
        <span
          data-testid="petroload-label"
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold`}
          style={{
            fontFamily: "'Inter', sans-serif",
            backgroundColor: `${level.color}15`,
            color: level.color,
            letterSpacing: "0.03em",
          }}
        >
          {level.label} Petroload
        </span>
      </div>
    </div>
  );
}
