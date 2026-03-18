import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withNeo4jSession } from '@/lib/neo4j/client'

export interface GraphMaterial {
  material: string
  risk: string | null
  toxicity: number | null
  lifecycle: number | null
  bio_pure: boolean | null
  alternatives: string[]
}

export interface NormalizedMaterial {
  name: string
  classification: 'bio' | 'bridge' | 'synthetic' | 'unknown'
  percentage?: number
  healthScore?: number
  confidence?: string
  notes?: string
}

export interface NormalizedHealth {
  hazardSignal?: string
  endocrineDisruption?: boolean | null
  carcinogenicity?: boolean | null
  leachateRisk?: boolean | null
  exposurePathways?: Array<{ type: string; risk: 'low' | 'moderate' | 'high'; notes?: string }>
  chemicalFlags?: string[]
  confidence?: string
  evidenceAvailable?: boolean
  notes?: string
}

export interface NormalizedLifecycle {
  score: number
  recyclable?: boolean | null
  compostable?: boolean | null
  landfillPersistenceYears?: number
  microplasticRisk?: string
  endOfLifePathway?: string
  confidence?: string
}

export interface NormalizedAlternative {
  id: string
  name: string
  material?: string
  petroloadImprovement: number
  microplasticReduction?: number
  lifecycleImprovement?: number
  confidence?: string
}

export interface NormalizedCorporate {
  brand?: string
  brandOwner?: string
  manufacturer?: string
  distributor?: string
  parentCompany?: string
  confidence?: string
}

export interface NormalizedEvidence {
  sources?: Array<{ title: string; type: string; year?: number; url?: string }>
  methodology?: string
  lastUpdated?: string
}

export interface EnrichedIntelligence {
  petroloadIndex: number | null
  petroloadLabel: string
  materials: NormalizedMaterial[]
  healthEffects: NormalizedHealth | null
  lifecycle: NormalizedLifecycle | null
  alternatives: NormalizedAlternative[]
  corporate: NormalizedCorporate | null
  evidence: NormalizedEvidence | null
  materialInsight: { headline: string; body: string } | null
  confidence: string
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function safePetroScore(value: unknown): number | null {
  if (value == null) return null
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric <= 1 ? clampScore(numeric * 100) : clampScore(numeric)
}

function riskToScore(risk: string | null | undefined): number | null {
  if (risk == null) return null

  const raw = String(risk).trim()
  if (!raw) return null

  const num = parseFloat(raw)
  if (!Number.isNaN(num)) {
    return num <= 1 ? clampScore(num * 100) : clampScore(num)
  }

  const r = raw.toLowerCase()
  if (r.includes('very_high') || r.includes('critical')) return 90
  if (r.includes('high')) return 75
  if (r.includes('medium') || r.includes('moderate')) return 50
  if (r.includes('low')) return 25
  if (r.includes('bio') || r.includes('natural')) return 15

  return null
}

function scoreToClassification(
  score: number | null,
  bioPure?: boolean | null
): NormalizedMaterial['classification'] {
  if (bioPure) return 'bio'
  if (score === null) return 'unknown'
  if (score <= 20) return 'bio'
  if (score <= 50) return 'bridge'
  return 'synthetic'
}

function toLabelScale(value: number | null | undefined): number | null {
  if (value == null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric <= 1 ? clampScore(numeric * 100) : clampScore(numeric)
}

export function petroLabel(score: number | null): string {
  if (score === null) return 'unknown'
  if (score <= 20) return 'bio-based'
  if (score <= 50) return 'bridge'
  if (score <= 80) return 'synthetic'
  return 'petrochemical'
}

function riskToHazard(risk: string | null | undefined): string {
  if (risk == null) return 'unknown'
  const v = String(risk).toLowerCase()
  if (v.includes('high') || v.includes('critical')) return 'high'
  if (v.includes('medium') || v.includes('moderate')) return 'moderate'
  if (v.includes('low') || v.includes('bio')) return 'low'
  return 'unknown'
}

function averageScores(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!valid.length) return null
  return clampScore(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

function toxicityToHealthScore(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined
  const normalized = value <= 1 ? value : value / 100
  return clampScore((1 - normalized) * 100)
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildMaterialCandidates(input: string): string[] {
  const normalized = normalizeSearchText(input)
  if (!normalized) return []

  const stopwords = new Set([
    'the',
    'and',
    'for',
    'with',
    'made',
    'from',
    'blend',
    'shirt',
    'jacket',
    'hoodie',
    'pant',
    'pants',
    'sock',
    'socks',
    'bag',
    'tote',
    'apparel',
    'clothing',
    'product',
    'item',
  ])

  const tokens = normalized
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)

  const filteredTokens = tokens.filter((t) => !stopwords.has(t) && t.length > 2)

  const candidates = new Set<string>()
  candidates.add(normalized)

  for (const token of filteredTokens) {
    candidates.add(token)
  }

  for (let i = 0; i < filteredTokens.length - 1; i++) {
    candidates.add(`${filteredTokens[i]} ${filteredTokens[i + 1]}`)
  }

  return Array.from(candidates)
}

export async function enrichByMaterialNames(names: string[]): Promise<GraphMaterial[]> {
  if (!names.length) return []

  const expandedNames = Array.from(new Set(names.flatMap((name) => buildMaterialCandidates(name))))
  if (!expandedNames.length) return []

  try {
    return await withNeo4jSession(async (session) => {
      const result = await session.run(
        `
        UNWIND $names AS name
        MATCH (m:Material)
        WHERE toLower(m.name) = name
           OR toLower(m.name) CONTAINS name
           OR name CONTAINS toLower(m.name)
        OPTIONAL MATCH (m)-[:HAS_CURRENT_LEDGER]->(l:MaterialRiskLedger)
        OPTIONAL MATCH (m)-[:HAS_ALTERNATIVE]->(alt:Alternative)
        RETURN DISTINCT
          m.name AS material,
          l.overall_risk AS risk,
          l.toxicity_score AS toxicity,
          l.lifecycle_score AS lifecycle,
          l.bio_pure_verified AS bio_pure,
          collect(alt.name)[0..3] AS alternatives
        `,
        { names: expandedNames }
      )

      return result.records.map((record) => ({
        material: record.get('material') as string,
        risk: record.get('risk') as string | null,
        toxicity: record.get('toxicity') != null ? Number(record.get('toxicity')) : null,
        lifecycle: record.get('lifecycle') != null ? Number(record.get('lifecycle')) : null,
        bio_pure: record.get('bio_pure') as boolean | null,
        alternatives: (record.get('alternatives') as string[]) ?? [],
      }))
    })
  } catch (err) {
    console.error('Neo4j material enrichment failed:', err)
    return []
  }
}

export async function enrichByProductId(productId: string): Promise<EnrichedIntelligence> {
  let pi: Record<string, any> | null = null
  let materialNames: string[] = []

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('get_biolens_product_intelligence', {
      p_product_id: productId,
    })

    if (!error && data) {
      pi = data as Record<string, unknown>
      const mats = (data as any)?.materials
      if (Array.isArray(mats)) {
        materialNames = mats.map((m: any) => m?.name).filter(Boolean)
      }
    }
  } catch {
    // RPC unavailable
  }

  const graphMaterials = await enrichByMaterialNames(materialNames)
  return normalizeIntelligence(pi, graphMaterials)
}

export function normalizeIntelligence(
  pi: Record<string, any> | null,
  graphMaterials: GraphMaterial[]
): EnrichedIntelligence {
  const rpcPetroScore =
    safePetroScore(pi?.petroload_score) ??
    safePetroScore(pi?.petroload_index) ??
    safePetroScore(pi?.petroload)

  const graphPetroScore = averageScores(graphMaterials.map((g) => riskToScore(g.risk)))
  const petroloadIndex = rpcPetroScore ?? graphPetroScore

  const materials: NormalizedMaterial[] = []
  const rpcMaterials: any[] = Array.isArray(pi?.materials) ? pi.materials : []
  const graphByName = new Map(graphMaterials.map((g) => [g.material, g]))

  if (rpcMaterials.length) {
    for (const material of rpcMaterials) {
      const graphMaterial = graphByName.get(material.name)

      const petro =
        riskToScore(graphMaterial?.risk) ??
        safePetroScore(material?.petroload_score) ??
        safePetroScore(material?.petroload_index) ??
        petroloadIndex

      const toxicity =
        graphMaterial?.toxicity ??
        (material?.toxicity_score != null ? Number(material.toxicity_score) : null)

      materials.push({
        name: material.name,
        classification: scoreToClassification(petro, graphMaterial?.bio_pure),
        percentage: material.percentage != null ? Number(material.percentage) : undefined,
        healthScore: toxicityToHealthScore(toxicity),
        confidence: material.confidence ?? (graphMaterial ? 'inferred' : 'estimated'),
        notes: material.notes ?? material.consumer_facing_summary ?? undefined,
      })
    }
  } else if (graphMaterials.length) {
    for (const graphMaterial of graphMaterials) {
      const petro = riskToScore(graphMaterial.risk)
      materials.push({
        name: graphMaterial.material,
        classification: scoreToClassification(petro, graphMaterial.bio_pure),
        healthScore: toxicityToHealthScore(graphMaterial.toxicity),
        confidence: 'inferred',
      })
    }
  }

  let healthEffects: NormalizedHealth | null = null
  const maxToxicity = graphMaterials.length
    ? Math.max(...graphMaterials.map((g) => g.toxicity ?? 0))
    : pi?.toxicity_score != null
      ? Number(pi.toxicity_score)
      : null

  if (maxToxicity !== null || pi?.health_effects) {
    const hazard =
      maxToxicity !== null
        ? maxToxicity > 0.7
          ? 'high'
          : maxToxicity > 0.4
            ? 'moderate'
            : 'low'
        : riskToHazard(pi?.risk_level)

    const he = pi?.health_effects as any

    healthEffects = {
      hazardSignal: hazard,
      endocrineDisruption: he?.endocrine_disruption ?? null,
      carcinogenicity: he?.carcinogenicity ?? null,
      leachateRisk: he?.leachate_risk ?? null,
      chemicalFlags: he?.chemical_flags ?? [],
      exposurePathways: he?.exposure_pathways ?? [],
      confidence: graphMaterials.length ? 'inferred' : 'estimated',
      evidenceAvailable: graphMaterials.length > 0,
      notes: he?.notes ?? undefined,
    }
  }

  let lifecycle: NormalizedLifecycle | null = null
  const lifecycleScores = graphMaterials
    .map((g) => g.lifecycle)
    .filter((v): v is number => v != null)
  const rpcLifecycle = pi?.lifecycle as any

  if (lifecycleScores.length || rpcLifecycle) {
    const averageLifecycle = lifecycleScores.length
      ? lifecycleScores.reduce((a, b) => a + b, 0) / lifecycleScores.length
      : null

    const score = toLabelScale(rpcLifecycle?.composite_score) ?? toLabelScale(averageLifecycle) ?? 0

    lifecycle = {
      score,
      recyclable: rpcLifecycle?.recyclable ?? null,
      compostable: rpcLifecycle?.compostable ?? null,
      landfillPersistenceYears: rpcLifecycle?.landfill_persistence_years ?? undefined,
      microplasticRisk: rpcLifecycle?.microplastic_risk ?? undefined,
      endOfLifePathway:
        rpcLifecycle?.best_end_of_life ?? rpcLifecycle?.end_of_life_pathway ?? undefined,
      confidence: rpcLifecycle ? 'estimated' : 'inferred',
    }
  }

  const alternatives: NormalizedAlternative[] = []
  const rpcAlternatives: any[] = Array.isArray(pi?.alternatives) ? pi.alternatives : []

  if (rpcAlternatives.length) {
    for (const alt of rpcAlternatives) {
      const altPetro =
        safePetroScore(alt?.petroload_score) ?? safePetroScore(alt?.petroload_index)

      alternatives.push({
        id: String(alt.id ?? alt.material_id ?? alternatives.length),
        name: alt.name ?? alt.alternative_material_name ?? alt.material_name ?? 'Unknown',
        material: alt.material ?? alt.material_class ?? undefined,
        petroloadImprovement:
          alt.petroload_improvement ?? Math.max(0, (petroloadIndex ?? 0) - (altPetro ?? 0)),
        microplasticReduction: alt.microplastic_reduction ?? undefined,
        lifecycleImprovement: alt.lifecycle_improvement ?? undefined,
        confidence: alt.confidence ?? 'estimated',
      })
    }
  } else {
    const seen = new Set<string>()

    for (const graphMaterial of graphMaterials) {
      const sourcePetro = riskToScore(graphMaterial.risk) ?? petroloadIndex ?? 0

      for (const name of graphMaterial.alternatives) {
        if (seen.has(name)) continue
        seen.add(name)

        alternatives.push({
          id: name,
          name,
          petroloadImprovement: Math.max(0, sourcePetro - 20),
          confidence: 'inferred',
        })
      }
    }
  }

  let corporate: NormalizedCorporate | null = null
  const corp = pi?.corporate as any

  if (corp || pi?.brand || pi?.manufacturer_name) {
    corporate = {
      brand: corp?.brand ?? pi?.brand ?? undefined,
      brandOwner: corp?.brand_owner ?? corp?.brandOwner ?? undefined,
      manufacturer: corp?.manufacturer ?? pi?.manufacturer_name ?? undefined,
      distributor: corp?.distributor ?? undefined,
      parentCompany: corp?.parent_company ?? corp?.parentCompany ?? undefined,
      confidence: corp?.confidence ?? 'estimated',
    }
  }

  let evidence: NormalizedEvidence | null = null
  const sources: NonNullable<NormalizedEvidence['sources']> = []

  if (graphMaterials.length) {
    sources.push({ title: 'BioLens Material Intelligence Graph', type: 'database' })
  }

  if (Array.isArray(pi?.evidence_sources)) {
    sources.push(...(pi.evidence_sources as any[]))
  }

  if (sources.length || pi?.methodology) {
    evidence = {
      sources,
      methodology:
        pi?.methodology ??
        (graphMaterials.length
          ? 'Graph-enriched material intelligence via Neo4j MaterialRiskLedger nodes'
          : undefined),
      lastUpdated: pi?.last_updated ?? new Date().toISOString().split('T')[0],
    }
  }

  let materialInsight: { headline: string; body: string } | null = null
  if (materials.length) {
    const top = materials[0]
    const label = petroLabel(petroloadIndex)
    const scoreText = petroloadIndex === null ? 'unknown' : `${petroloadIndex}/100`

    materialInsight = {
      headline: `${top.name} — ${label}`,
      body:
        top.notes ??
        `Primary material scored ${scoreText} on the petroload index.${materials.length > 1 ? ` ${materials.length} materials analyzed.` : ''}`,
    }
  }

  return {
    petroloadIndex,
    petroloadLabel: petroLabel(petroloadIndex),
    materials,
    healthEffects: healthEffects ?? null,
    lifecycle: lifecycle ?? null,
    alternatives: alternatives.slice(0, 5),
    corporate: corporate ?? null,
    evidence: evidence ?? null,
    materialInsight,
    confidence: graphMaterials.length > 0 ? (pi ? 'estimated' : 'inferred') : 'limited',
  }
}
