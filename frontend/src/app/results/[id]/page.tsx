"use client";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PETROLOAD_COLORS: Record<string, string> = {
  "bio-based": "#10b981", bridge: "#f59e0b", synthetic: "#f97316", petrochemical: "#ef4444"
};

function classify(score: number) {
  if (score <= 20) return "bio-based";
  if (score <= 50) return "bridge";
  if (score <= 80) return "synthetic";
  return "petrochemical";
}

function ResultsContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const inputType = searchParams.get("type") ?? "search";
  const value = searchParams.get("q") ?? decodeURIComponent(id);
  const [data, setData] = useState<any>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputType, value }) });
        const json = await res.json();
        if (json.success) { setData(json.product); setOrigin(json.origin); }
        else { setError(json.error || "Analysis failed"); }
      } catch { setError("Connection error"); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-[#070b12] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[#94a3b8] text-sm" style={{fontFamily:"var(--font-manrope)"}}>Analyzing materials...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="min-h-screen bg-[#070b12] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-red-400 font-semibold">{error}</p>
        <Link href="/" className="text-[#06b6d4] text-sm hover:underline">Back to scan</Link>
      </div>
    </main>
  );

  if (!data) return null;

  const label = classify(data.petroloadIndex ?? 0);
  const color = PETROLOAD_COLORS[label];
  const score = data.petroloadIndex ?? 0;
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (score / 100) * circumference * 0.75;

  return (
    <main className="min-h-screen bg-[#070b12]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b12]/90 backdrop-blur-md border-b border-[#1e293b] h-14 flex items-center px-6 gap-3">
        <Link href="/" className="text-[#06b6d4] font-bold text-lg" style={{fontFamily:"var(--font-manrope)"}}>BioLens</Link>
        <span className="text-[#475569]">/</span>
        <span className="text-[#94a3b8] text-sm truncate max-w-xs">{data.name}</span>
      </header>
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 space-y-4">

        {/* Product header */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-1" style={{fontFamily:"var(--font-manrope)"}}>{data.brand}</p>
              <h1 className="text-white font-bold text-2xl" style={{fontFamily:"var(--font-manrope)"}}>{data.name}</h1>
              {data.category && <p className="text-[#475569] text-sm mt-1">{data.category}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl border" style={{borderColor: color + "30", backgroundColor: color + "12"}}>
              <span className="font-black text-2xl leading-none" style={{color, fontFamily:"var(--font-manrope)"}}>{score}</span>
              <span className="text-xs font-semibold capitalize mt-0.5" style={{color, fontFamily:"var(--font-manrope)"}}>{label}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#1e293b] flex gap-2">
            <button className="flex-1 sm:flex-none py-2.5 px-4 bg-[#06b6d4] text-[#070b12] rounded-xl text-sm font-bold" style={{fontFamily:"var(--font-manrope)"}}>Replace This Product</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gauge */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col items-center gap-4">
            <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest" style={{fontFamily:"var(--font-manrope)"}}>Petroload Index</p>
            <svg viewBox="0 0 216 216" className="w-48 h-48">
              <path d="M 38.4 177.6 A 88 88 0 1 1 177.6 177.6" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round"/>
              <path d="M 38.4 177.6 A 88 88 0 1 1 177.6 177.6" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference * 0.75} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1s ease"}}/>
              <text x="108" y="108" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="52" fontFamily="var(--font-manrope)" fontWeight="700">{score}</text>
              <text x="108" y="134" textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="var(--font-manrope)" fontWeight="600">{label.toUpperCase()}</text>
            </svg>
          </div>

          {/* Origin */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 space-y-3">
            <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest" style={{fontFamily:"var(--font-manrope)"}}>Origin Intelligence</p>
            {origin && [
              ["Made In", origin.madeIn], ["Ships From", origin.shipsFrom],
              ["Sold By", origin.soldBy], ["Manufacturer", origin.manufacturer]
            ].map(([label, val]) => val && (
              <div key={label} className="flex justify-between py-2 border-b border-[#1e293b] last:border-0">
                <span className="text-xs text-[#475569] font-semibold uppercase tracking-wider">{label}</span>
                <span className="text-sm text-[#94a3b8]">{val}</span>
              </div>
            ))}
          </div>

          {/* Materials */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 space-y-3">
            <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest" style={{fontFamily:"var(--font-manrope)"}}>Material Intelligence</p>
            {(data.materials ?? []).map((m: any, i: number) => (
              <div key={i} className="p-3 bg-[#0c1220] border border-[#1e293b] rounded-xl">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-white" style={{fontFamily:"var(--font-manrope)"}}>{m.name}</span>
                  <span className="text-xs text-[#94a3b8]">{m.classification}</span>
                </div>
                {m.percentage !== undefined && (
                  <div className="mt-2 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#06b6d4]" style={{width: m.percentage + "%"}}/>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Health */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 space-y-3">
            <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest" style={{fontFamily:"var(--font-manrope)"}}>Health Effects</p>
            {data.healthEffects && (
              <div className="p-3 rounded-xl border" style={{borderColor: (data.healthEffects.hazardSignal === "high" ? "#ef4444" : data.healthEffects.hazardSignal === "moderate" ? "#f59e0b" : "#10b981") + "30", backgroundColor: (data.healthEffects.hazardSignal === "high" ? "#ef4444" : data.healthEffects.hazardSignal === "moderate" ? "#f59e0b" : "#10b981") + "10"}}>
                <p className="font-semibold text-sm capitalize" style={{fontFamily:"var(--font-manrope)", color: data.healthEffects.hazardSignal === "high" ? "#ef4444" : data.healthEffects.hazardSignal === "moderate" ? "#f59e0b" : "#10b981"}}>
                  {data.healthEffects.hazardSignal} Hazard
                </p>
              </div>
            )}
            {(data.alternatives ?? []).length > 0 && (
              <div className="pt-3 border-t border-[#1e293b]">
                <p className="text-xs text-[#475569] mb-2 uppercase tracking-wider font-semibold" style={{fontFamily:"var(--font-manrope)"}}>Better Alternative</p>
                <p className="text-sm font-semibold text-[#10b981]" style={{fontFamily:"var(--font-manrope)"}}>{data.alternatives[0].name}</p>
                <p className="text-xs text-[#10b981]">-{data.alternatives[0].petroloadImprovement} Petroload</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#070b12] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <ResultsContent id={id} />
    </Suspense>
  );
}
