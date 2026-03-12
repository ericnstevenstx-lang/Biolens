import { useState, useEffect, useRef } from "react";

/**
 * Compute estimated material composition from classification + petroload.
 */
export function getMaterialDNA(result) {
  const petroload = result?.petroloadScore ?? 50;
  const cls = (result?.materialClass || "").toLowerCase();

  if (cls.includes("petro")) {
    const hybrid = Math.min(100 - petroload, 5);
    return { petroleum: petroload, natural: 0, hybrid };
  }
  if (cls.includes("plant")) {
    const natural = Math.max(0, 100 - petroload - 5);
    return { petroleum: petroload, natural, hybrid: 5 };
  }
  if (cls.includes("transition")) {
    const rest = 100 - petroload;
    return { petroleum: petroload, natural: Math.round(rest * 0.35), hybrid: Math.round(rest * 0.65) };
  }
  if (cls.includes("natural")) {
    const natural = Math.max(0, 100 - petroload - 3);
    return { petroleum: petroload, natural, hybrid: 3 };
  }
  // mineral / mixed
  const rest = 100 - petroload;
  return { petroleum: petroload, natural: Math.round(rest * 0.5), hybrid: Math.round(rest * 0.5) };
}

const SEGMENTS = [
  { key: "petroleum", label: "Petroleum-Derived", color: "#EF4444" },
  { key: "natural", label: "Natural Fiber", color: "#22C55E" },
  { key: "hybrid", label: "Semi-Synthetic", color: "#EAB308" },
];

/**
 * Animated donut chart showing material composition.
 */
export default function MaterialDNA({ result }) {
  const dna = getMaterialDNA(result);
  const [animProgress, setAnimProgress] = useState(0);
  const [hoveredSeg, setHoveredSeg] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimProgress(eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Build arc segments
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 82;
  const innerR = 54;
  const gap = 0.02; // radians gap between segments

  const total = dna.petroleum + dna.natural + dna.hybrid;
  const segments = SEGMENTS.map((seg) => ({
    ...seg,
    value: dna[seg.key],
    pct: total > 0 ? dna[seg.key] / total : 0,
  })).filter((s) => s.pct > 0);

  let currentAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const startAngle = currentAngle + gap / 2;
    const sweep = seg.pct * (2 * Math.PI - gap * segments.length) * animProgress;
    const endAngle = startAngle + sweep;
    currentAngle = startAngle + seg.pct * (2 * Math.PI - gap * segments.length);

    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(endAngle);
    const y2i = cy + innerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(startAngle);
    const y1i = cy + innerR * Math.sin(startAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x2i} ${y2i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1i} ${y1i}`,
      "Z",
    ].join(" ");

    return { ...seg, d, midAngle: (startAngle + endAngle) / 2 };
  });

  return (
    <div data-testid="material-dna-chart" className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
      {/* SVG donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
        >
          {/* Background track */}
          <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="#F3F4F6" strokeWidth={outerR - innerR} />

          {/* Segments */}
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill={arc.color}
              opacity={hoveredSeg && hoveredSeg !== arc.key ? 0.3 : 1}
              style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
              onMouseEnter={() => setHoveredSeg(arc.key)}
              onMouseLeave={() => setHoveredSeg(null)}
            />
          ))}

          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: "1.6rem", fontWeight: 800, fill: "#1D1D1F" }}>
            {Math.round(dna.petroleum)}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.55rem", fontWeight: 500, fill: "#86868B", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Petro-Derived
          </text>
        </svg>

        {/* Hover tooltip */}
        {hoveredSeg && (
          <div
            className="absolute pointer-events-none px-2.5 py-1 rounded-lg shadow-lg text-xs font-medium"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -140%)",
              backgroundColor: "rgba(29,29,31,0.92)",
              color: "white",
              whiteSpace: "nowrap",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {SEGMENTS.find((s) => s.key === hoveredSeg)?.label}: {dna[hoveredSeg]}%
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            data-testid={`dna-segment-${seg.key}`}
            className="flex items-center gap-3 cursor-pointer"
            onMouseEnter={() => setHoveredSeg(seg.key)}
            onMouseLeave={() => setHoveredSeg(null)}
            style={{ opacity: hoveredSeg && hoveredSeg !== seg.key ? 0.4 : 1, transition: "opacity 0.2s ease" }}
          >
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <div>
              <p className="text-xs font-semibold" style={{ fontFamily: "'Manrope', sans-serif", color: "#1D1D1F" }}>
                {dna[seg.key]}% {seg.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
