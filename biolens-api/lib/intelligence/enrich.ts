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

export interface NormalizedCapitalFlow {
  /** Estimated tariff drain per dollar spent (0-1) */
  tariffDrainPct: number
  /** Pct of price retained in domestic economy */
  domesticRetentionPct: number
  /** Pct of price leaked to foreign supply chains */
  foreignLeakagePct: number
  /** Whether origin country triggers Section 301 tariff */
  section301Applies: boolean
  /** FEOC (Foreign Entity of Concern) disqualified */
  feocDisqualified: boolean
  /** UFLPA forced labor risk flag */
  uflpaRisk: boolean
  /** BABA (Buy America Build America) eligible */
  babaEligible: boolean
  /** Tariff rate as percentage */
  tariffRatePct: number
  /** Origin country ISO code */
  originCountry: string | null
  /** Comparison: domestic alternative tariff rate */
  domesticAlternativeTariffPct: number | null
  /** Dollar amounts at a given price point */
  atPrice?: {
    price: number
    tariffDrain: number
    domesticRetention: number
    foreignLeakage: number
  }
  confidence: string
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
  capitalFlow: NormalizedCapitalFlow | null
  materialInsight: { headline: string; body: string } | null
  confidence: string
}

type SupabaseMaterialRow = {
  id: string
  material_name: string
  normalized_name: string | null
  petroload_score: number | null
  bio_based_flag: boolean | null
  petro_based_flag: boolean | null
  synthetic_flag: boolean | null
  default_confidence_score: number | null
}

type SupabaseAliasRow = {
  id: string
  material_id: string
  alias: string
  materials: SupabaseMaterialRow | SupabaseMaterialRow[] | null
}

type RankedMaterialMatch = {
  material: GraphMaterial
  rank: number
  source:
    | 'normalized_exact'
    | 'name_exact'
    | 'alias_exact'
    | 'name_prefix'
    | 'alias_prefix'
    | 'name_contains'
    | 'alias_contains'
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

function normalizeCompare(value: string | null | undefined): string {
  return (value ?? '')
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
    'fabric',
    'fabrics',
    'textile',
    'textiles',
  ])

  const tokens = normalized
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)

  const filteredTokens = tokens.filter((t) => !stopwords.has(t) && t.length > 2)

  const candidates = new Set<string>()

  if (normalized) candidates.add(normalized)

  for (const token of filteredTokens) {
    candidates.add(token)
  }

  for (let i = 0; i < filteredTokens.length - 1; i++) {
    const bigram = `${filteredTokens[i]} ${filteredTokens[i + 1]}`
    candidates.add(bigram)
  }

  return Array.from(candidates).slice(0, 6)
}

function rowToGraphMaterial(row: SupabaseMaterialRow): GraphMaterial {
  const petro = safePetroScore(row.petroload_score)

  return {
    material: row.material_name,
    risk: petro != null ? String(petro) : null,
    toxicity: null,
    lifecycle: null,
    bio_pure: row.bio_based_flag ?? null,
    alternatives: [],
  }
}

function scoreMaterialRow(row: SupabaseMaterialRow, candidate: string): RankedMaterialMatch | null {
  const materialName = normalizeCompare(row.material_name)
  const normalizedName = normalizeCompare(row.normalized_name)
  const c = normalizeCompare(candidate)

  if (!c) return null

  let rank = 0
  let source: RankedMaterialMatch['source'] | null = null

  if (normalizedName && normalizedName === c) {
    rank = 100
    source = 'normalized_exact'
  } else if (materialName === c) {
    rank = 95
    source = 'name_exact'
  } else if (normalizedName && normalizedName.startsWith(c)) {
    rank = 80
    source = 'name_prefix'
  } else if (materialName.startsWith(c)) {
    rank = 76
    source = 'name_prefix'
  } else if (normalizedName && normalizedName.includes(c)) {
    rank = 60
    source = 'name_contains'
  } else if (materialName.includes(c)) {
    rank = 55
    source = 'name_contains'
  } else {
    return null
  }

  if (c.length <= 4 && rank < 90) {
    rank -= 10
  }

  return {
    material: rowToGraphMaterial(row),
    rank,
    source,
  }
}

function scoreAliasRow(row: SupabaseAliasRow, candidate: string): RankedMaterialMatch | null {
  const mat = Array.isArray(row.materials) ? row.materials[0] : row.materials
  if (!mat?.material_name) return null

  const alias = normalizeCompare(row.alias)
  const c = normalizeCompare(candidate)

  if (!c || !alias) return null

  let rank = 0
  let source: RankedMaterialMatch['source'] | null = null

  if (alias === c) {
    rank = 92
    source = 'alias_exact'
  } else if (alias.startsWith(c)) {
    rank = 72
    source = 'alias_prefix'
  } else if (alias.includes(c)) {
    rank = 52
    source = 'alias_contains'
  } else {
    return null
  }

  if (c.length <= 4 && rank < 90) {
    rank -= 10
  }

  return {
    material: rowToGraphMaterial(mat),
    rank,
    source,
  }
}

async function resolveMaterialsFromSupabase(names: string[]): Promise<GraphMaterial[]> {
  if (!names.length) return []

  try {
    const supabase = await createSupabaseServerClient()
    const ranked = new Map<string, RankedMaterialMatch>()

    for (const candidate of names) {
      const normalizedCandidate = normalizeSearchText(candidate)
      if (!normalizedCandidate) continue

      const { data: materialRows } = await supabase
        .from('materials')
        .select(
          'id, material_name, normalized_name, petroload_score, bio_based_flag, petro_based_flag, synthetic_flag, default_confidence_score'
        )
        .or(
          [
            `normalized_name.ilike.${normalizedCandidate}`,
            `material_name.ilike.${normalizedCandidate}`,
            `normalized_name.ilike.${normalizedCandidate}%`,
            `material_name.ilike.${normalizedCandidate}%`,
            `normalized_name.ilike.%${normalizedCandidate}%`,
            `material_name.ilike.%${normalizedCandidate}%`,
          ].join(',')
        )
        .limit(20)

      if (Array.isArray(materialRows)) {
        for (const row of materialRows as SupabaseMaterialRow[]) {
          const scored = scoreMaterialRow(row, normalizedCandidate)
          if (!scored) continue

          const existing = ranked.get(scored.material.material)
          if (!existing || scored.rank > existing.rank) {
            ranked.set(scored.material.material, scored)
          }
        }
      }

      const { data: aliasRows } = await supabase
        .from('material_aliases')
        .select(
          `
          id,
          material_id,
          alias,
          materials (
            id,
            material_name,
            normalized_name,
            petroload_score,
            bio_based_flag,
            petro_based_flag,
            synthetic_flag,
            default_confidence_score
          )
        `
        )
        .or(
          [
            `alias.ilike.${normalizedCandidate}`,
            `alias.ilike.${normalizedCandidate}%`,
            `alias.ilike.%${normalizedCandidate}%`,
          ].join(',')
        )
        .limit(20)

      if (Array.isArray(aliasRows)) {
        for (const row of aliasRows as SupabaseAliasRow[]) {
          const scored = scoreAliasRow(row, normalizedCandidate)
          if (!scored) continue

          const existing = ranked.get(scored.material.material)
          if (!existing || scored.rank > existing.rank) {
            ranked.set(scored.material.material, scored)
          }
        }
      }
    }

    const sorted = Array.from(ranked.values()).sort((a, b) => b.rank - a.rank)
    const topRank = sorted[0]?.rank ?? 0

    const filtered = sorted.filter((item) => {
      if (item.rank >= 90) return true
      if (item.rank >= 75 && item.rank >= topRank - 12) return true
      if (item.rank >= 60 && item.rank >= topRank - 5 && sorted.length <= 3) return true
      return false
    })

    return filtered.slice(0, 5).map((item) => item.material)
  } catch (err) {
    console.error('Supabase material resolution failed:', err)
    return []
  }
}

async function enrichMaterialsFromNeo4j(names: string[]): Promise<GraphMaterial[]> {
  if (!names.length) return []

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
        { names }
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

/**
 * Fetch concern assessments directly for a list of material names.
 * Uses the get_concerns_for_materials RPC which does a proper SQL join.
 * Used when the RPC health_concerns is empty (e.g. search-originated products).
 */
export async function fetchConcernAssessmentsForMaterials(
  materialNames: string[]
): Promise<any[]> {
  if (!materialNames.length) return []
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('get_concerns_for_materials', {
      p_material_names: materialNames,
    })

    if (error || !data) return []
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Concern assessment fetch failed:', err)
    return []
  }
}

export async function enrichByMaterialNames(names: string[]): Promise<GraphMaterial[]> {
  if (!names.length) return []

  const expandedNames = Array.from(new Set(names.flatMap((name) => buildMaterialCandidates(name))))
  if (!expandedNames.length) return []

  const supabaseMatches = await resolveMaterialsFromSupabase(expandedNames)
  const neo4jMatches = await enrichMaterialsFromNeo4j(expandedNames)

  const merged = new Map<string, GraphMaterial>()

  for (const row of supabaseMatches) {
    merged.set(row.material, row)
  }

  for (const row of neo4jMatches) {
    const existing = merged.get(row.material)

    if (!existing) {
      merged.set(row.material, row)
      continue
    }

    merged.set(row.material, {
      material: row.material,
      risk: existing.risk ?? row.risk,
      toxicity: existing.toxicity ?? row.toxicity,
      lifecycle: existing.lifecycle ?? row.lifecycle,
      bio_pure: existing.bio_pure ?? row.bio_pure,
      alternatives: existing.alternatives.length ? existing.alternatives : row.alternatives,
    })
  }

  return Array.from(merged.values())
}

/**
 * Resolve capital flow / tariff data for a product.
 * Pulls from product_origin_profile, tariff_comparisons, and supply_chain_resilience_profile.
 */
async function resolveCapitalFlow(
  productId: string,
  displayPrice?: number | null,
  materialNames: string[] = []
): Promise<NormalizedCapitalFlow | null> {
  try {
    const supabase = await createSupabaseServerClient()

    // Get origin profile with tariff exposure
    const { data: originProfile } = await supabase
      .from('product_origin_profile')
      .select('*')
      .eq('product_id', productId)
      .single()

    // Get product country_of_origin from products table
    const { data: product } = await supabase
      .from('products')
      .select('country_of_origin, display_price')
      .eq('id', productId)
      .single()

    const price = displayPrice ?? product?.display_price ?? null
    const originCountry = product?.country_of_origin ?? null

    // Get tariff comparisons for this product's materials
    const { data: tariffComps } = await supabase
      .from('tariff_comparisons')
      .select('*')
      .limit(5)

    // Get supply chain resilience data
    const { data: resilience } = await supabase
      .from('supply_chain_resilience_profile')
      .select('*')
      .eq('product_id', productId)
      .single()

    // Calculate capital flow from available data
    const tariffPct = originProfile?.tariff_exposure_typical_pct
      ? Number(originProfile.tariff_exposure_typical_pct)
      : null

    // If no product-level tariff data, try material-based tariff lookup
    if (tariffPct === null && !tariffComps?.length && !originCountry && materialNames.length) {
      const { data: materialTariff } = await supabase.rpc('get_tariff_for_materials', {
        p_material_names: materialNames,
      })

      if (materialTariff && materialTariff.tariff_rate_pct != null) {
        const mt = materialTariff
        const mtTariffPct = Number(mt.tariff_rate_pct)
        return {
          tariffDrainPct: mtTariffPct / 100,
          domesticRetentionPct: mtTariffPct,
          foreignLeakagePct: Math.max(0, 100 - mtTariffPct),
          section301Applies: mt.section_301_applies ?? false,
          feocDisqualified: mt.feoc_disqualified ?? false,
          uflpaRisk: mt.uflpa_risk ?? false,
          babaEligible: mt.baba_eligible ?? false,
          tariffRatePct: mtTariffPct,
          originCountry: mt.origin_country ?? null,
          domesticAlternativeTariffPct: mt.domestic_rate_pct != null ? Number(mt.domestic_rate_pct) : null,
          confidence: 'inferred',
        }
      }
    }

    // If still no tariff data at all, return null
    if (tariffPct === null && !tariffComps?.length && !originCountry) {
      return null
    }

    const effectiveTariffPct = tariffPct ?? 0

    // Determine flags from tariff comparisons or origin
    let section301 = false
    let feocDisqualified = false
    let uflpaRisk = false
    let babaEligible = false
    let domesticAltTariff: number | null = null

    if (tariffComps?.length) {
      const foreignComp = tariffComps.find((c) => c.section_301_applies_b)
      if (foreignComp) {
        section301 = foreignComp.section_301_applies_b ?? false
        feocDisqualified = foreignComp.feoc_disqualified_b ?? false
        uflpaRisk = foreignComp.uflpa_risk_b ?? false
        babaEligible = foreignComp.baba_eligible_a ?? false
        domesticAltTariff = foreignComp.duty_rate_a != null ? Number(foreignComp.duty_rate_a) : null
      }
    }

    // Capital flow calculation:
    // If domestic (US): 100% retention, 0% leakage
    // If imported: tariff goes to govt, remainder to foreign supply chain
    const isDomestic = originCountry === 'US' || originCountry === 'United States'
    const domesticRetention = isDomestic ? 100 : Math.max(0, effectiveTariffPct)
    const foreignLeakage = isDomestic ? 0 : Math.max(0, 100 - effectiveTariffPct)

    const capitalFlow: NormalizedCapitalFlow = {
      tariffDrainPct: effectiveTariffPct / 100,
      domesticRetentionPct: isDomestic ? 100 : effectiveTariffPct,
      foreignLeakagePct: foreignLeakage,
      section301Applies: section301,
      feocDisqualified: feocDisqualified,
      uflpaRisk: uflpaRisk,
      babaEligible: babaEligible,
      tariffRatePct: effectiveTariffPct,
      originCountry,
      domesticAlternativeTariffPct: domesticAltTariff,
      confidence: originProfile ? 'estimated' : tariffComps?.length ? 'inferred' : 'limited',
    }

    // Add dollar amounts if we have a price
    if (price && price > 0) {
      capitalFlow.atPrice = {
        price,
        tariffDrain: isDomestic ? 0 : Math.round((price * effectiveTariffPct / 100) * 100) / 100,
        domesticRetention: isDomestic ? price : Math.round((price * effectiveTariffPct / 100) * 100) / 100,
        foreignLeakage: isDomestic ? 0 : Math.round((price * (100 - effectiveTariffPct) / 100) * 100) / 100,
      }
    }

    return capitalFlow
  } catch (err) {
    console.error('Capital flow resolution failed:', err)
    return null
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
        materialNames = mats
          .map((m: any) => m?.name ?? m?.material_name)
          .filter(Boolean)
      }
    }
  } catch {
    // RPC unavailable
  }

  // Run material enrichment first, then capital flow (needs material names)
  const graphMaterials = await enrichByMaterialNames(materialNames)

  // Resolve capital flow with material names as fallback for tariff lookup
  const allMaterialNames = graphMaterials.map((g) => g.material)
  const capitalFlow = await resolveCapitalFlow(productId, pi?.display_price, allMaterialNames)

  // If RPC didn't return health_concerns (no product_materials entries),
  // fetch concern assessments directly for the matched materials
  const rpcConcerns = Array.isArray(pi?.health_concerns) ? pi.health_concerns : []
  let directConcerns: any[] = []

  if (!rpcConcerns.length && graphMaterials.length) {
    directConcerns = await fetchConcernAssessmentsForMaterials(
      graphMaterials.map((g) => g.material)
    )
  }

  return normalizeIntelligence(pi, graphMaterials, capitalFlow, directConcerns)
}

export function normalizeIntelligence(
  pi: Record<string, any> | null,
  graphMaterials: GraphMaterial[],
  capitalFlow: NormalizedCapitalFlow | null = null,
  directConcerns: any[] = []
): EnrichedIntelligence {
  const rpcPetroScore =
    safePetroScore(pi?.material_profile?.petroload_score) ??
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
      const materialName = material.name ?? material.material_name
      if (!materialName) continue

      const graphMaterial = graphByName.get(materialName)

      const petro =
        riskToScore(graphMaterial?.risk) ??
        safePetroScore(material?.petroload_score) ??
        safePetroScore(material?.petroload_index) ??
        petroloadIndex

      const toxicity =
        graphMaterial?.toxicity ??
        (material?.toxicity_score != null ? Number(material.toxicity_score) : null)

      materials.push({
        name: materialName,
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

  // --- Health Effects: merge graph toxicity + RPC health_concerns ---
  let healthEffects: NormalizedHealth | null = null

  // Use material_profile toxicity if available from RPC
  const profileToxicity = pi?.material_profile?.toxicity_score != null
    ? Number(pi.material_profile.toxicity_score)
    : null

  const maxToxicity = graphMaterials.length
    ? Math.max(...graphMaterials.map((g) => g.toxicity ?? 0))
    : profileToxicity ?? (pi?.toxicity_score != null ? Number(pi.toxicity_score) : null)

  // Parse health_concerns from RPC (concern assessments) + merge direct concerns
  const rpcHealthConcerns: any[] = Array.isArray(pi?.health_concerns) ? pi.health_concerns : []
  const healthConcerns: any[] = rpcHealthConcerns.length ? rpcHealthConcerns : directConcerns

  // Derive boolean flags from concern codes
  const hasConcern = (code: string) =>
    healthConcerns.some((c) => c.concern_code === code && (c.concern_tier === 'high' || c.concern_tier === 'very_high'))

  if (maxToxicity !== null || healthConcerns.length || pi?.health_effects) {
    const hazard =
      maxToxicity !== null
        ? maxToxicity > 0.7
          ? 'high'
          : maxToxicity > 0.4
            ? 'moderate'
            : 'low'
        : healthConcerns.length
          ? healthConcerns.some((c) => c.concern_tier === 'high') ? 'high' : 'moderate'
          : riskToHazard(pi?.risk_level)

    const he = pi?.health_effects as any

    // Build exposure pathways from concern domains
    const exposurePathways: Array<{ type: string; risk: 'low' | 'moderate' | 'high'; notes?: string }> = []
    const pathwayMap: Record<string, string> = {
      dermal_contact: 'dermal',
      inhalation: 'inhalation',
      ingestion_adjacency: 'ingestion',
    }
    for (const concern of healthConcerns) {
      const pathway = pathwayMap[concern.concern_code]
      if (pathway) {
        exposurePathways.push({
          type: pathway,
          risk: concern.concern_tier === 'high' ? 'high' : 'moderate',
        })
      }
    }

    // Build chemical flags from high-tier concerns
    const chemicalFlags = healthConcerns
      .filter((c) => c.concern_tier === 'high')
      .map((c) => c.concern_name as string)
      .slice(0, 5)

    // When we have concern data, derive booleans. When no data, leave null.
    const hasData = healthConcerns.length > 0
    const edFlag = hasData ? hasConcern('endocrine_disruption') : (he?.endocrine_disruption ?? null)
    const carcFlag = hasData ? hasConcern('carcinogenicity') : (he?.carcinogenicity ?? null)
    const leachFlag = hasData
      ? (hasConcern('plasticizer') || hasConcern('persistent_chemical') || hasConcern('microplastic_shedding'))
      : (he?.leachate_risk ?? null)

    healthEffects = {
      hazardSignal: hazard,
      endocrineDisruption: edFlag,
      carcinogenicity: carcFlag,
      leachateRisk: leachFlag,
      chemicalFlags: chemicalFlags.length ? chemicalFlags : (he?.chemical_flags ?? []),
      exposurePathways: exposurePathways.length ? exposurePathways : (he?.exposure_pathways ?? []),
      confidence: healthConcerns.length ? 'estimated' : graphMaterials.length ? 'inferred' : 'estimated',
      evidenceAvailable: healthConcerns.length > 0 || graphMaterials.length > 0,
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

    const score =
      toLabelScale(rpcLifecycle?.composite_score) ??
      toLabelScale(averageLifecycle) ??
      0

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
        safePetroScore(alt?.petroload_score) ??
        safePetroScore(alt?.petroload_index)

      alternatives.push({
        id: String(alt.id ?? alt.material_id ?? alternatives.length),
        name: alt.name ?? alt.alternative_material_name ?? alt.material_name ?? 'Unknown',
        material: alt.material ?? alt.material_class ?? undefined,
        petroloadImprovement:
          alt.petroload_improvement ??
          Math.max(0, (petroloadIndex ?? 0) - (altPetro ?? 0)),
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
    capitalFlow,
    materialInsight,
    confidence: graphMaterials.length > 0 ? (pi ? 'estimated' : 'inferred') : 'limited',
  }
}
