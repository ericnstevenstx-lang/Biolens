import { supabase } from "./supabase";

// ─── Utility helpers (Enhanced) ────────────────────────────────

export function getConfidenceLabel(score) {
  if (score == null) return "Preliminary Match";
  if (score >= 0.95) return "High Confidence";
  if (score >= 0.85) return "Moderate Confidence";
  if (score >= 0.70) return "Estimated Profile";
  return "Preliminary Match";
}

export function getPetroloadLevel(score) {
  if (score == null) return { label: "Unknown", color: "#86868B" };
  // Handle both 0-1 and 0-100 scales for compatibility
  const normalizedScore = score > 1 ? score / 100 : score;
  if (normalizedScore <= 0.25) return { label: "Low", color: "#22C55E" };
  if (normalizedScore <= 0.50) return { label: "Moderate", color: "#EAB308" };
  if (normalizedScore <= 0.75) return { label: "High", color: "#F97316" };
  return { label: "Very High", color: "#EF4444" };
}

export function getCategoryClass(materialClass) {
  if (!materialClass) return "cat-mixed";
  const lc = materialClass.toLowerCase();
  if (lc.includes("petro")) return "cat-petro";
  if (lc.includes("plant")) return "cat-plant";
  if (lc.includes("transition")) return "cat-transition";
  if (lc.includes("natural")) return "cat-natural";
  if (lc.includes("mineral")) return "cat-mineral";
  return "cat-mixed";
}

export function getRiskConfig(riskLevel) {
  if (!riskLevel) return null;
  const lc = riskLevel.toLowerCase();
  if (lc === "high") return { className: "risk-high", label: "High Petro-Risk" };
  if (lc === "medium") return { className: "risk-medium", label: "Medium Petro-Risk" };
  if (lc === "low") return { className: "risk-low", label: "Low Petro-Risk" };
  return null;
}

function buildExplanation(row) {
  const explanation = row.explanation || "";
  if (explanation.length > 40 && !explanation.toLowerCase().includes("match") && !explanation.toLowerCase().includes("alias")) {
    return explanation;
  }
  const name = row.material_name || "This material";
  const cls = row.material_class || "Unknown";
  const map = {
    "Petro-Based": `${name} is a petroleum-derived material. It depends on fossil fuel feedstocks and may contribute to microplastic pollution and environmental persistence.`,
    "Plant-Based": `${name} is a plant-based material derived from renewable natural sources. It typically has a lower environmental footprint than petroleum-based alternatives.`,
    "Transition Material": `${name} is a transition material that starts from natural sources but undergoes significant chemical processing.`,
    "Natural Material": `${name} is a natural material sourced from renewable or naturally occurring resources. It is generally biodegradable with lower environmental impact.`,
    "Mineral Material": `${name} is a mineral-based material. It is typically durable, recyclable, and has low environmental toxicity.`,
  };
  return map[cls] || `${name} is classified as ${cls}.`;
}

function pct(val) { return val != null ? Math.round(val * 100) : null; }

// ═══════════════════════════════════════════════════════════════
// ✅ ENHANCED AUTOCOMPLETE (Powers Your SearchBar)
// ═══════════════════════════════════════════════════════════════

export async function fetchAutocomplete(query, limit = 6) {
  if (!query || query.trim().length < 2) return [];

  try {
    // ✨ Try enhanced search first (fuzzy matching + alternatives)
    const { data: enhancedData, error: enhancedError } = await supabase.rpc(
      'search_materials_with_alternatives',
      {
        search_term: query.trim(),
        limit_count: limit
      }
    );

    if (!enhancedError && enhancedData && enhancedData.length > 0) {
      // Transform to match your SearchBar's expected format
      return enhancedData.map((material) => ({
        label: material.material_name,
        type: "material",
        materialName: material.material_name,
        materialId: material.id,
        // ✨ NEW: Enhanced data for better UI
        petroloadScore: material.petroload_score,
        alternativesCount: material.alternatives_count || 0,
        matchType: material.match_type,
        materialFamily: material.material_family,
      }));
    }
  } catch (enhancedErr) {
    console.warn("Enhanced autocomplete unavailable, using fallback:", enhancedErr);
  }

  // Graceful fallback to your original autocomplete
  try {
    const { data, error } = await supabase.rpc("search_biolens_autocomplete", {
      user_query: query,
      p_limit: limit,
    });
    
    if (error) {
      console.error("Autocomplete error:", error);
      return [];
    }
    
    return (data || []).map((s) => ({
      label: s.suggestion_label,
      type: s.suggestion_type,
      materialName: s.material_name,
      materialId: s.material_id,
    }));
  } catch (fallbackErr) {
    console.error("Fallback autocomplete failed:", fallbackErr);
    return [];
  }
}

// ─── Primary Scan (Maintained for Compatibility) ───────────────

export async function searchBioLens(query) {
  const { data, error } = await supabase.rpc("search_biolens_scan_enriched", { user_query: query });
  if (error) throw new Error(error.message || "Search failed");
  if (!data || data.length === 0) return null;

  const grouped = {};
  for (const row of data) {
    const mid = row.material_id;
    if (!grouped[mid]) grouped[mid] = { primary: row, alternatives: [] };
    if (row.alternative_material) {
      grouped[mid].alternatives.push({
        name: row.alternative_material,
        materialClass: row.alternative_class,
        risk: row.alternative_risk,
        reason: row.replacement_reason,
        priority: row.alternative_priority,
      });
    }
  }

  const first = Object.values(grouped)[0];
  const p = first.primary;

  const seen = new Set();
  const alts = first.alternatives
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .filter((a) => { if (seen.has(a.name)) return false; seen.add(a.name); return true; });

  return {
    materialName: p.material_name,
    normalizedName: p.normalized_name,
    materialClass: p.material_class,
    riskLevel: p.risk_level,
    matchedText: p.matched_text,
    petroloadScore: pct(p.petroload_score) ?? (({ High: 72, Medium: 42, Low: 15 })[p.risk_level] || null),
    healthScore: pct(p.overall_material_health_score),
    confidenceScore: p.confidence_score,
    explanation: buildExplanation(p),
    alternatives: alts,
    // Risk signal scores (0-100)
    pesticideRisk: pct(p.pesticide_risk_score),
    herbicideRisk: pct(p.herbicide_risk_score),
    syntheticFertilizerRisk: pct(p.synthetic_fertilizer_risk_score),
    petroAgDependency: pct(p.petro_ag_dependency_score),
    soilRegeneration: pct(p.soil_regeneration_score),
    biodiversity: pct(p.biodiversity_score),
    irrigationIntensity: pct(p.irrigation_intensity_score),
    processingChemicalRisk: pct(p.processing_chemical_risk_score),
  };
}

// ═══════════════════════════════════════════════════════════════
// ✅ NEW ENHANCED FUNCTIONS (Available for Future Use)
// ═══════════════════════════════════════════════════════════════

/**
 * 🔍 Enhanced material search for dedicated search pages
 */
export async function searchMaterialsEnhanced(query, limit = 12) {
  if (!query || query.trim() === '') {
    return getFeaturedMaterials(limit);
  }

  try {
    const { data, error } = await supabase.rpc('search_materials_with_alternatives', {
      search_term: query.trim(),
      limit_count: limit
    });

    if (error) {
      console.error('Enhanced search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

/**
 * 📄 Get complete material details with alternatives
 */
export async function getMaterialWithAlternatives(materialId) {
  if (!materialId) return null;

  try {
    const { data, error } = await supabase.rpc('get_material_with_alternatives', {
      material_uuid: materialId
    });

    if (error) {
      console.error('Material details error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Material details failed:', error);
    return null;
  }
}

/**
 * ⭐ Get featured high-impact materials
 */
export async function getFeaturedMaterials(limit = 6) {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select(`
        id,
        material_name,
        material_family,
        petroload_score,
        biodegradability_score,
        toxicity_score,
        consumer_facing_summary,
        risk_level
      `)
      .gt('petroload_score', 0.8)
      .not('consumer_facing_summary', 'is', null)
      .order('petroload_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return (data || []).map(material => ({
      ...material,
      alternatives_count: 0,
      match_type: 'featured'
    }));
  } catch (error) {
    console.error('Featured materials error:', error);
    return [];
  }
}

/**
 * 🎨 Get impact level styling from petroload score
 */
export function getImpactLevel(score) {
  if (score == null) {
    return { text: 'Unknown', level: 'unknown', class: 'bg-gray-500 text-white', color: '#86868B' };
  }
  
  if (score >= 0.8) {
    return { text: 'High Impact', level: 'high', class: 'bg-red-500 text-white', color: '#EF4444' };
  }
  
  if (score >= 0.5) {
    return { text: 'Medium Impact', level: 'medium', class: 'bg-yellow-500 text-white', color: '#F59E0B' };
  }
  
  return { text: 'Low Impact', level: 'low', class: 'bg-green-500 text-white', color: '#10B981' };
}

/**
 * 📊 Format score as percentage
 */
export function formatScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score * 100)}%`;
}

// ─── Alternative Products (Maintained) ─────────────────────────

export async function fetchAlternativeProducts(query, limit = 6) {
  const { data, error } = await supabase.rpc("get_best_alternative_products_for_query", {
    user_query: query, p_limit: limit,
  });
  if (error) { console.error("Alt products error:", error); return []; }
  if (!data) return [];

  return data.map((p) => ({
    productId: p.product_id,
    title: p.product_title,
    brand: p.brand_name,
    category: p.category_name,
    price: p.display_price,
    transparencyScore: p.transparency_score,
    transparencyGrade: p.transparency_grade,
    petroloadScore: pct(p.petroload_score),
    trustScore: p.trust_score,
    purchaseUrl: p.purchase_url,
    alternativeMaterial: p.alternative_material_name,
    replacementReason: p.replacement_reason,
    isFiberFoundry: p.purchase_url?.includes("fiberfoundry"),
  }));
}

// ─── Product Purchase Sources ──────────────────────────────────

export async function fetchProductSources(productId) {
  const { data, error } = await supabase.rpc("get_product_purchase_sources", { p_product_id: productId });
  if (error) { console.error("Sources error:", error); return []; }
  return data || [];
}

// ─── Global Impact Counters ────────────────────────────────────

export async function fetchGlobalImpact() {
  const { data, error } = await supabase.rpc("get_global_impact_counters");
  if (error) { console.error("Impact counters error:", error); return null; }
  return data && data.length > 0 ? data[0] : null;
}

// ─── Scan History (localStorage) ───────────────────────────────

const HISTORY_KEY = "biolens_scan_history";
const MAX_HISTORY = 20;

export function getScanHistory() {
  try { const r = localStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function saveScanToHistory(query, result) {
  if (!result) return;
  const history = getScanHistory();
  const entry = {
    id: Date.now().toString(), query,
    materialName: result.materialName, materialClass: result.materialClass,
    riskLevel: result.riskLevel, petroloadScore: result.petroloadScore,
    healthScore: result.healthScore, timestamp: new Date().toISOString(),
  };
  const filtered = history.filter((h) => h.query.toLowerCase() !== query.toLowerCase());
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function clearScanHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}
