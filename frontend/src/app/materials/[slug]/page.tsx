"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Material = {
  id: string;
  material_name: string;
  normalized_name: string;
  slug: string;
  material_family: string | null;
  description: string | null;
  common_uses: string | null;
  environmental_notes: string | null;
  consumer_facing_summary: string | null;
  risk_level: string | null;
  petroload_score: number | null;
  petro_based_flag: boolean;
  bio_based_flag: boolean;
  synthetic_flag: boolean;
  transition_flag: boolean;
  plant_based_flag: boolean;
  natural_material_flag: boolean;
  petro_dependency_ratio: number | null;
  biodegradability_score: number | null;
  toxicity_score: number | null;
  microplastic_risk_score: number | null;
  water_intensity_score: number | null;
  land_use_score: number | null;
  cas_rn: string | null;
  inci_name: string | null;
};

type ConcernCategory = {
  code: string;
  name: string;
  concern_domain: string;
  description: string;
  why_it_matters: string;
  display_order: number;
};

type Concern = {
  id: string;
  concern_score: number;
  concern_tier: string;
  concern_status: string;
  consumer_facing_note: string | null;
  confidence_score: number | null;
  primary_exposure_pathways: string[] | null;
  applies_to_finished_good: boolean;
  toxicity_concern_categories: ConcernCategory;
};

type AlternativeMaterial = {
  id: string;
  material_name: string;
  slug: string | null;
  petroload_score: number | null;
  bio_based_flag: boolean;
  risk_level: string | null;
  consumer_facing_summary: string | null;
};

type Alternative = {
  id: string;
  replacement_reason: string | null;
  reason: string | null;
  priority_rank: number | null;
  priority: number | null;
  performance_notes: string | null;
  cost_notes: string | null;
  product_category_relevance: string | null;
  alternative_material: AlternativeMaterial;
};

type Lifecycle = {
  biodegradability_score: number | null;
  recyclability_score: number | null;
  compostability_score: number | null;
  microplastic_risk_score: number | null;
  landfill_persistence_score: number | null;
  environmental_accumulation_score: number | null;
  circular_recovery_score: number | null;
  lifecycle_composite_score: number | null;
};

type APIResponse = {
  success: boolean;
  material: Material;
  concerns: Concern[];
  alternatives: Alternative[];
  lifecycle: Lifecycle | null;
  materialHealthScore: number | null;
  error?: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function classificationLabel(m: Material): string {
  if (m.bio_based_flag || m.plant_based_flag || m.natural_material_flag)
    return "Bio-based";
  if (m.transition_flag) return "Bridge / Transitional";
  if (m.synthetic_flag) return "Synthetic";
  if (m.petro_based_flag) return "Petrochemical";
  return "Unclassified";
}

function classificationColor(label: string): string {
  switch (label) {
    case "Bio-based":
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "Bridge / Transitional":
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "Synthetic":
      return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    case "Petrochemical":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    default:
      return "text-slate-400 border-slate-500/30 bg-slate-500/10";
  }
}

function tierColor(tier: string): string {
  switch (tier?.toLowerCase()) {
    case "negligible":
    case "very low":
      return "bg-emerald-500";
    case "low":
      return "bg-green-500";
    case "moderate":
      return "bg-amber-500";
    case "high":
      return "bg-orange-500";
    case "very high":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
}

function gaugeColor(score: number): string {
  if (score <= 20) return "#10b981";
  if (score <= 40) return "#22d3ee";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#f97316";
  return "#ef4444";
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function PetroloadGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = gaugeColor(score);

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="h-3 bg-[#1e3a5f] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-600">
          <span>0 Bio-based</span>
          <span>100 Petrochemical</span>
        </div>
      </div>
      <div
        className="text-3xl font-bold tabular-nums"
        style={{ color, fontFamily: "var(--font-manrope)" }}
      >
        {score}
      </div>
    </div>
  );
}

function HealthBar({
  score,
  label,
}: {
  score: number | null;
  label: string;
}) {
  if (score === null) return null;
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function LifecycleBar({
  score,
  label,
}: {
  score: number | null;
  label: string;
}) {
  if (score === null || score === undefined) return null;
  const pct = Math.min(100, Math.max(0, Number(score)));
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-medium text-slate-300">
          {Number(score).toFixed(0)}
        </span>
      </div>
      <div className="h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MaterialDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/materials/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || "Material not found");
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Failed to load material data"))
      .finally(() => setLoading(false));
  }, [slug]);

  const mat = data?.material;
  const classification = mat ? classificationLabel(mat) : "";
  const clsColor = classificationColor(classification);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <Nav />

      <main className="max-w-4xl mx-auto px-4 pt-12 pb-20">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-[#0c1829] border border-red-500/30 rounded-xl p-8 text-center">
            <p className="text-red-400 text-sm font-semibold mb-2">
              Material Not Found
            </p>
            <p className="text-slate-500 text-xs">{error}</p>
            <Link
              href="/explore"
              className="inline-block mt-4 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Browse all materials
            </Link>
          </div>
        )}

        {/* Content */}
        {mat && !loading && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <Link
                href="/explore"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4 inline-block"
              >
                &larr; Back to Explore
              </Link>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-manrope)" }}
                >
                  {mat.material_name}
                </h1>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${clsColor}`}
                >
                  {classification}
                </span>
              </div>
              {mat.material_family && (
                <p className="text-xs text-slate-500">
                  Family: {mat.material_family}
                </p>
              )}
              {(mat.cas_rn || mat.inci_name) && (
                <p className="text-xs text-slate-600 mt-1">
                  {mat.cas_rn && <span>CAS: {mat.cas_rn}</span>}
                  {mat.cas_rn && mat.inci_name && <span> &middot; </span>}
                  {mat.inci_name && <span>INCI: {mat.inci_name}</span>}
                </p>
              )}
            </div>

            {/* Petroload Gauge */}
            {mat.petroload_score !== null && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Petroload Index
                </h2>
                <PetroloadGauge score={Number(mat.petroload_score)} />
              </section>
            )}

            {/* Why It Matters */}
            {mat.consumer_facing_summary && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                  Why It Matters
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {mat.consumer_facing_summary}
                </p>
              </section>
            )}

            {/* Description & Uses */}
            {(mat.description || mat.common_uses) && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6 space-y-4">
                {mat.description && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Description
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {mat.description}
                    </p>
                  </div>
                )}
                {mat.common_uses && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Common Uses
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {mat.common_uses}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Material Health Score */}
            {data.materialHealthScore !== null && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Material Health Score
                </h2>
                <HealthBar
                  score={data.materialHealthScore}
                  label="Overall Health (inverse toxicity)"
                />
                <p className="text-[10px] text-slate-600 mt-2">
                  Computed as 100 minus the average concern score across all
                  assessed dimensions. Higher is healthier.
                </p>
              </section>
            )}

            {/* Concern Assessments */}
            {data.concerns.length > 0 && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Concern Assessments ({data.concerns.length})
                </h2>
                <div className="space-y-3">
                  {data.concerns.map((c) => {
                    const cat = c.toxicity_concern_categories;
                    return (
                      <div
                        key={c.id}
                        className="bg-[#070b12] border border-[#1e3a5f] rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${tierColor(c.concern_tier)}`}
                            />
                            <span className="text-sm font-semibold text-slate-200">
                              {cat?.name || "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 capitalize">
                              {c.concern_tier}
                            </span>
                            <span className="text-xs font-bold text-slate-300 tabular-nums">
                              {Number(c.concern_score).toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#1e3a5f] rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${tierColor(c.concern_tier)}`}
                            style={{
                              width: `${Math.min(100, Number(c.concern_score))}%`,
                            }}
                          />
                        </div>
                        {c.consumer_facing_note && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {c.consumer_facing_note}
                          </p>
                        )}
                        {c.primary_exposure_pathways &&
                          c.primary_exposure_pathways.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.primary_exposure_pathways.map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] text-slate-500 border border-[#1e3a5f] px-2 py-0.5 rounded"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Lifecycle Scores */}
            {data.lifecycle && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Lifecycle Intelligence
                </h2>
                <div className="space-y-3">
                  <LifecycleBar
                    score={data.lifecycle.biodegradability_score}
                    label="Biodegradability"
                  />
                  <LifecycleBar
                    score={data.lifecycle.recyclability_score}
                    label="Recyclability"
                  />
                  <LifecycleBar
                    score={data.lifecycle.compostability_score}
                    label="Compostability"
                  />
                  <LifecycleBar
                    score={data.lifecycle.circular_recovery_score}
                    label="Circular Recovery"
                  />
                  <LifecycleBar
                    score={data.lifecycle.microplastic_risk_score}
                    label="Microplastic Risk"
                  />
                  <LifecycleBar
                    score={data.lifecycle.landfill_persistence_score}
                    label="Landfill Persistence"
                  />
                  <LifecycleBar
                    score={data.lifecycle.environmental_accumulation_score}
                    label="Environmental Accumulation"
                  />
                </div>
                {data.lifecycle.lifecycle_composite_score !== null && (
                  <div className="mt-4 pt-4 border-t border-[#1e3a5f] flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Composite Score
                    </span>
                    <span className="text-lg font-bold text-cyan-400">
                      {Number(
                        data.lifecycle.lifecycle_composite_score
                      ).toFixed(0)}
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* Better Alternatives */}
            {data.alternatives.length > 0 && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                  Better Alternatives
                </h2>
                <div className="space-y-3">
                  {data.alternatives.map((alt) => {
                    const am = alt.alternative_material;
                    if (!am) return null;
                    return (
                      <Link
                        key={alt.id}
                        href={`/materials/${encodeURIComponent(am.slug || am.material_name)}`}
                        className="block bg-[#070b12] border border-[#1e3a5f] rounded-lg p-4 hover:border-cyan-500/40 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                            {am.material_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {am.petroload_score !== null && (
                              <span className="text-[10px] text-slate-500">
                                Petroload:{" "}
                                <span className="font-semibold text-slate-300">
                                  {Number(am.petroload_score).toFixed(0)}
                                </span>
                              </span>
                            )}
                            {am.bio_based_flag && (
                              <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                Bio
                              </span>
                            )}
                          </div>
                        </div>
                        {(alt.replacement_reason || alt.reason) && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {alt.replacement_reason || alt.reason}
                          </p>
                        )}
                        {alt.performance_notes && (
                          <p className="text-[10px] text-slate-600 mt-1">
                            Performance: {alt.performance_notes}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Environmental Notes */}
            {mat.environmental_notes && (
              <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Environmental Notes
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {mat.environmental_notes}
                </p>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
