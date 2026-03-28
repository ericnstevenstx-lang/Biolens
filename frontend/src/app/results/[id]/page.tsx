"use client";
import { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Material { name: string; classification: "bio"|"bridge"|"synthetic"|"unknown"; percentage?: number; healthScore?: number; confidence?: string; notes?: string; }
interface ExposurePathway { type: string; risk: "low"|"moderate"|"high"; notes?: string; }
interface HealthEffects { hazardSignal?: string; endocrineDisruption?: boolean|null; carcinogenicity?: boolean|null; leachateRisk?: boolean|null; exposurePathways?: ExposurePathway[]; chemicalFlags?: string[]; confidence?: string; evidenceAvailable?: boolean; notes?: string; }
interface LifecycleData { score: number; recyclable?: boolean|null; compostable?: boolean|null; landfillPersistenceYears?: number; microplasticRisk?: string; endOfLifePathway?: string; confidence?: string; }
interface Alternative { id: string; name: string; material?: string; petroloadImprovement: number; microplasticReduction?: number; lifecycleImprovement?: number; confidence?: string; }
interface CorporateData { brand?: string; brandOwner?: string; manufacturer?: string; distributor?: string; parentCompany?: string; confidence?: string; }
interface ImpactDelta { petroloadReduction?: number; microplasticReduction?: number; lifecycleImprovement?: number; estimatedJobsSupported?: number; confidence?: string; available?: boolean; }
interface OriginData { madeIn?: string; shipsFrom?: string; soldBy?: string; manufacturer?: string; importer?: string; disclosureLevel?: string; confidence?: string; flags?: string[]; }
interface CapitalFlowData { tariffDrainPct: number; domesticRetentionPct: number; foreignLeakagePct: number; section301Applies: boolean; feocDisqualified: boolean; uflpaRisk: boolean; babaEligible: boolean; tariffRatePct: number; originCountry: string|null; domesticAlternativeTariffPct: number|null; atPrice?: { price: number; tariffDrain: number; domesticRetention: number; foreignLeakage: number }; confidence: string; }
interface PoliticalActivity { companyName: string; totalContributions: number; republicanPct: number; democratPct: number; otherPct: number; cycle: number; pacName: string; topRecipients: { name: string; party: string; amount: number }[]; confidence: string; }
interface ProductData { id: string; name: string; brand?: string; imageUrl?: string; barcode?: string; category?: string; petroloadIndex: number; petroloadLabel?: string; materials?: Material[]; healthEffects?: HealthEffects; lifecycle?: LifecycleData; alternatives?: Alternative[]; corporate?: CorporateData; evidence?: { sources?: { title: string; type: string; year?: number; url?: string }[]; methodology?: string; lastUpdated?: string }; materialInsight?: { headline: string; body: string }; confidence?: string; impactDelta?: ImpactDelta; capitalFlow?: CapitalFlowData; politicalActivity?: PoliticalActivity; }

// Safe string coercion - handles objects, null, undefined
function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return String(obj.code || obj.label || obj.name || obj.id || JSON.stringify(v));
  }
  return String(v);
}

const PETRO_LABELS = [
  { max:20, label:"bio-based", color:"#10b981" },
  { max:50, label:"bridge", color:"#f59e0b" },
  { max:80, label:"synthetic", color:"#f97316" },
  { max:100, label:"petrochemical", color:"#ef4444" },
];
function getPetroInfo(score: number) { return PETRO_LABELS.find(l => score <= l.max) || PETRO_LABELS[3]; }

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
function PetroGauge({ score }: { score: number }) {
  const info = getPetroInfo(score);
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
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{transition:"stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)",filter:`drop-shadow(0 0 8px ${color}80)`}}/>
        {[{at:20,c:"#10b981"},{at:50,c:"#f59e0b"},{at:80,c:"#f97316"}].map(({at,c})=>{
          const ang = -225 + (at/100)*270; const rad = (ang*Math.PI)/180;
          return <circle key={at} cx={cx + r*Math.cos(rad)} cy={cy + r*Math.sin(rad)} r="5" fill="#070b12" stroke={c} strokeWidth="1.5"/>;
        })}
        <text x="100" y="105" textAnchor="middle" fontSize="38" fontWeight="800" fill={color} fontFamily="var(--font-manrope)" letterSpacing="-1">{score}</text>
        <text x="100" y="130" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="var(--font-manrope)" letterSpacing="2">{info.label.toUpperCase()}</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {PETRO_LABELS.map(l=><div key={l.label} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:l.color}}/><span className="text-slate-500 capitalize">{l.label}</span></div>)}
      </div>
    </div>
  );
}

// ─── Badge components ─────────────────────────────────────────────────────────
function Confidence({ level }: { level?: string }) {
  const s = safeStr(level);
  if (!s) return null;
  const cfg: Record<string, { color: string; bg: string }> = {
    verified:{color:"#10b981",bg:"rgba(16,185,129,0.1)"},
    inferred:{color:"#3b82f6",bg:"rgba(59,130,246,0.1)"},
    estimated:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"},
    "supplier-disclosed":{color:"#06b6d4",bg:"rgba(6,182,212,0.1)"},
    "regulatory-backed":{color:"#10b981",bg:"rgba(16,185,129,0.1)"},
    mixed:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)"},
    limited:{color:"#475569",bg:"rgba(71,85,105,0.1)"},
    unknown:{color:"#475569",bg:"rgba(71,85,105,0.1)"},
  };
  const c = cfg[s.toLowerCase()] || cfg.unknown;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{color:c.color,background:c.bg,borderColor:c.color+"40"}}>{s.replace(/-/g," ")}</span>;
}

function RiskFlag({ flag }: { flag: unknown }) {
  const s = safeStr(flag);
  if (!s) return null;
  const crit = ["feoc-exposure-risk","claim-mismatch","feoc exposure risk","claim mismatch"].some(k => s.toLowerCase().includes(k));
  const label = s.replace(/-/g," ").replace(/_/g," ");
  return <span className={`text-xs font-medium px-2 py-0.5 rounded border ${crit?"text-red-400 bg-red-400/10 border-red-400/20":"text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{label}</span>;
}

function Skel({ h="h-4", w="w-full" }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} rounded bg-slate-800 animate-pulse`}/>;
}

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
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#1a2d48] last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-sm text-right leading-snug ${highlight ? "text-white font-medium" : "text-slate-300"}`}>{value}</span>
    </div>
  );
}

function BoolBadge({ value, trueLabel="Yes", falseLabel="No" }: { value?: boolean|null; trueLabel?: string; falseLabel?: string }) {
  if (value === null || value === undefined) return null;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${value?"text-red-400 bg-red-400/10":"text-emerald-400 bg-emerald-400/10"}`}>{value ? trueLabel : falseLabel}</span>;
}

// ─── Verdict generator ────────────────────────────────────────────────────────
function buildVerdict(product: ProductData): string {
  const score = product.petroloadIndex;
  const h = product.healthEffects;
  const cf = product.capitalFlow;

  if (score > 70) {
    let msg = `This product is ${score}% petrochemical-dependent.`;
    if (h?.hazardSignal === "high") {
      const flagNames = h.chemicalFlags?.slice(0, 2).join(" and ") || "health concerns";
      msg += ` Materials flagged for ${flagNames}.`;
    }
    if (cf) {
      msg += ` ${cf.tariffRatePct}% tariff exposure on imported materials.`;
    }
    return msg;
  }

  if (score >= 30) {
    let msg = `At ${score}% petrochemical content, this product uses a mix of synthetic and transitional materials.`;
    if (h?.hazardSignal === "moderate") {
      msg += " Some chemical exposure pathways flagged for review.";
    }
    if (cf && cf.tariffRatePct > 0) {
      msg += ` ${cf.tariffRatePct}% tariff rate applies to imported material inputs.`;
    }
    return msg;
  }

  let msg = `This product scores ${score}% on the petroload index, indicating predominantly bio-based or low-synthetic composition.`;
  if (h?.hazardSignal === "low") {
    msg += " No significant chemical hazard signals detected.";
  }
  return msg;
}

// ─── Main results content ─────────────────────────────────────────────────────
function ResultsContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const inputType = searchParams.get("type") || "search";
  const value = searchParams.get("value") || searchParams.get("q") || decodeURIComponent(id);

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
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setError(data.error || "Analysis failed"); setStage("error"); return; }

        // Safely normalize product data
        const p = data.product || {};
        // Ensure petroloadIndex is a number
        if (typeof p.petroloadIndex !== "number") p.petroloadIndex = 0;

        setProduct(p);
        setOrigin(data.origin || null);

        // Safe flag normalization - handles strings, objects, arrays
        const rawFlags = data.flags || [];
        const normalizedFlags: string[] = Array.isArray(rawFlags)
          ? rawFlags.map((f: unknown) => safeStr(f)).filter(Boolean)
          : [];
        setFlags(normalizedFlags);

        setStage("ready");
        reveal("header", 0);
        reveal("verdict", 100);
        reveal("gauge", 150);
        reveal("materials", 350);
        reveal("health", 600);
        reveal("origin", 800);
        reveal("lifecycle", 1000);
        reveal("alternatives", 1200);
        reveal("impactDelta", 1300);
        reveal("corporate", 1450);
        reveal("capitalFlow", 1600);
        reveal("politicalActivity", 1700);
        reveal("evidence", 1800);
        reveal("whereToBuy", 2000);
      })
      .catch(err => {
        console.error("BioLens intake error:", err);
        setError("Connection error. Check your connection and try again.");
        setStage("error");
      });
  }, [id]);

  const r = (p: string) => panels.has(p);
  const score = product?.petroloadIndex ?? 0;
  const petroInfo = getPetroInfo(score);
  const petroColor = petroInfo.color;

  if (stage === "loading") return (
    <main className="min-h-screen bg-[#070b12] flex items-center justify-center">
      <div className="text-center space-y-5">
        <img src="/assets/Biolens Splash screen.png" alt="BioLens analyzing" width={200} height={300} className="mx-auto animate-pulse" style={{filter:"drop-shadow(0 0 20px rgba(6,182,212,0.3))"}}/>
        <div className="space-y-2">
          <p className="text-slate-300 text-sm font-semibold" style={{fontFamily:"var(--font-manrope)"}}>Analyzing materials...</p>
          <p className="text-slate-600 text-xs">Resolving origin · Scoring petroload · Ranking alternatives</p>
        </div>
      </div>
    </main>
  );

  if (stage === "error") return (
    <main className="min-h-screen bg-[#070b12] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 19h20L12 2z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 9v4M12 15v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <p className="text-white font-bold">{error}</p>
        <Link href="/" className="inline-block text-cyan-400 text-sm border border-cyan-400/30 px-4 py-2 rounded-xl hover:bg-cyan-400/10 transition-colors">← Try another product</Link>
      </div>
    </main>
  );

  const hasHealthData = !!(product?.healthEffects);
  const hasCapitalFlow = !!(product?.capitalFlow);
  const hasLifecycle = !!(product?.lifecycle && (product.lifecycle.score > 0 || product.lifecycle.recyclable !== null || product.lifecycle.compostable !== null));
  const hasOrigin = !!(origin);

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      <Nav breadcrumb={product?.name || value} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* ── SECTION 1: HEADER ─────────────────────────────────────────── */}
        <div className="bg-[#0c1829] border border-[#1e3a5f] rounded-2xl p-5">
          {r("header") && product ? (
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-0.5 font-semibold truncate">{safeStr(product.brand) || safeStr(product.corporate?.brand)}</p>
                <h1 className="text-white font-bold text-xl sm:text-2xl leading-tight" style={{fontFamily:"var(--font-manrope)"}}>{safeStr(product.name)}</h1>
                {product.category && <p className="text-slate-500 text-sm mt-0.5">{safeStr(product.category)}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Confidence level={safeStr(product.confidence)}/>
                  {flags.slice(0,3).map((f,i) => <RiskFlag key={i} flag={f}/>)}
                </div>
              </div>
              <div className="flex flex-col items-center px-5 py-3 rounded-2xl flex-shrink-0" style={{background:petroColor+"12",border:`1px solid ${petroColor}30`}}>
                <span className="font-black text-4xl leading-none" style={{color:petroColor,fontFamily:"var(--font-manrope)"}}>{score}</span>
                <span className="text-xs font-bold mt-1 capitalize" style={{color:petroColor}}>{petroInfo.label}</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 animate-pulse">
              <div className="flex-1 space-y-2"><Skel h="h-4" w="w-1/4"/><Skel h="h-7" w="w-2/3"/><Skel h="h-4" w="w-1/5"/></div>
              <div className="w-20 h-20 rounded-2xl bg-slate-800 flex-shrink-0"/>
            </div>
          )}
        </div>

        {/* ── SECTION 2: VERDICT PARAGRAPH ──────────────────────────────── */}
        {r("verdict") && product && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: score > 70
                ? "rgba(239,68,68,0.06)"
                : score >= 30
                  ? "rgba(245,158,11,0.06)"
                  : "rgba(16,185,129,0.06)",
              border: `1px solid ${petroColor}25`,
            }}
          >
            <p className="text-base sm:text-lg leading-relaxed text-slate-200" style={{fontFamily:"var(--font-manrope)"}}>
              {buildVerdict(product)}
            </p>
          </div>
        )}

        {/* ── SECTION 3: TWO-COLUMN — Health Alert + Tariff Impact ─────── */}
        {(hasHealthData || hasCapitalFlow) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Health Effects */}
            {hasHealthData && (
              <Panel title="Health Effects" ready={r("health")} skLines={6}>
                {(() => {
                  const h = product!.healthEffects!;
                  const signal = safeStr(h.hazardSignal) || "unknown";
                  const hColors: Record<string,string> = {low:"#10b981",moderate:"#f59e0b",high:"#ef4444",unknown:"#475569"};
                  const hc = hColors[signal.toLowerCase()] || "#475569";
                  const isHigh = signal.toLowerCase() === "high";
                  return (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl border" style={{borderColor:hc+"30",background:isHigh ? "rgba(239,68,68,0.1)" : hc+"08"}}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{background:hc+"15"}}>
                            {signal==="high"?"⚠️":signal==="moderate"?"⚡":"✓"}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm capitalize" style={{color:hc,fontFamily:"var(--font-manrope)"}}>{signal} Hazard Signal</p>
                            {h.notes && <p className="text-xs text-slate-400 mt-0.5">{safeStr(h.notes)}</p>}
                          </div>
                          <div className="flex-shrink-0"><Confidence level={safeStr(h.confidence)}/></div>
                        </div>
                      </div>

                      {(() => {
                        const boolRows = [
                          {label:"Endocrine Disruption", value:h.endocrineDisruption, trueLabel:"Flagged", falseLabel:"Not detected"},
                          {label:"Carcinogenicity", value:h.carcinogenicity, trueLabel:"Flagged", falseLabel:"Not detected"},
                          {label:"Leachate / Chemical Risk", value:h.leachateRisk, trueLabel:"Risk present", falseLabel:"Not detected"},
                        ].filter(item => item.value !== null && item.value !== undefined);
                        const hasPathways = h.exposurePathways && h.exposurePathways.length > 0;
                        const hasFlags = h.chemicalFlags && h.chemicalFlags.length > 0;
                        const hasAnyDetail = boolRows.length > 0 || hasPathways || hasFlags;

                        if (!hasAnyDetail) {
                          return (
                            <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl">
                              <p className="text-xs text-slate-400 leading-relaxed">
                                Detailed toxicity screening (endocrine disruption, carcinogenicity, exposure pathways) is not yet available for this product. BioLens is actively building chemical risk data. Check back soon.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <>
                            {boolRows.length > 0 && (
                              <div className="space-y-0">
                                {boolRows.map(({label,value,trueLabel,falseLabel}) => (
                                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#1a2d48] last:border-0">
                                    <span className="text-sm text-slate-300">{label}</span>
                                    <BoolBadge value={value} trueLabel={trueLabel} falseLabel={falseLabel}/>
                                  </div>
                                ))}
                              </div>
                            )}

                            {hasPathways && (
                              <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exposure Pathways</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {h.exposurePathways!.map((ep, i) => {
                                    const rc = ep.risk==="high"?"#ef4444":ep.risk==="moderate"?"#f59e0b":"#10b981";
                                    return (
                                      <div key={i} className="p-2.5 bg-[#0a1520] border border-[#1a2d48] rounded-lg">
                                        <p className="text-xs font-semibold text-slate-300 capitalize">{safeStr(ep.type)}</p>
                                        <p className="text-xs font-bold capitalize mt-0.5" style={{color:rc}}>{safeStr(ep.risk)} risk</p>
                                        {ep.notes && <p className="text-xs text-slate-500 mt-0.5">{safeStr(ep.notes)}</p>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {hasFlags && (
                              <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chemical Flags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {h.chemicalFlags!.map((f, i) => <span key={i} className="text-xs px-2 py-0.5 rounded border text-red-400 bg-red-400/10 border-red-400/20">{safeStr(f)}</span>)}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}
              </Panel>
            )}

            {/* RIGHT: Capital Flow + Tariff Impact */}
            {hasCapitalFlow && (
              <Panel title="Capital Flow + Tariff Impact" ready={r("capitalFlow")} skLines={5}>
                {(() => {
                  const cf = product!.capitalFlow!;
                  return (
                    <div className="space-y-4">
                      {/* Capital flow bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Domestic {cf.domesticRetentionPct.toFixed(1)}%</span>
                          <span>Foreign {cf.foreignLeakagePct.toFixed(1)}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-[#1a2d48] overflow-hidden flex">
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{width:`${cf.domesticRetentionPct}%`}}/>
                          <div className="h-full bg-red-500 transition-all duration-700" style={{width:`${cf.foreignLeakagePct}%`}}/>
                        </div>
                      </div>

                      {/* Dollar breakdown if price available */}
                      {cf.atPrice && (
                        <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-lg">
                          <p className="text-xs text-slate-400 mb-2">At ${cf.atPrice.price.toFixed(2)}</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-bold text-red-400">${cf.atPrice.tariffDrain.toFixed(2)}</p>
                              <p className="text-[10px] text-slate-500">Tariff Drain</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-emerald-400">${cf.atPrice.domesticRetention.toFixed(2)}</p>
                              <p className="text-[10px] text-slate-500">Domestic Retention</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-amber-400">${cf.atPrice.foreignLeakage.toFixed(2)}</p>
                              <p className="text-[10px] text-slate-500">Foreign Leakage</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-0">
                        <Row label="Tariff Rate" value={`${cf.tariffRatePct.toFixed(1)}%`} highlight/>
                        <Row label="Origin Country" value={cf.originCountry}/>
                        {cf.domesticAlternativeTariffPct !== null && (
                          <Row label="Domestic Alt. Tariff" value={`${cf.domesticAlternativeTariffPct.toFixed(1)}%`}/>
                        )}
                      </div>

                      {/* Risk flags */}
                      {(cf.section301Applies || cf.feocDisqualified || cf.uflpaRisk || cf.babaEligible) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cf.section301Applies && <RiskFlag flag="Section 301"/>}
                          {cf.feocDisqualified && <RiskFlag flag="FEOC Exposure Risk"/>}
                          {cf.uflpaRisk && <RiskFlag flag="UFLPA Risk"/>}
                          {cf.babaEligible && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">BABA Eligible</span>}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end"><Confidence level={safeStr(cf.confidence)}/></div>
                    </div>
                  );
                })()}
              </Panel>
            )}
          </div>
        )}

        {/* ── CORPORATE POLITICAL ACTIVITY ──────────────────────────────── */}
        {product?.politicalActivity && (
          <Panel title="Corporate Political Activity" ready={r("politicalActivity")} skLines={4}>
            {(() => {
              const pa = product.politicalActivity;
              return (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white" style={{fontFamily:"var(--font-manrope)"}}>{pa.companyName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pa.pacName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-white" style={{fontFamily:"var(--font-manrope)"}}>${pa.totalContributions.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">{pa.cycle} cycle</p>
                    </div>
                  </div>

                  {/* Party split bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Republican {pa.republicanPct}%</span>
                      <span>Democrat {pa.democratPct}%</span>
                      {pa.otherPct > 0 && <span>Other {pa.otherPct}%</span>}
                    </div>
                    <div className="h-3 rounded-full bg-[#1a2d48] overflow-hidden flex">
                      <div className="h-full bg-red-500 transition-all duration-700" style={{width:`${pa.republicanPct}%`}}/>
                      <div className="h-full bg-blue-500 transition-all duration-700" style={{width:`${pa.democratPct}%`}}/>
                      {pa.otherPct > 0 && <div className="h-full bg-slate-500 transition-all duration-700" style={{width:`${pa.otherPct}%`}}/>}
                    </div>
                  </div>

                  {/* Top recipients */}
                  {pa.topRecipients.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Top Recipients</p>
                      <div className="space-y-0">
                        {pa.topRecipients.map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a2d48] last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.party === "REP" ? "bg-red-500" : r.party === "DEM" ? "bg-blue-500" : "bg-slate-500"}`}/>
                              <span className="text-xs text-slate-300">{r.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">${r.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">Source: FEC.gov public filings</span>
                    <Confidence level={pa.confidence}/>
                  </div>
                </div>
              );
            })()}
          </Panel>
        )}

        {/* ── SECTION 4: PETROLOAD GAUGE + MATERIALS (horizontal) ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gauge */}
          <Panel title="Petroload Index" ready={r("gauge")} skLines={1}>
            <PetroGauge score={score}/>
            {product?.materialInsight && (
              <div className="mt-4 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-xl">
                <p className="text-xs font-bold text-cyan-400 mb-1">{safeStr(product.materialInsight.headline)}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{safeStr(product.materialInsight.body)}</p>
              </div>
            )}
          </Panel>

          {/* Materials */}
          {product?.materials && product.materials.length > 0 && (
            <Panel title="Material Intelligence" ready={r("materials")} skLines={4}>
              <div className="space-y-3">
                {product.materials.some(m => m.percentage !== undefined) && (
                  <div className="h-3 rounded-full overflow-hidden flex gap-px mb-4">
                    {product.materials.filter(m => m.percentage !== undefined).map((m, i) => {
                      const c = m.classification==="bio"?"#10b981":m.classification==="bridge"?"#f59e0b":m.classification==="synthetic"?"#f97316":"#475569";
                      return <div key={i} className="h-full" style={{width:`${m.percentage}%`,background:c}} title={`${m.name}: ${m.percentage}%`}/>;
                    })}
                  </div>
                )}
                {product.materials.map((mat, i) => {
                  const c = mat.classification==="bio"?"#10b981":mat.classification==="bridge"?"#f59e0b":mat.classification==="synthetic"?"#f97316":"#475569";
                  return (
                    <div key={i} className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <a href={`/materials/${encodeURIComponent(safeStr(mat.name))}`} className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors" style={{fontFamily:"var(--font-manrope)"}}>{safeStr(mat.name)} →</a>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0" style={{color:c,background:c+"15",border:`1px solid ${c}30`}}>{safeStr(mat.classification)}</span>
                      </div>
                      {mat.healthScore !== undefined && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
                          <span>Health score</span>
                          <span className="font-semibold" style={{color:mat.healthScore>70?"#10b981":mat.healthScore>40?"#f59e0b":"#ef4444"}}>{mat.healthScore}/100</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>

        {/* ── SECTION 5: TWO-COLUMN — Lifecycle + Origin Intelligence ──── */}
        {(hasLifecycle || hasOrigin) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lifecycle */}
            {hasLifecycle && (
              <Panel title="Lifecycle Intelligence" ready={r("lifecycle")} skLines={5}>
                {(() => {
                  const lc = product!.lifecycle!;
                  const sc = lc.score ?? 0;
                  const scolor = sc>=70?"#10b981":sc>=40?"#f59e0b":"#ef4444";
                  const mpColors: Record<string,string> = {none:"#10b981",low:"#10b981",moderate:"#f59e0b",high:"#ef4444",unknown:"#475569"};
                  const mp = safeStr(lc.microplasticRisk).toLowerCase() || "unknown";
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-slate-400">Lifecycle Score</span>
                          <span className="font-black text-xl" style={{color:scolor,fontFamily:"var(--font-manrope)"}}>{sc}</span>
                        </div>
                        <div className="h-2 bg-[#1a2d48] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{width:`${sc}%`,background:scolor}}/>
                        </div>
                      </div>
                      <div className="space-y-0">
                        {[{label:"Recyclable",value:lc.recyclable},{label:"Compostable",value:lc.compostable}]
                          .filter(item => item.value !== null && item.value !== undefined)
                          .map(({label,value}) => (
                            <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#1a2d48] last:border-0">
                              <span className="text-sm text-slate-300">{label}</span>
                              <BoolBadge value={value}/>
                            </div>
                          ))}
                        {mp !== "unknown" && (
                          <div className="flex items-center justify-between py-2.5 border-b border-[#1a2d48]">
                            <span className="text-sm text-slate-300">Microplastic Risk</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{color:mpColors[mp]||"#475569",background:(mpColors[mp]||"#475569")+"15"}}>{mp}</span>
                          </div>
                        )}
                        {lc.landfillPersistenceYears !== undefined && (
                          <div className="flex items-center justify-between py-2.5 border-b border-[#1a2d48]">
                            <span className="text-sm text-slate-300">Landfill Persistence</span>
                            <span className="text-sm font-semibold text-amber-400">~{lc.landfillPersistenceYears.toLocaleString()} years</span>
                          </div>
                        )}
                        {lc.endOfLifePathway && (
                          <div className="flex items-start justify-between gap-4 py-2.5">
                            <span className="text-sm text-slate-300 flex-shrink-0">End-of-Life</span>
                            <span className="text-sm text-slate-300 text-right">{safeStr(lc.endOfLifePathway)}</span>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 flex justify-end"><Confidence level={safeStr(lc.confidence)}/></div>
                    </div>
                  );
                })()}
              </Panel>
            )}

            {/* Origin Intelligence */}
            {hasOrigin && (
              <Panel title="Origin Intelligence" ready={r("origin")} skLines={5}>
                {(() => {
                  const o = origin!;
                  return (
                    <div className="space-y-3">
                      {o.flags && o.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-[#1a2d48]">
                          {o.flags.map((f, i) => <RiskFlag key={i} flag={f}/>)}
                        </div>
                      )}
                      {o.disclosureLevel && (
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2d48]">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disclosure Level</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                            safeStr(o.disclosureLevel)==="full"?"text-emerald-400 bg-emerald-400/10":
                            safeStr(o.disclosureLevel)==="partial"?"text-amber-400 bg-amber-400/10":
                            "text-red-400 bg-red-400/10"
                          }`}>{safeStr(o.disclosureLevel)}</span>
                        </div>
                      )}
                      <Row label="Made In" value={safeStr(o.madeIn) || null} highlight/>
                      <Row label="Ships From" value={safeStr(o.shipsFrom) || null}/>
                      <Row label="Sold By" value={safeStr(o.soldBy) || null}/>
                      <Row label="Manufacturer" value={safeStr(o.manufacturer) || null}/>
                      {o.importer && <Row label="Importer" value={safeStr(o.importer)}/>}
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-xs text-slate-600">Confidence</span>
                        <Confidence level={safeStr(o.confidence)}/>
                      </div>
                      {o.flags?.some(f => safeStr(f).toLowerCase().includes("feoc")) && (
                        <div className="p-3 rounded-xl bg-red-400/5 border border-red-400/20 text-xs text-slate-300 leading-relaxed">
                          <span className="text-red-400 font-bold">FEOC Exposure: </span>
                          This product may involve entities identified as Foreign Entities of Concern under U.S. supply chain security guidelines.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Panel>
            )}
          </div>
        )}

        {/* ── SECTION 6: BETTER ALTERNATIVES / WHERE TO BUY ────────────── */}
        {product?.alternatives && product.alternatives.length > 0 && (
          <div className="space-y-4">
            <Panel title="Better Alternatives" ready={r("alternatives")} skLines={3}>
              <div className="space-y-3">
                {/* FiberFoundry CTA */}
                <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-emerald-400" style={{fontFamily:"var(--font-manrope)"}}>Shop bio-based alternatives on FiberFoundry</p>
                    <p className="text-xs text-slate-400 mt-0.5">Verified suppliers. Petroload-scored. Ready to ship.</p>
                  </div>
                  <a href="https://fiberfoundry.co" target="_blank" rel="noopener" className="px-4 py-2 bg-emerald-400 text-[#070b12] rounded-xl text-sm font-bold hover:bg-emerald-300 transition-colors flex-shrink-0 whitespace-nowrap" style={{fontFamily:"var(--font-manrope)"}}>Visit FiberFoundry</a>
                </div>

                {/* Alternative cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {product.alternatives.map((alt, i) => (
                    <div key={alt.id || i} className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl hover:border-emerald-400/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white" style={{fontFamily:"var(--font-manrope)"}}>{safeStr(alt.name)}</p>
                          {alt.material && <p className="text-xs text-slate-500">{safeStr(alt.material)}</p>}
                        </div>
                        <Confidence level={safeStr(alt.confidence)}/>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs mt-2">
                        {alt.petroloadImprovement > 0 && (
                          <span className="text-emerald-400 font-semibold">-{alt.petroloadImprovement} pts petroload</span>
                        )}
                        {alt.microplasticReduction !== undefined && alt.microplasticReduction > 0 && (
                          <span className="text-cyan-400 font-semibold">-{alt.microplasticReduction}% microplastic</span>
                        )}
                        {alt.lifecycleImprovement !== undefined && alt.lifecycleImprovement > 0 && (
                          <span className="text-blue-400 font-semibold">+{alt.lifecycleImprovement} lifecycle</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Impact Delta — switching benefit */}
            {product.impactDelta?.available && (
              <div className="bg-[#0c1829] border border-[#1e3a5f] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a2d48] bg-[#0a1520] flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{fontFamily:"var(--font-manrope)"}}>Impact Delta</p>
                  <span className="text-xs text-slate-600">Modeled benefit of switching away from this product</span>
                </div>
                <div className="p-5">
                  {r("impactDelta") ? (() => {
                    const d = product.impactDelta!;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {d.petroloadReduction !== undefined && (
                          <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl text-center">
                            <p className="text-xs text-slate-500 mb-1">Petroload Reduction</p>
                            <p className="text-xl font-black text-emerald-400" style={{fontFamily:"var(--font-manrope)"}}>-{d.petroloadReduction} pts</p>
                          </div>
                        )}
                        {d.microplasticReduction !== undefined && (
                          <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl text-center">
                            <p className="text-xs text-slate-500 mb-1">Microplastic Reduction</p>
                            <p className="text-xl font-black text-emerald-400" style={{fontFamily:"var(--font-manrope)"}}>-{d.microplasticReduction}%</p>
                          </div>
                        )}
                        {d.lifecycleImprovement !== undefined && (
                          <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl text-center">
                            <p className="text-xs text-slate-500 mb-1">Lifecycle Improvement</p>
                            <p className="text-xl font-black text-emerald-400" style={{fontFamily:"var(--font-manrope)"}}>+{d.lifecycleImprovement} pts</p>
                          </div>
                        )}
                        {d.estimatedJobsSupported !== undefined && (
                          <div className="p-3 bg-[#0a1520] border border-[#1a2d48] rounded-xl text-center">
                            <p className="text-xs text-slate-500 mb-1">Est. Domestic Jobs</p>
                            <p className="text-xl font-black text-cyan-400" style={{fontFamily:"var(--font-manrope)"}}>{d.estimatedJobsSupported.toLocaleString()}</p>
                          </div>
                        )}
                        {d.confidence && (
                          <div className="col-span-2 sm:col-span-4 flex justify-end pt-1">
                            <Confidence level={safeStr(d.confidence)}/>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="space-y-2.5 animate-pulse">
                      <div className="h-4 w-full rounded bg-slate-800"/>
                      <div className="h-4 w-4/5 rounded bg-slate-800"/>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 7: EVIDENCE (collapsed by default) ───────────────── */}
        {product?.evidence && (
          <details className="bg-[#0c1829] border border-[#1e3a5f] rounded-2xl overflow-hidden group">
            <summary className="px-5 py-3 bg-[#0a1520] cursor-pointer hover:bg-[#0c1a2a] transition-colors flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{fontFamily:"var(--font-manrope)"}}>Evidence Layer</p>
              <span className="text-xs text-slate-600">
                {product.evidence.sources?.length || 0} source{product.evidence.sources?.length !== 1 ? "s" : ""}
                {product.evidence.lastUpdated ? ` · Updated ${product.evidence.lastUpdated}` : ""}
              </span>
            </summary>
            <div className="p-5 space-y-3">
              {product.evidence.sources && product.evidence.sources.length > 0 && (
                <div className="space-y-2">
                  {product.evidence.sources.map((s, i) => (
                    <div key={i} className="p-2.5 bg-[#0a1520] border border-[#1a2d48] rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-300">{safeStr(s.title)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${s.type==="regulatory"?"text-emerald-400 bg-emerald-400/10":s.type==="academic"?"text-blue-400 bg-blue-400/10":"text-slate-400 bg-slate-400/10"}`}>{safeStr(s.type)}</span>
                      </div>
                      {s.year && <p className="text-xs text-slate-600 mt-1">{s.year}</p>}
                    </div>
                  ))}
                </div>
              )}
              {product.evidence.methodology && (
                <details className="text-xs">
                  <summary className="text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">Methodology</summary>
                  <p className="text-slate-400 mt-2 leading-relaxed">{product.evidence.methodology}</p>
                </details>
              )}
            </div>
          </details>
        )}

        {/* ── SECTION 8: ECOSYSTEM FOOTER ──────────────────────────────── */}
        <div className="border-t border-[#1a2d48] mt-8 pt-6 pb-8 text-center space-y-2">
          <p className="text-xs text-slate-500">Powered by <span className="text-cyan-400 font-semibold">BioLens</span> Material Intelligence</p>
          <div className="flex justify-center gap-6 text-xs text-slate-600">
            <a href="https://nowweevolve.com" target="_blank" rel="noopener" className="hover:text-slate-400 transition-colors">Now We Evolve</a>
            <span className="text-slate-700">·</span>
            <a href="https://bioeconomyfoundation.org" target="_blank" rel="noopener" className="hover:text-slate-400 transition-colors">BioeconomyFoundation.org</a>
            <span className="text-slate-700">·</span>
            <a href="https://fiberfoundry.co" target="_blank" rel="noopener" className="hover:text-slate-400 transition-colors">FiberFoundry</a>
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
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"/>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </main>
    }>
      <ResultsContent id={id}/>
    </Suspense>
  );
}
