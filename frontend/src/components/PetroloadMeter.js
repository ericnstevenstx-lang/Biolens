import { getPetroloadLevel } from "@/lib/biolens";

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

  // PRECISE TRIGONOMETRIC CALCULATION
  // Map 0-100 score to π (left) to 0 (right) radians
  const angle = Math.PI - (Math.PI * (clampedScore / 100));
  
  // Calculate exact marker coordinates
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy + r * Math.sin(angle);

  // Background semicircle path
  const bgPath = `M ${cx + r * Math.cos(Math.PI)} ${cy + r * Math.sin(Math.PI)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(0)} ${cy + r * Math.sin(0)}`;

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
        
        {/* Precise marker dot at calculated position */}
        {clampedScore > 0 && (
          <circle 
            cx={markerX} 
            cy={markerY} 
            r={strokeW / 1.5} 
            fill={level.color}
            stroke="white"
            strokeWidth={2}
            style={{ 
              transition: "all 0.5s ease-out",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
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
