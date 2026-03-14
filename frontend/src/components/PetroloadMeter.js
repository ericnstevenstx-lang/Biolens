import { getPetroloadLevel } from "@/lib/biolens";

export default function PetroloadMeter({ score, size = "large" }) {
  const level = getPetroloadLevel(score);
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));

  // Arc geometry
  const isLarge = size === "large";
  const svgW = isLarge ? 220 : 140;
  const svgH = isLarge ? 130 : 85;
  const cx = svgW / 2;
  const cy = isLarge ? 110 : 72; // Baseline of the semicircle
  const r = isLarge ? 90 : 58;
  const strokeW = isLarge ? 12 : 8;

  // CORRECTED TRIGONOMETRIC CALCULATION
  // Map 0-100% score to π (left) to 0 (right) radians
  const scoreRatio = clampedScore / 100;
  const angle = Math.PI * (1 - scoreRatio);
  
  // Calculate exact marker coordinates
  // CRITICAL FIX: Subtract Y component for SVG coordinate system
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy - r * Math.sin(angle); // ← KEY FIX: Minus instead of plus

  // Background semicircle path
  const x1 = cx - r; // Left endpoint
  const y1 = cy;     // Baseline height
  const x2 = cx + r; // Right endpoint
  const y2 = cy;     // Baseline height
  
  const bgPath = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;

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
        
        {/* Precisely positioned marker dot */}
        {clampedScore > 0 && (
          <circle 
            cx={markerX} 
            cy={markerY} 
            r={isLarge ? 8 : 6} 
            fill={level.color}
            stroke="white"
            strokeWidth={3}
            style={{ 
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))"
            }}
          />
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy - (isLarge ? 25 : 15)}
          textAnchor="middle"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: isLarge ? "2.5rem" : "1.6rem",
            fontWeight: 800,
            fill: "#1D1D1F",
          }}
        >
          {score != null ? score : "—"}
        </text>
        
        <text
          x={cx}
          y={cy - (isLarge ? 5 : 2)}
          textAnchor="middle"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: isLarge ? "0.75rem" : "0.55rem",
            fontWeight: 600,
            fill: "#86868B",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <div className="text-center" style={{ marginTop: isLarge ? '8px' : '4px' }}>
        <span
          data-testid="petroload-label"
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold`}
          style={{
            fontFamily: "'Inter', sans-serif",
            backgroundColor: `${level.color}15`,
            color: level.color,
            letterSpacing: "0.03em",
            border: `1px solid ${level.color}30`
          }}
        >
          {level.label} Petroload
        </span>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          {level.label === 'High' ? 'High Petrochemical Dependence' : 
           level.label === 'Medium' ? 'Moderate Petrochemical Dependence' : 
           'Low Petrochemical Dependence'}
        </p>
      </div>
    </div>
  );
}
