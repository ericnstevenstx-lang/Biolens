// ── Supabase product intelligence payload ────────────────────────────────────

export interface ProductMaterial {
  name: string
  role: string | null
  confidence: number
  is_primary: boolean
  percentage: number | null
  petro_based: boolean
  bio_based: boolean
  petroload_score: number | null
  material_class: string | null
}

export interface MaterialProfile {
  bio_content_pct: number | null
  petro_content_pct: number | null
  petroload_score: number | null
  overall_health_score: number | null
  microplastic_risk: number | null
  toxicity_score: number | null
  biodegradability_score: number | null
  confidence: number | null
}

export interface ImpactProfile {
  domestic_value_support: number | null
  total_jobs_support: number | null
  carbon_proxy: number | null
  microplastic_avoidance: number | null
  petro_displacement: number | null
  trust_score: number | null
  transparency_score: number | null
  transparency_grade: string | null
}

export interface LifecycleMaterial {
  material_name: string
  composite_score: number | null
  biodegradability: number | null
  compostability: number | null
  recyclability: number | null
  circular_recovery: number | null
  microplastic_risk: number | null
  landfill_persistence: number | null
  environmental_accumulation: number | null
}

export interface ToxicityMaterial {
  material_name: string
  exposure_tier: string | null
  overall_concern: number | null
  highest_concern_dimension: string | null
  highest_concern_status: string | null
  evidence_quality_tier: string | null
  framework_tier: string | null
  consumer_summary: string | null
  concern_counts: {
    very_high: number
    high: number
    moderate: number
    low: number
  }
}

export interface PurchaseSource {
  name: string
  url: string
  type: string
  is_fiberfoundry: boolean
}

export interface SupabaseProductIntelligence {
  product: {
    id: string
    title: string
    brand: string | null
    barcode: string | null
    category: string | null
    subcategory: string | null
    manufacturer: string | null
  }
  materials: ProductMaterial[]
  material_profile: MaterialProfile | null
  impact_profile: ImpactProfile | null
  origin: Record<string, unknown> | null
  lifecycle: LifecycleMaterial[]
  toxicity: ToxicityMaterial[]
  purchase_sources: PurchaseSource[]
  error?: string
}

// ── Neo4j graph intelligence payload ─────────────────────────────────────────

export interface GraphMaterialRisk {
  material_name: string
  overall_risk_score: number | null
  toxicity_score: number | null
  lifecycle_score: number | null
  supply_chain_resilience: number | null
  feoc_flag: boolean
  sanctions_flag: boolean
  tariff_risk_score: number | null
  confidence_score: number | null
  confidence_trend: 'rising' | 'stable' | 'declining' | null
  better_alternatives: string[]
}

export interface GraphSupplyChainOrigin {
  path: string
  facility_id: string | null
  facility_name: string | null
  feoc_status: string | null
  country: string | null
  country_name: string | null
  sovereign_risk: number | null
  labor_risk: number | null
  corporate: string | null
  ofac_listed: boolean | null
  entity_list_status: string | null
}

export interface GraphAlternative {
  original_material: string
  alternative_material: string
  alt_class: string | null
  alt_type: 'curated' | 'inferred'
  reason: string
  similarity: number
  performance_delta: number | null
  cost_delta_pct: number | null
  availability: string
  marketplace_sku: string | null
  toxicity_improvement: number
  carbon_improvement: number
  composite_score: number
}

export interface GraphIntelligence {
  material_risk: GraphMaterialRisk[]
  supply_chain: GraphSupplyChainOrigin[]
  alternatives: GraphAlternative[]
  feoc_alert: boolean
  sanctions_alert: boolean
}

// ── Unified scan result ───────────────────────────────────────────────────────

export interface ScanResult {
  barcode: string
  resolved_at: string
  source: 'cache' | 'live'
  product: SupabaseProductIntelligence | null
  graph: GraphIntelligence | null
  error?: string
}

// ── Scan request ──────────────────────────────────────────────────────────────

export interface ScanRequest {
  barcode: string
  user_id?: string
  geo_scope?: string
}
