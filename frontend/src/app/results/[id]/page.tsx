"use client";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Material { name: string; classification: "bio"|"bridge"|"synthetic"|"unknown"; percentage?: number; healthScore?: number; confidence?: string; notes?: string; }
interface ExposurePathway { type: string; risk: "low"|"moderate"|"high"; notes?: string; }
interface HealthEffects { hazardSignal: string; endocrineDisruption?: boolean|null; carcinogenicity?: boolean|null; leachateRisk?: boolean|null; exposurePathways?: ExposurePathway[]; chemicalFlags?: string[]; confidence?: string; evidenceAvailable?: boolean; notes?: string; }
interface LifecycleData { score: number; recyclable?: boolean|null; compostable?: boolean|null; landfillPersistenceYears?: number; microplasticRisk?: string; endOfLifePathway?: string; confidence?: string; }
interface Alternative { id: string; name: string; material?: string; petroloadImprovement: number; microplasticReduction?: number; lifecycleImprovement?: number; confidence?: string; }
interface CorporateData { brand?: string; brandOwner?: string; manufacturer?: string; distributor?: string; parentCompany?: string; confidence?: string; }
interface OriginData { madeIn?: string; shipsFrom?: string; soldBy?: string; manufacturer?: string; importer?: string; disclosureLevel?: string; confidence?: string; flags?: string[]; }
interface ProductData { id: string; name: string; brand?: string; imageUrl?: string; barcode?: string; category?: string; petroloadIndex: number; petroloadLabel?: string; materials?: Material[]; healthEffects?: HealthEffects; lifecycle?: LifecycleData; alternatives?: Alternative[]; corporate?: CorporateData; evidence?: { sources?: { title: string; type: string; year?: number; url?: string }[]; methodology?: string; lastUpdated?: string }; materialInsight?: { headline: string; body: string }; confidence?: string; }

const PETRO_COLORS: Record<string, string> = { "bio-based":"#10b981", bridge:"#f59e0b", synthetic:"#f97316", petrochemical:"#ef4444" };
const PETRO_LABELS = [
  { max:20, label:"bio-based", color:"#10b981" },
  { max:50, label:"bridge", color:"#f59e0b" },
  { max:80, label:"synthetic", color:"#f97316" },
  { max:100, label:"petrochemical", color:"#ef4444" },
];
function getPetroLabel(score: number) { return PETRO_LABELS.find(l => score <= l.max) || PETRO_LABELS[3]; }

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
function PetroGauge({ score }: { score: number }) {
  const info = getPetroLabel(score);
  const color = info.color;
  const r = 80; const cx = 100; const cy = 100;
  const circumference = 2 * Math.PI * r * 0.75;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{fontFamily:"var(--font-manrope)"}}>Petroload Index</p>
      <svg width="200" height="160" viewBox="0 0 200 200">
        <path d="M 30 170 A 80 80 0 1 1 170 170" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"/>
        <path d="M 30 170 A 80 80 0 1 1 170 170" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)",filter:`drop-shadow(0 0 8px ${color}80)`}}/>
        {[{at:20,c:"#10b981"},{at:50,c:"#f59e0b"},{at:80,c:"#f97316"}].map(({at,c})=>{
          const a = -225 + (at/100)*270; const rad=(a*Math.PI)/180;
          return <circle key={at} cx={cx+r*Math.cos(rad)} cy={cy+r*Math.sin(rad)} r="5" fill="#070b12" stroke={c} strokeWidth="1.5"/>;
        })}
        <text x="100" y="105" textAnchor="middle" fontSize="38" fontWeight="800" fill={color} fontFamily="var(--font-manrope)" style={{letterSpacing:"-1px"}}>{score}</text>
        <text x="100" y="130" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="var(--font-manrope)" letterSpacing="2">{info.label.toUpperCase()}</text>
      </svg>
      <div className="flex gap-3 text-xs">
        {PETRO_LABELS.map(l=><div key={l.label} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:l.color}}/><span className="text-slate-500 capitalize">{l.label}</span></div>)}
      </div>
    </div>
  );
}

// ─── Badge components ─────────────────────────────────────────────────────────
function Confidence({ level }: { level?: string }) {
  if (!level) return null;
  const cfg: Record<string, { color: string; bg: string }> = {
    verified:{color:"#10b981",bg:"rgba(16,185,129,0.1)"}, inferred:{color:"#3b82f6",bg:"rgba(59,130,246,0.1)"},
    estimated:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"}, "supplier-disclosed":{color:"#06b6d4",bg:"rgba(6,182,212,0.1)"},
    "regulatory-backed":{color:"#10b981",bg:"rgba(16,185,129,0.1)"}, mixed:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"},
    limited:{color:"#475569",bg:"rgba(71,85,105,0.1)"}, unknown:{color:"#475569",bg:"rgba(71,85,105,0.1)"},
  };
  const c = cfg[level] || cfg.unknown;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{color:c.color,background:c.bg,borderColor:c.color+"40"}}>{level.replace("-"," ")}</span>;
}

function RiskFlag({ flag }: { flag: string }) {
  const crit = ["feoc-exposure-risk","claim-mismatch"].includes(flag);
  return <span className={`text-xs font-medium px-2 py-0.5 rounded border ${crit?"text-red-400 bg-red-400/10 border-red-400/20":"text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{flag.replace(/-/g," ")}</span>;
}

function Skel({ h="h-4", w="w-full", cls="" }: { h?: string; w?: string; cls?: string }) {
  return <div className={`${h} ${w} ${cls} rounded bg-slate-800 animate-pulse`}/>;
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ title, children, ready, skLines=3 }: { title: string; children: React.ReactNode; ready: boolean; skLines?: number }) {
  return (
    <div className="bg-[#0c1829] border border-[#1e3a5f] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1a2d48] bg-[#0a1520]">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{fontFamily:"var(--font-manrope)"}}>{title}</p>
      </div>
      <div className="p-5">
        {ready ? children : <div className="space-y-2.5">{Array.from({length:skLines}).map((_,i)=><Skel key={i} w={i===0?"w-full":i===1?"w-4/5":"w-3/5"}/>)}</div>}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value?: string|null; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#1a2d48] last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-sm text-right leading-snug ${value ? (highlight?"text-white font-medium":"text-slate-300") : "text-slate-600 italic"}`}>{value || "Not disclosed"}</span>
    </div>
  );
}

function BoolBadge({ value, trueLabel="Yes", falseLabel="No" }: { value?: boolean|null; trueLabel?: string; falseLabel?: string }) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-500">Unknown</span>;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${value?"text-red-400 bg-red-400/10":"text-emerald-400 bg-emerald-400/10"}`}>{value ? trueLabel : falseLabel}</span>;
}

// ─── Main results content ─────────────────────────────────────────────────────
function ResultsContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const inputType = searchParams.get("type") || "search";
  const value = searchParams.get("q") || decodeURIComponent(id);

  const [product, setProduct] = useState<ProductData | null>(null);
  const [origin, setOrigin] = useState<OriginData | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [stage, setStage] = useState<string>("loading");
  const [error, setError] = useState<string>("");
  const [panels, setPanels] = useState<Set<string>>(new Set());

  const reveal = (panel: string, ms: number) => setTimeout(() => setPanels(p => new Set([...p, panel])), ms);

  useEffect(() => {
    setStage("loading");
    setError("");
    setProduct(null);
    setOrigin(null);
    setPanels(new Set());
    setFlags([]);
    fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputType, value }),
    }).then(r => r.json()).then(data => {
      if (!data.success) { setError(data.error || "Analysis failed"); setStage("error"); return; }
      setProduct(data.product);
      setOrigin(data.origin || null);
      setFlags(data.flags?.map((f: any) => typeof f === "string" ? f : f.code || f.label) || []);
      setStage("ready");
      reveal("header", 0);
      reveal("gauge", 150);
      reveal("materials", 350);
      reveal("health", 600);
      reveal("origin", 800);
      reveal("lifecycle", 1000);
      reveal("alternatives", 1200);
      reveal("corporate", 1400);
      reveal("evidence", 1600);
    }).catch(() => { setError("Connection error. Check your connection and try again."); setStage("error"); });
  }, [id]);

  const r = (p: string) => panels.has(p);
  const score = product?.petroloadIndex ?? 0;
  const petroInfo = getPetroLabel(score);
  const petroColor = petroInfo.color;

  if (stage === "error") return (
    <main className="min-h-screen bg-[#070b12] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19h20L12 2z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 9v4M12 15v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <p className="text-white font-bold">{error}</p>
        <Link href="/" className="text-cyan-400 text-sm hover:underline">← Try another product</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[#070b12]/95 backdrop-blur border-b border-[#1e3a5f] h-12 flex items-center px-4 gap-3">
        <Link href="/" className="text-cyan-400 font-bold text-sm" style={{fontFamily:"var(--font-manrope)"}}>BioLens</Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 text-sm truncate max-w-xs">{product?.name || value}</span>
        <div className="ml-auto flex items-center gap-2">
          {product && <span className="text-xs font-black px-3 py-1 rounded-full" style={{color:petroColor,background:petroColor+"15",border:`1px solid ${petroColor}30`}}>{score} {petroInfo.label}</span>}
          <Link href="/" className="text-xs text-slate-400 border border-[#1e3a5f] px-3 py-1 rounded-lg hover:text-white transition-colors">New Scan</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* PRODUCT HEADER */}
        <div className="bg-[#0c1829] border border-[#1e3a5f] rounded-2xl p-5">
          {r("header") && product ? (
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#0a1520] border border-[#1a2d48] flex items-center justify-center text-2xl shrink-0">📦</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">{product.brand || product.corporate?.brand || "Unknown Brand"}</p>
                    <h1 className="text-white font-bold text-2xl leading-tight" style={{fontFamily:"var(--font-manrope)"}}>{product.name}</h1>
                    {product.category && <p className="text-slate-500 text-sm mt-0.5">{product.category}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Confidence level={product.confidence}/>
                      {flags.slice(0,3).map(f=><RiskFlag key={f} flag={f}/>)}
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl shrink-0" style={{background:petroColor+"12",border:`1px solid ${petroColor}30`}}>
                    <span className="font-black text-3xl leading-none" style={{color:petroColor,fontFamily:"var(--font-manrope)"}}>{score}</span>
                    <span className="text-xs font-bold mt-0.5 capitalize" style={{color:petroColor}}>{petroInfo.label}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1a2d48]">
                  <button className="px-4 py-2 bg-cyan-400 text-[#070b12] rounded-xl text-sm font-bold hover:bg-cyan-300 transition-colors" style={{fontFamily:"var(--font-manrope)"}}>Replace This Product</button>
                  <button className="px-3 py-2 border border-[#1e3a5f] rounded-xl text-sm text-slate-300 hover:text-white hover:border-slate-400 transition-colors">Compare</button>
                  <button className="px-3 py-2 border border-[#1e3a5f] rounded-xl text-sm text-slate-300 hover:text-white hover:border-slate-400 transition-colors">Share</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-xl bg-slate-800 shrink-0"/>
              <div className="flex-1 space-y-2"><Skel h="h-5" w="w-1/3"/><Skel h="h-8" w="w-2/3"/><Skel h="h-4" w="w-1/4"/></div>
            </div>
          )}
        </div>

        {/* TWO-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* PETROLOAD GAUGE */}
            <Panel title="Petroload Index" ready={r("gauge")} skLines={1}>
              <PetroGauge score={score}/>
              {product?.materialInsight && (
                <div className="mt-4 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-xl">
                  <p className="text-xs font-bold text-cyan-400 mb-1">{product.materialInsight.headline}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{product.materialInsight.body}</p>
                </div>
              )}
            </Panel>

            {/* MATERIAL INTELLIGENCE */}
            <Panel title="Material Intelligence" ready={r("materials")} skLines={4}>
              {product?.materials && product.materials.length > 0 ? (
                <div className="space-y-3">
                  {/* Composition bar */}
                  {product.materials.some(m=>m.percentage) && (
                    <div className="h-3 rounded-full overflow-hidden flex gap-px mb-4">
                      {product.materials.filter(m=>m.percentage).map(m=>{
                        const c = m.classification==="bio"?"#10b981":m.classification==="bridge"?"#f59e0b":m.classification==="synthetic"?"#f97316":"#475569";
                        return <div key={m.name} className="h-full" style={{width:`${m.percentage}%`,background:c}} title={`${m.name}: ${m.percentage}%`}/>;
                      })}
                    </div>
                  )}
                  {product.materials.map((mat, i) => {
                    const c = mat.classification==="bio"?"#10b981":mat.classification==="bridge"?"#f59e0b":mat.classification==="synthetic"?"#f97316":"#475569";
                    return (
                      <div key={i} className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div><p className="text-sm font-semibold text-white" style={{fontFamily:"var(--font-manrope)"}}>{mat.name}</p>{mat.notes&&<p className="text-xs text-slate-500 mt-0.5">{mat.notes}</p>}</div>
                          <div className="flex gap-1.5 shrink-0">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{color:c,background:c+"15",border:`1px solid ${c}30`}}>{mat.classification}</span>
                            <Confidence level={mat.confidence}/>
                          </div>
                        </div>
                        {mat.percentage!==undefined&&<div><div className="flex justify-between text-xs text-slate-500 mb-1"><span>Composition</span><span style={{color:c}}>{mat.percentage}%</span></div><div className="h-1.5 bg-[#1a2d48] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${mat.percentage}%`,background:c}}/></div></div>}
                        {mat.healthScore!==undefined&&<div className="flex items-center gap-2 text-xs text-slate-500"><span>Health score</span><span className="font-semibold" style={{color:mat.healthScore>70?"#10b981":mat.healthScore>40?"#f59e0b":"#ef4444"}}>{mat.healthScore}/100</span></div>}
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-slate-500 text-sm">Material composition data expanding for this product class.</p>}
            </Panel>

            {/* ALTERNATIVES */}
            <Panel title="Better Alternatives" ready={r("alternatives")} skLines={3}>
              {product?.alternatives && product.alternatives.length > 0 ? (
                <div className="space-y-3">
                  {product.alternatives.map((alt,i)=>(
                    <div key={i} className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl hover:border-emerald-400/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div><p className="text-sm font-semibold text-white" style={{fontFamily:"var(--font-manrope)"}}>{alt.name}</p>{alt.material&&<p className="text-xs text-slate-500">{alt.material}</p>}</div>
                        <Confidence level={alt.confidence}/>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center"><p className="text-xs text-slate-500">Petroload ↓</p><p className="text-sm font-bold text-emerald-400">-{alt.petroloadImprovement}</p></div>
                        {alt.microplasticReduction&&<div className="text-center"><p className="text-xs text-slate-500">Microplastic</p><p className="text-sm font-bold text-emerald-400">-{alt.microplasticReduction}%</p></div>}
                        {alt.lifecycleImprovement&&<div className="text-center"><p className="text-xs text-slate-500">Lifecycle ↑</p><p className="text-sm font-bold text-emerald-400">+{alt.lifecycleImprovement}</p></div>}
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#1a2d48]">
                        <button className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Replace This Product →</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-500 text-sm">No vetted alternatives indexed for this product class yet.</p>}
            </Panel>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* HEALTH EFFECTS */}
            <Panel title="Health Effects & Chemical Exposure" ready={r("health")} skLines={6}>
              {product?.healthEffects ? (() => {
                const h = product.healthEffects;
                const hColors: Record<string,string> = {low:"#10b981",moderate:"#f59e0b",high:"#ef4444",unknown:"#475569"};
                const hc = hColors[h.hazardSignal || "unknown"] || "#475569";
                return (
                  <div className="space-y-4">
                    {/* Hazard signal */}
                    <div className="p-3 rounded-xl border" style={{borderColor:hc+"30",background:hc+"08"}}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{background:hc+"15"}}>{h.hazardSignal==="high"?"⚠️":h.hazardSignal==="moderate"?"⚡":"✓"}</div>
                        <div><p className="font-bold text-sm capitalize" style={{color:hc,fontFamily:"var(--font-manrope)"}}>{h.hazardSignal || "Unknown"} Hazard Signal</p>{h.notes&&<p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}</div>
                        <div className="ml-auto"><Confidence level={h.confidence}/></div>
                      </div>
                    </div>

                    {/* Chemical / toxicity flags */}
                    {h.chemicalFlags && h.chemicalFlags.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chemical Flags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {h.chemicalFlags.map((f,i)=><span key={i} className="text-xs px-2 py-0.5 rounded border text-red-400 bg-red-400/10 border-red-400/20">{f}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Risk indicators */}
                    <div className="space-y-0">
                      {[
                        {label:"Endocrine Disruption",value:h.endocrineDisruption,trueLabel:"Flagged",falseLabel:"Not detected"},
                        {label:"Carcinogenicity",value:h.carcinogenicity,trueLabel:"Flagged",falseLabel:"Not detected"},
                        {label:"Leachate / Chemical Risk",value:h.leachateRisk,trueLabel:"Risk present",falseLabel:"Not detected"},
                      ].map(({label,value,trueLabel,falseLabel})=>(
                        <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#1a2d48] last:border-0">
                          <span className="text-sm text-slate-300">{label}</span>
                          <BoolBadge value={value} trueLabel={trueLabel} falseLabel={falseLabel}/>
                        </div>
                      ))}
                    </div>

                    {/* Exposure pathways */}
                    {h.exposurePathways && h.exposurePathways.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exposure Pathways</p>
                        <div className="grid grid-cols-2 gap-2">
                          {h.exposurePathways.map((ep,i)=>{
                            const rc = ep.risk==="high"?"#ef4444":ep.risk==="moderate"?"#f59e0b":"#10b981";
                            return (
                              <div key={i} className="p-2.5 bg-[#0a1520] border border-[#1a2d48] rounded-lg">
                                <p className="text-xs font-semibold text-slate-300 capitalize">{ep.type}</p>
                                <p className="text-xs font-bold capitalize mt-0.5" style={{color:rc}}>{ep.risk} risk</p>
                                {ep.notes&&<p className="text-xs text-slate-500 mt-0.5">{ep.notes}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!h.evidenceAvailable && <p className="text-xs text-slate-500 border border-[#1a2d48] rounded-lg p-3">Toxicity coverage for this material class is expanding. Data updates as peer-reviewed evidence is indexed.</p>}
                  </div>
                );
              })() : <p className="text-slate-500 text-sm">Health effects data is expanding for this product category.</p>}
            </Panel>

            {/* ORIGIN INTELLIGENCE */}
            <Panel title="Origin Intelligence" ready={r("origin")} skLines={5}>
              {origin ? (
                <div className="space-y-3">
                  {origin.flags && origin.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[#1a2d48]">
                      {origin.flags.map(f=><RiskFlag key={f} flag={f}/>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between pb-2 border-b border-[#1a2d48]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disclosure</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${origin.disclosureLevel==="full"?"text-emerald-400 bg-emerald-400/10":origin.disclosureLevel==="partial"?"text-amber-400 bg-amber-400/10":"text-red-400 bg-red-400/10"}`}>{origin.disclosureLevel || "unknown"}</span>
                  </div>
                  <Row label="Made In" value={origin.madeIn} highlight/>
                  <Row label="Ships From" value={origin.shipsFrom}/>
                  <Row label="Sold By" value={origin.soldBy}/>
                  <Row label="Manufacturer" value={origin.manufacturer}/>
                  {origin.importer&&<Row label="Importer" value={origin.importer}/>}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs text-slate-600">Confidence</span>
                    <Confidence level={origin.confidence}/>
                  </div>
                  {origin.flags?.includes("feoc-exposure-risk")&&<div className="p-3 rounded-xl bg-red-400/5 border border-red-400/20 text-xs text-slate-300 leading-relaxed"><span className="text-red-400 font-bold">FEOC Exposure:</span> This product may involve entities identified as Foreign Entities of Concern under U.S. supply chain security guidelines.</div>}
                </div>
              ) : <p className="text-slate-500 text-sm">Origin data not available for this product.</p>}
            </Panel>

            {/* LIFECYCLE */}
            <Panel title="Lifecycle Intelligence" ready={r("lifecycle")} skLines={5}>
              {product?.lifecycle ? (() => {
                const lc = product.lifecycle;
                const sc = lc.score;
                const scolor = sc>=70?"#10b981":sc>=40?"#f59e0b":"#ef4444";
                const mpColors: Record<string,string> = {none:"#10b981",low:"#10b981",moderate:"#f59e0b",high:"#ef4444",unknown:"#475569"};
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-400">Lifecycle Score</span><span className="font-black text-xl" style={{color:scolor,fontFamily:"var(--font-manrope)"}}>{sc}</span></div>
                      <div className="h-2 bg-[#1a2d48] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${sc}%`,background:scolor}}/></div>
                    </div>
                    <div className="space-y-0">
                      {[{label:"Recyclable",value:lc.recyclable},{label:"Compostable",value:lc.compostable}].map(({label,value})=>(
                        <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#1a2d48] last:border-0">
                          <span className="text-sm text-slate-300">{label}</span>
                          <BoolBadge value={value}/>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-2.5 border-b border-[#1a2d48]">
                        <span className="text-sm text-slate-300">Microplastic Risk</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{color:mpColors[lc.microplasticRisk||"unknown"],background:(mpColors[lc.microplasticRisk||"unknown"])+"15"}}>{lc.microplasticRisk||"Unknown"}</span>
                      </div>
                      {lc.landfillPersistenceYears!==undefined&&<div className="flex items-center justify-between py-2.5 border-b border-[#1a2d48]"><span className="text-sm text-slate-300">Landfill Persistence</span><span className="text-sm font-semibold text-amber-400">~{lc.landfillPersistenceYears.toLocaleString()} years</span></div>}
                      {lc.endOfLifePathway&&<div className="flex items-start justify-between gap-4 py-2.5"><span className="text-sm text-slate-300 shrink-0">End-of-Life</span><span className="text-sm text-slate-300 text-right">{lc.endOfLifePathway}</span></div>}
                    </div>
                    <div className="pt-2 flex justify-end"><Confidence level={lc.confidence}/></div>
                  </div>
                );
              })() : <p className="text-slate-500 text-sm">Lifecycle data expanding for this product category.</p>}
            </Panel>

            {/* CORPORATE */}
            <Panel title="Corporate Attribution" ready={r("corporate")} skLines={4}>
              {product?.corporate ? (() => {
                const c = product.corporate;
                return (
                  <div className="space-y-0">
                    <Row label="Brand" value={c.brand} highlight/>
                    <Row label="Brand Owner" value={c.brandOwner}/>
                    <Row label="Manufacturer" value={c.manufacturer}/>
                    <Row label="Distributor" value={c.distributor}/>
                    <Row label="Parent Company" value={c.parentCompany}/>
                    <div className="pt-3 flex justify-end"><Confidence level={c.confidence}/></div>
                  </div>
                );
              })() : <p className="text-slate-500 text-sm">Corporate attribution data not available.</p>}
            </Panel>

            {/* EVIDENCE */}
            <Panel title="Evidence Layer" ready={r("evidence")} skLines={2}>
              {product?.evidence ? (() => {
                const ev = product.evidence;
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">{ev.sources?.length || 0} source{ev.sources?.length !== 1 ? "s" : ""} indexed{ev.lastUpdated ? ` · Updated ${ev.lastUpdated}` : ""}</p>
                    {ev.sources && ev.sources.length > 0 && (
                      <div className="space-y-2">
                        {ev.sources.map((s,i)=>(
                          <div key={i} className="p-2.5 bg-[#0a1520] border border-[#1a2d48] rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-slate-300">{s.title}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${s.type==="regulatory"?"text-emerald-400 bg-emerald-400/10":s.type==="academic"?"text-blue-400 bg-blue-400/10":"text-slate-400 bg-slate-400/10"}`}>{s.type}</span>
                            </div>
                            {s.year&&<p className="text-xs text-slate-600 mt-1">{s.year}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {ev.methodology&&<details className="text-xs"><summary className="text-slate-500 cursor-pointer hover:text-slate-300">Methodology</summary><p className="text-slate-400 mt-2 leading-relaxed">{ev.methodology}</p></details>}
                  </div>
                );
              })() : <p className="text-slate-500 text-sm">Evidence sources loading.</p>}
            </Panel>

          </div>
        </div>

        {/* Mobile spacer */}
        <div className="h-6"/>
      </div>
    </main>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#070b12] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"/>
          <p className="text-slate-400 text-sm">Analyzing materials...</p>
        </div>
      </main>
    }>
      <ResultsContent id={id}/>
    </Suspense>
  );
    }
