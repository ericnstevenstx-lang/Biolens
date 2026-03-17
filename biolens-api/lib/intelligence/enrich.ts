import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withNeo4jSession } from '@/lib/neo4j/client'

export interface GraphMaterial {
  material: string; risk: string | null; toxicity: number | null; lifecycle: number | null; bio_pure: boolean | null; alternatives: string[];
}
export interface NormalizedMaterial {
  name: string; classification: 'bio' | 'bridge' | 'synthetic' | 'unknown'; percentage?: number; healthScore?: number; confidence?: string; notes?: string;
}
export interface NormalizedHealth {
  hazardSignal?: string; endocrineDisruption?: boolean | null; carcinogenicity?: boolean | null; leachateRisk?: boolean | null;
  exposurePathways?: Array<{ type: string; risk: 'low' | 'moderate' | 'high'; notes?: string }>; chemicalFlags?: string[];
  confidence?: string; evidenceAvailable?: boolean; notes?: string;
}
export interface NormalizedLifecycle {
  score: number; recyclable?: boolean | null; compostable?: boolean | null; landfillPersistenceYears?: number;
  microplasticRisk?: string; endOfLifePathway?: string; confidence?: string;
}
export interface NormalizedAlternative {
  id: string; name: string; material?: string; petroloadImprovement: number; microplasticReduction?: number; lifecycleImprovement?: number; confidence?: string;
}
export interface NormalizedCorporate {
  brand?: string; brandOwner?: string; manufacturer?: string; distributor?: string; parentCompany?: string; confidence?: string;
}
export interface NormalizedEvidence {
  sources?: Array<{ title: string; type: string; year?: number; url?: string }>; methodology?: string; lastUpdated?: string;
}
export interface EnrichedIntelligence {
  petroloadIndex: number; petroloadLabel: string; materials: NormalizedMaterial[]; healthEffects: NormalizedHealth | null;
  lifecycle: NormalizedLifecycle | null; alternatives: NormalizedAlternative[]; corporate: NormalizedCorporate | null;
  evidence: NormalizedEvidence | null; materialInsight: { headline: string; body: string } | null; confidence: string;
}

function riskToScore(risk: string | null | undefined): number {
  if (risk == null) return 50
  const raw = String(risk); const num = parseFloat(raw)
  if (!isNaN(num)) return num <= 1 ? Math.round(num * 100) : Math.round(num)
  const r = raw.toLowerCase()
  if (r.includes('very_high') || r.includes('critical')) return 90
  if (r.includes('high')) return 75
  if (r.includes('medium') || r.includes('moderate')) return 50
  if (r.includes('low')) return 25
  if (r.includes('bio') || r.includes('natural')) return 15
  return 50
}
function scoreToClassification(s: number, b?: boolean | null): NormalizedMaterial['classification'] {
  if (b) return 'bio'; if (s <= 20) return 'bio'; if (s <= 50) return 'bridge'; if (s <= 80) return 'synthetic'; return 'unknown'
}
function toLabelScale(v: number | null | undefined): number {
  if (v == null) return 0; return v <= 1 ? Math.round(v * 100) : Math.round(v)
}
export function petroLabel(s: number): string {
  if (s <= 20) return 'bio-based'; if (s <= 50) return 'bridge'; if (s <= 80) return 'synthetic'; return 'petrochemical'
}
function riskToHazard(r: string | null | undefined): string {
  if (r == null) return 'unknown'; const v = String(r).toLowerCase()
  if (v.includes('high') || v.includes('critical')) return 'high'
  if (v.includes('medium') || v.includes('moderate')) return 'moderate'
  if (v.includes('low') || v.includes('bio')) return 'low'
  return 'unknown'
}

export async function enrichByMaterialNames(names: string[]): Promise<GraphMaterial[]> {
  if (!names.length) return []
  try {
    return await withNeo4jSession(async (session) => {
      const result = await session.run(
        `UNWIND $names AS name
         MATCH (m:Material {name: name})
         OPTIONAL MATCH (m)-[:HAS_CURRENT_LEDGER]->(l:MaterialRiskLedger)
         OPTIONAL MATCH (m)-[:HAS_ALTERNATIVE]->(alt:Alternative)
         RETURN m.name AS material, l.overall_risk AS risk, l.toxicity_score AS toxicity,
                l.lifecycle_score AS lifecycle, l.bio_pure_verified AS bio_pure,
                collect(alt.name)[0..3] AS alternatives`,
        { names }
      )
      return result.records.map(r => ({
        material: r.get('material') as string, risk: r.get('risk') as string | null,
        toxicity: r.get('toxicity') != null ? Number(r.get('toxicity')) : null,
        lifecycle: r.get('lifecycle') != null ? Number(r.get('lifecycle')) : null,
        bio_pure: r.get('bio_pure') as boolean | null, alternatives: (r.get('alternatives') as string[]) ?? [],
      }))
    })
  } catch { return [] }
}

export async function enrichByProductId(productId: string): Promise<EnrichedIntelligence> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pi: Record<string, any> | null = null; let materialNames: string[] = []
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('get_biolens_product_intelligence', { p_product_id: productId })
    if (!error && data) {
      pi = data as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mats = (data as any)?.materials
      if (Array.isArray(mats)) materialNames = mats.map((m: any) => m.name).filter(Boolean)
    }
  } catch { /* RPC unavailable */ }
  const graphMaterials = await enrichByMaterialNames(materialNames)
  return normalizeIntelligence(pi, graphMaterials)
}

export function normalizeIntelligence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi: Record<string, any> | null, graphMaterials: GraphMaterial[]
): EnrichedIntelligence {
  let petroloadIndex = 0
  if (pi?.petroload_score != null) { petroloadIndex = toLabelScale(Number(pi.petroload_score)) }
  else if (graphMaterials.length) {
    const scores = graphMaterials.map(g => riskToScore(g.risk))
    petroloadIndex = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const materials: NormalizedMaterial[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcMaterials: any[] = Array.isArray(pi?.materials) ? pi.materials : []
  const graphByName = new Map(graphMaterials.map(g => [g.material, g]))

  if (rpcMaterials.length) {
    for (const m of rpcMaterials) {
      const g = graphByName.get(m.name)
      const petro = g ? riskToScore(g.risk) : m.petroload_score != null ? toLabelScale(Number(m.petroload_score)) : petroloadIndex
      const tox = g?.toxicity ?? (m.toxicity_score != null ? Number(m.toxicity_score) : null)
      materials.push({ name: m.name, classification: scoreToClassification(petro, g?.bio_pure), percentage: m.percentage != null ? Number(m.percentage) : undefined, healthScore: tox != null ? Math.round((1 - tox) * 100) : undefined, confidence: m.confidence ?? (g ? 'inferred' : 'estimated'), notes: m.notes ?? m.consumer_facing_summary ?? undefined })
    }
  } else if (graphMaterials.length) {
    for (const g of graphMaterials) {
      const petro = riskToScore(g.risk)
      materials.push({ name: g.material, classification: scoreToClassification(petro, g.bio_pure), healthScore: g.toxicity != null ? Math.round((1 - g.toxicity) * 100) : undefined, confidence: 'inferred' })
    }
  }

  let healthEffects: NormalizedHealth | null = null
  const maxTox = graphMaterials.length ? Math.max(...graphMaterials.map(g => g.toxicity ?? 0)) : pi?.toxicity_score != null ? Number(pi.toxicity_score) : null
  if (maxTox !== null || pi?.health_effects) {
    const hazard = maxTox != null ? (maxTox > 0.7 ? 'high' : maxTox > 0.4 ? 'moderate' : 'low') : riskToHazard(pi?.risk_level)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const he = pi?.health_effects as any
    healthEffects = { hazardSignal: hazard, endocrineDisruption: he?.endocrine_disruption ?? null, carcinogenicity: he?.carcinogenicity ?? null, leachateRisk: he?.leachate_risk ?? null, chemicalFlags: he?.chemical_flags ?? [], exposurePathways: he?.exposure_pathways ?? [], confidence: graphMaterials.length ? 'inferred' : 'estimated', evidenceAvailable: graphMaterials.length > 0, notes: he?.notes ?? undefined }
  }

  let lifecycle: NormalizedLifecycle | null = null
  const lcScores = graphMaterials.map(g => g.lifecycle).filter((v): v is number => v != null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcLc = pi?.lifecycle as any
  if (lcScores.length || rpcLc) {
    const avg = lcScores.length ? lcScores.reduce((a, b) => a + b, 0) / lcScores.length : null
    const score = rpcLc?.composite_score != null ? toLabelScale(rpcLc.composite_score) : avg != null ? toLabelScale(avg) : 0
    lifecycle = { score, recyclable: rpcLc?.recyclable ?? null, compostable: rpcLc?.compostable ?? null, landfillPersistenceYears: rpcLc?.landfill_persistence_years ?? undefined, microplasticRisk: rpcLc?.microplastic_risk ?? undefined, endOfLifePathway: rpcLc?.best_end_of_life ?? rpcLc?.end_of_life_pathway ?? undefined, confidence: rpcLc ? 'estimated' : 'inferred' }
  }

  const alternatives: NormalizedAlternative[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcAlts: any[] = Array.isArray(pi?.alternatives) ? pi.alternatives : []
  if (rpcAlts.length) {
    for (const a of rpcAlts) {
      const altPetro = a.petroload_score != null ? toLabelScale(Number(a.petroload_score)) : 0
      alternatives.push({ id: String(a.id ?? a.material_id ?? alternatives.length), name: a.name ?? a.alternative_material_name ?? a.material_name ?? 'Unknown', material: a.material ?? a.material_class ?? undefined, petroloadImprovement: a.petroload_improvement ?? Math.max(0, petroloadIndex - altPetro), microplasticReduction: a.microplastic_reduction ?? undefined, lifecycleImprovement: a.lifecycle_improvement ?? undefined, confidence: a.confidence ?? 'estimated' })
    }
  } else {
    const seen = new Set<string>()
    for (const g of graphMaterials) {
      const sp = riskToScore(g.risk)
      for (const n of g.alternatives) { if (seen.has(n)) continue; seen.add(n); alternatives.push({ id: n, name: n, petroloadImprovement: Math.max(0, sp - 20), confidence: 'inferred' }) }
    }
  }

  let corporate: NormalizedCorporate | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const corp = pi?.corporate as any
  if (corp || pi?.brand || pi?.manufacturer_name) {
    corporate = { brand: corp?.brand ?? pi?.brand ?? undefined, brandOwner: corp?.brand_owner ?? corp?.brandOwner ?? undefined, manufacturer: corp?.manufacturer ?? pi?.manufacturer_name ?? undefined, distributor: corp?.distributor ?? undefined, parentCompany: corp?.parent_company ?? corp?.parentCompany ?? undefined, confidence: corp?.confidence ?? 'estimated' }
  }

  let evidence: NormalizedEvidence | null = null
  const sources: NonNullable<NormalizedEvidence['sources']> = []
  if (graphMaterials.length) sources.push({ title: 'BioLens Material Intelligence Graph', type: 'database' })
  if (pi?.evidence_sources) sources.push(...(pi.evidence_sources as any[]))
  if (sources.length || pi?.methodology) {
    evidence = { sources, methodology: pi?.methodology ?? (graphMaterials.length ? 'Graph-enriched material intelligence via Neo4j MaterialRiskLedger nodes' : undefined), lastUpdated: pi?.last_updated ?? new Date().toISOString().split('T')[0] }
  }

  let materialInsight: { headline: string; body: string } | null = null
  if (materials.length) {
    const top = materials[0]; const label = petroLabel(petroloadIndex)
    materialInsight = { headline: `${top.name} — ${label}`, body: top.notes ?? `Primary material scored ${petroloadIndex}/100 on the petroload index.${materials.length > 1 ? ` ${materials.length} materials analyzed.` : ''}` }
  }

  return { petroloadIndex, petroloadLabel: petroLabel(petroloadIndex), materials, healthEffects: healthEffects ?? null, lifecycle: lifecycle ?? null, alternatives: alternatives.slice(0, 5), corporate: corporate ?? null, evidence: evidence ?? null, materialInsight, confidence: graphMaterials.length > 0 ? (pi ? 'estimated' : 'inferred') : 'limited' }
}
