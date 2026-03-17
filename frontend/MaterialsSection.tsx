import { withNeo4jSession } from './client'
import type {
  GraphIntelligence,
  GraphMaterialRisk,
  GraphSupplyChainOrigin,
  GraphAlternative,
} from '@/types'

// ── Material names → risk ledger scores ──────────────────────────────────────

const MATERIAL_RISK_QUERY = `
UNWIND $material_names AS mname
MATCH (m:Material)
WHERE toLower(m.name) = toLower(mname)
OPTIONAL MATCH (m)-[:HAS_CURRENT_LEDGER]->(mrl:MaterialRiskLedger)
OPTIONAL MATCH (mrl)-[:POINTS_TO_BETTER_ALTERNATIVE]->(alt:Material)
RETURN
  m.name                                  AS material_name,
  mrl.overall_material_risk_score         AS overall_risk_score,
  mrl.toxicity_score                      AS toxicity_score,
  mrl.lifecycle_score                     AS lifecycle_score,
  mrl.supply_chain_resilience_score       AS supply_chain_resilience,
  mrl.feoc_flag                           AS feoc_flag,
  mrl.sanctions_flag                      AS sanctions_flag,
  mrl.tariff_risk_score                   AS tariff_risk_score,
  mrl.confidence_score                    AS confidence_score,
  mrl.confidence_trend                    AS confidence_trend,
  collect(DISTINCT alt.name)              AS better_alternatives
`

// ── Product barcode → supply chain origins ────────────────────────────────────

const SUPPLY_CHAIN_QUERY = `
MATCH (p:Product {barcode: $barcode})
OPTIONAL MATCH (p)-[:MANUFACTURED_BY]->(s1:Supplier)-[:CORPORATE_OWNER]->(pe1:ParentEntity)
OPTIONAL MATCH (s1)<-[:OPERATED_BY]-(f1:Facility)-[:LOCATED_IN]->(:Region)-[:PART_OF]->(c1:Country)
OPTIONAL MATCH (p)-[:HAS_VERSION {current:true}]->(pv:ProductVersion)
OPTIONAL MATCH (pv)-[:CONTAINS]->(:MaterialInstance)-[:INSTANCE_OF]->(m:Material)
              -[:SOURCED_FROM_FACILITY]->(f2:Facility)-[:LOCATED_IN]->(:Region)-[:PART_OF]->(c2:Country)
OPTIONAL MATCH (m)-[:SUPPLIED_BY]->(s2:Supplier)-[:CORPORATE_OWNER]->(pe2:ParentEntity)
OPTIONAL MATCH (s2)<-[:OPERATED_BY]-(f3:Facility)-[:LOCATED_IN]->(:Region)-[:PART_OF]->(c3:Country)
WITH
  collect(DISTINCT {
    path: 'manufacturer',
    facility_id: f1.facility_id, facility_name: f1.name,
    feoc_status: f1.feoc_status,
    country: c1.iso_code, country_name: c1.name,
    sovereign_risk: c1.sovereign_risk_score, labor_risk: c1.labor_risk_score,
    corporate: pe1.legal_name, ofac_listed: pe1.ofac_listed,
    entity_list_status: pe1.entity_list_status
  }) +
  collect(DISTINCT {
    path: 'material_source',
    facility_id: f2.facility_id, facility_name: f2.name,
    feoc_status: f2.feoc_status,
    country: c2.iso_code, country_name: c2.name,
    sovereign_risk: c2.sovereign_risk_score, labor_risk: c2.labor_risk_score,
    corporate: null, ofac_listed: null, entity_list_status: null
  }) +
  collect(DISTINCT {
    path: 'tier2_supplier',
    facility_id: f3.facility_id, facility_name: f3.name,
    feoc_status: f3.feoc_status,
    country: c3.iso_code, country_name: c3.name,
    sovereign_risk: c3.sovereign_risk_score, labor_risk: c3.labor_risk_score,
    corporate: pe2.legal_name, ofac_listed: pe2.ofac_listed,
    entity_list_status: pe2.entity_list_status
  }) AS all_origins
UNWIND all_origins AS origin
WHERE origin.facility_id IS NOT NULL
RETURN origin
ORDER BY
  CASE origin.feoc_status WHEN 'restricted' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END,
  CASE origin.entity_list_status WHEN 'listed' THEN 0 WHEN 'pending_review' THEN 1 ELSE 2 END
`

// ── Material names → alternative materials ────────────────────────────────────

const ALTERNATIVES_QUERY = `
UNWIND $material_names AS mname
MATCH (m:Material)
WHERE toLower(m.name) = toLower(mname)
MATCH (m)-[:HAS_ALTERNATIVE]->(a:Alternative)-[:SUBSTITUTES]->(alt:Material)
WHERE a.availability IN ['commercial', 'emerging'] AND a.similarity_score >= 0.5
OPTIONAL MATCH (m)-[:HAS_CLAIM_SUMMARY]->(src_tox:ClaimSummary)
WHERE src_tox.claim_type = 'toxicity'
OPTIONAL MATCH (alt)-[:HAS_CLAIM_SUMMARY]->(alt_tox:ClaimSummary)
WHERE alt_tox.claim_type = 'toxicity'
OPTIONAL MATCH (m)-[:HAS_LIFECYCLE]->(src_lp:LifecycleProfile)
WHERE src_lp.geographic_scope = 'global'
OPTIONAL MATCH (alt)-[:HAS_LIFECYCLE]->(alt_lp:LifecycleProfile)
WHERE alt_lp.geographic_scope = 'global'
WITH m, a, alt, src_tox, alt_tox, src_lp, alt_lp,
     coalesce(src_tox.confidence, 0.0)            AS st,
     coalesce(alt_tox.confidence, 0.0)            AS at,
     coalesce(src_lp.carbon_footprint_kgco2, 0.0) AS sc,
     coalesce(alt_lp.carbon_footprint_kgco2, 0.0) AS ac
WITH m, a, alt, alt_lp, st, at, sc, ac,
     CASE WHEN st > at THEN round(st - at, 4) ELSE 0.0 END AS tox_delta,
     CASE WHEN sc > 0
          THEN round(toFloat(sc - ac) / sc, 4)
          ELSE 0.0 END AS carbon_improvement,
     CASE a.alternative_type WHEN 'curated' THEN 0 ELSE 1 END AS type_rank
RETURN
  m.name                            AS original_material,
  alt.name                          AS alternative_material,
  alt.material_class                AS alt_class,
  a.alternative_type                AS alt_type,
  a.reason                          AS reason,
  a.similarity_score                AS similarity,
  a.performance_delta               AS performance_delta,
  a.cost_delta_pct                  AS cost_delta_pct,
  a.availability                    AS availability,
  a.marketplace_sku                 AS marketplace_sku,
  tox_delta                         AS toxicity_improvement,
  carbon_improvement,
  round(
    (0.40 * a.similarity_score) +
    (0.35 * tox_delta) +
    (0.25 * CASE WHEN carbon_improvement > 0 THEN carbon_improvement ELSE 0.0 END),
  4) AS composite_score
ORDER BY type_rank ASC, composite_score DESC
LIMIT 10
`

// ── Public API ────────────────────────────────────────────────────────────────

export async function getGraphIntelligence(
  barcode: string,
  materialNames: string[]
): Promise<GraphIntelligence> {
  return withNeo4jSession(async (session) => {
    // Run all three queries in parallel
    const [riskResult, supplyResult, altResult] = await Promise.all([
      materialNames.length > 0
        ? session.run(MATERIAL_RISK_QUERY, { material_names: materialNames })
        : Promise.resolve({ records: [] }),
      session.run(SUPPLY_CHAIN_QUERY, { barcode }),
      materialNames.length > 0
        ? session.run(ALTERNATIVES_QUERY, { material_names: materialNames })
        : Promise.resolve({ records: [] }),
    ])

    // Parse material risk
    const materialRisk: GraphMaterialRisk[] = riskResult.records.map((r) => ({
      material_name:          r.get('material_name'),
      overall_risk_score:     toNumber(r.get('overall_risk_score')),
      toxicity_score:         toNumber(r.get('toxicity_score')),
      lifecycle_score:        toNumber(r.get('lifecycle_score')),
      supply_chain_resilience: toNumber(r.get('supply_chain_resilience')),
      feoc_flag:              r.get('feoc_flag') === true,
      sanctions_flag:         r.get('sanctions_flag') === true,
      tariff_risk_score:      toNumber(r.get('tariff_risk_score')),
      confidence_score:       toNumber(r.get('confidence_score')),
      confidence_trend:       r.get('confidence_trend') ?? null,
      better_alternatives:    r.get('better_alternatives') ?? [],
    }))

    // Parse supply chain origins
    const supplyChain: GraphSupplyChainOrigin[] = supplyResult.records
      .map((r) => {
        const o = r.get('origin')
        return {
          path:               o.path ?? '',
          facility_id:        o.facility_id ?? null,
          facility_name:      o.facility_name ?? null,
          feoc_status:        o.feoc_status ?? null,
          country:            o.country ?? null,
          country_name:       o.country_name ?? null,
          sovereign_risk:     toNumber(o.sovereign_risk),
          labor_risk:         toNumber(o.labor_risk),
          corporate:          o.corporate ?? null,
          ofac_listed:        o.ofac_listed ?? null,
          entity_list_status: o.entity_list_status ?? null,
        }
      })
      .filter((o) => o.facility_id)

    // Parse alternatives
    const alternatives: GraphAlternative[] = altResult.records.map((r) => ({
      original_material:   r.get('original_material'),
      alternative_material: r.get('alternative_material'),
      alt_class:           r.get('alt_class') ?? null,
      alt_type:            r.get('alt_type') as 'curated' | 'inferred',
      reason:              r.get('reason'),
      similarity:          toNumber(r.get('similarity')) ?? 0,
      performance_delta:   toNumber(r.get('performance_delta')),
      cost_delta_pct:      toNumber(r.get('cost_delta_pct')),
      availability:        r.get('availability'),
      marketplace_sku:     r.get('marketplace_sku') ?? null,
      toxicity_improvement: toNumber(r.get('toxicity_improvement')) ?? 0,
      carbon_improvement:   toNumber(r.get('carbon_improvement')) ?? 0,
      composite_score:     toNumber(r.get('composite_score')) ?? 0,
    }))

    const feoc_alert     = materialRisk.some((m) => m.feoc_flag) ||
                           supplyChain.some((o) => o.feoc_status === 'restricted')
    const sanctions_alert = materialRisk.some((m) => m.sanctions_flag) ||
                            supplyChain.some((o) => o.ofac_listed === true)

    return { material_risk: materialRisk, supply_chain: supplyChain, alternatives, feoc_alert, sanctions_alert }
  })
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  // Neo4j Integer or Float objects
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber()
  }
  const n = Number(val)
  return isNaN(n) ? null : n
}
