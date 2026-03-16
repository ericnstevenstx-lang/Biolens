// BioLens service layer
// All communication with Supabase edge functions lives here.
// Components never call edge functions directly.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function edgeUrl(slug) {
  return `${SUPABASE_URL}/functions/v1/${slug}`;
}

async function callEdge(slug, body) {
  const res = await fetch(edgeUrl(slug), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Edge function ${slug} returned ${res.status}`);
  }
  return res.json();
}

// ── Scan a barcode ────────────────────────────────────────────────────────────
// Returns: { barcode, title, brand, description, category, source,
//            observation_id, input_tokens, origin_intelligence }
export async function scanBarcode(barcode, userId = null, sessionId = null) {
  return callEdge('scan-product', { barcode, user_id: userId, session_id: sessionId });
}

// ── Analyze a material or product query ──────────────────────────────────────
// Returns: { query, found, material_id, material_name, material_class,
//            framework_tier, petroload_score, risk_level, risk_label, risk_color,
//            overall_material_health_score, confidence_score, match_source,
//            pesticide_risk_score, petro_ag_dependency_score,
//            processing_chemical_risk_score, explanation,
//            alternatives: [...],
//            lifecycle: { available, composite_score, recyclability_score, ... },
//            exposure: { available, exposure_tier, overall_concern, ... },
//            has_fiberfoundry_products }
export async function analyzeMaterial(query) {
  return callEdge('analyze-material', { query });
}

// ── Analyze multiple tokens and return all that resolved ─────────────────────
// Runs analyze-material in parallel for each token, deduplicates by material_id.
export async function analyzeTokens(tokens = []) {
  if (!tokens || tokens.length === 0) return [];

  const results = await Promise.allSettled(
    tokens.map(token => analyzeMaterial(token))
  );

  const seen = new Set();
  const resolved = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const data = result.value;
    if (!data.found || !data.material_id) continue;
    if (seen.has(data.material_id)) continue;
    seen.add(data.material_id);
    resolved.push(data);
  }

  // Sort: highest concern first, then by petroload score
  return resolved.sort((a, b) => {
    const scoreA = a.petroload_score ?? 0;
    const scoreB = b.petroload_score ?? 0;
    return scoreB - scoreA;
  });
}
