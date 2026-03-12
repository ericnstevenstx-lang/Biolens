import { supabase } from "./supabase";

/**
 * Convert numeric confidence to human label.
 */
export function getConfidenceLabel(score) {
  if (score == null) return "Needs Review";
  if (score >= 0.95) return "Verified";
  if (score >= 0.85) return "Strong Match";
  if (score >= 0.70) return "Likely Match";
  return "Needs Review";
}

/**
 * Get petroload severity label and color from 0-100 score.
 */
export function getPetroloadLevel(score) {
  if (score == null) return { label: "Unknown", color: "#86868B" };
  if (score <= 15) return { label: "Very Low", color: "#15803d" };
  if (score <= 35) return { label: "Low", color: "#22c55e" };
  if (score <= 55) return { label: "Moderate", color: "#F59E0B" };
  if (score <= 75) return { label: "High", color: "#EA580C" };
  return { label: "Very High", color: "#BE123C" };
}

/**
 * Map material_class to CSS category class.
 */
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

/**
 * Map risk_level string to risk badge config.
 */
export function getRiskConfig(riskLevel) {
  if (!riskLevel) return null;
  const lc = riskLevel.toLowerCase();
  if (lc === "high") return { className: "risk-high", label: "High Petro-Risk" };
  if (lc === "medium") return { className: "risk-medium", label: "Medium Petro-Risk" };
  if (lc === "low") return { className: "risk-low", label: "Low Petro-Risk" };
  return null;
}

/**
 * Generate a meaningful explanation if the Supabase one is a match-type label.
 */
function buildExplanation(row) {
  const explanation = row.explanation || "";
  if (
    explanation.length > 40 &&
    !explanation.toLowerCase().includes("match") &&
    !explanation.toLowerCase().includes("alias")
  ) {
    return explanation;
  }

  const name = row.material_name || "This material";
  const cls = row.material_class || "Unknown";

  const classDescriptions = {
    "Petro-Based": `${name} is a petroleum-derived material. It depends on fossil fuel feedstocks and may contribute to microplastic pollution and environmental persistence.`,
    "Plant-Based": `${name} is a plant-based material derived from renewable natural sources. It typically has a lower environmental footprint than petroleum-based alternatives.`,
    "Transition Material": `${name} is a transition material that starts from natural sources but undergoes significant chemical processing. It sits between fully natural and fully synthetic materials.`,
    "Natural Material": `${name} is a natural material sourced from renewable or naturally occurring resources. It is generally biodegradable and has lower environmental impact.`,
    "Mineral Material": `${name} is a mineral-based material. It is typically durable, recyclable, and has low environmental toxicity compared to petroleum-based plastics.`,
  };

  return classDescriptions[cls] || `${name} is classified as ${cls}.`;
}

/**
 * Search BioLens via Supabase RPC (enriched function).
 * Uses search_biolens_scan_enriched which returns additional health scores.
 * Groups rows by material_id before returning.
 */
export async function searchBioLens(query) {
  const { data, error } = await supabase.rpc("search_biolens_scan_enriched", {
    user_query: query,
  });

  if (error) {
    console.error("Supabase RPC error:", error);
    throw new Error(error.message || "Search failed");
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Group rows by material_id (each row = same material + one alternative)
  const grouped = {};
  for (const row of data) {
    const mid = row.material_id;
    if (!grouped[mid]) {
      grouped[mid] = { primary: row, alternatives: [] };
    }
    if (row.alternative_material) {
      grouped[mid].alternatives.push({
        name: row.alternative_material,
        materialClass: row.alternative_class,
        reason: row.replacement_reason,
        priority: row.alternative_priority,
      });
    }
  }

  // Use the first material group as the result
  const firstGroup = Object.values(grouped)[0];
  const primary = firstGroup.primary;

  // Convert petroload: Supabase returns 0-1 scale, we need 0-100
  let petroloadScore = null;
  if (primary.petroload_score != null) {
    petroloadScore = Math.round(primary.petroload_score * 100);
  } else {
    const riskDefaults = { High: 72, Medium: 42, Low: 15 };
    petroloadScore = riskDefaults[primary.risk_level] || null;
  }

  // Overall material health score (0-1 from enriched, convert to 0-100)
  let healthScore = null;
  if (primary.overall_material_health_score != null) {
    healthScore = Math.round(primary.overall_material_health_score * 100);
  }

  // Deduplicate and sort alternatives
  const seen = new Set();
  const uniqueAlts = firstGroup.alternatives
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .filter((alt) => {
      if (seen.has(alt.name)) return false;
      seen.add(alt.name);
      return true;
    });

  return {
    materialName: primary.material_name,
    normalizedName: primary.normalized_name,
    materialClass: primary.material_class,
    riskLevel: primary.risk_level,
    petroloadScore,
    healthScore,
    confidenceScore: primary.confidence_score,
    explanation: buildExplanation(primary),
    alternatives: uniqueAlts,
  };
}

// ─── Scan History (localStorage) ───────────────────────────────────────────

const HISTORY_KEY = "biolens_scan_history";
const MAX_HISTORY = 20;

/**
 * Get scan history from localStorage.
 */
export function getScanHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a scan result to history.
 */
export function saveScanToHistory(query, result) {
  if (!result) return;
  const history = getScanHistory();

  const entry = {
    id: Date.now().toString(),
    query,
    materialName: result.materialName,
    materialClass: result.materialClass,
    riskLevel: result.riskLevel,
    petroloadScore: result.petroloadScore,
    healthScore: result.healthScore,
    timestamp: new Date().toISOString(),
  };

  // Remove duplicate queries
  const filtered = history.filter(
    (h) => h.query.toLowerCase() !== query.toLowerCase()
  );

  // Prepend new entry, cap at MAX_HISTORY
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable
  }

  return updated;
}

/**
 * Clear scan history.
 */
export function clearScanHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}
