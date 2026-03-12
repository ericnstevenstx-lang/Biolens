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
  // If explanation looks like a real material explanation (more than a match label), use it
  if (
    explanation.length > 40 &&
    !explanation.toLowerCase().includes("match") &&
    !explanation.toLowerCase().includes("alias")
  ) {
    return explanation;
  }

  // Build a contextual explanation from the data
  const name = row.material_name || "This material";
  const cls = row.material_class || "Unknown";
  const risk = row.risk_level || "Unknown";

  const classDescriptions = {
    "Petro-Based": `${name} is a petroleum-derived material. It depends on fossil fuel feedstocks and may contribute to microplastic pollution and environmental persistence.`,
    "Plant-Based": `${name} is a plant-based material derived from renewable natural sources. It typically has a lower environmental footprint than petroleum-based alternatives.`,
    "Transition Material": `${name} is a transition material that starts from natural sources but undergoes significant chemical processing. It sits between fully natural and fully synthetic materials.`,
    "Natural Material": `${name} is a natural material sourced from renewable or naturally occurring resources. It is generally biodegradable and has lower environmental impact.`,
    "Mineral Material": `${name} is a mineral-based material. It is typically durable, recyclable, and has low environmental toxicity compared to petroleum-based plastics.`,
  };

  return classDescriptions[cls] || `${name} is classified as ${cls} with a ${risk.toLowerCase()} risk level.`;
}

/**
 * Search BioLens via Supabase RPC.
 * Returns grouped result: { main material, alternatives[] }
 */
export async function searchBioLens(query) {
  const { data, error } = await supabase.rpc("search_biolens_scan", {
    user_query: query,
  });

  if (error) {
    console.error("Supabase RPC error:", error);
    throw new Error(error.message || "Search failed");
  }

  if (!data || data.length === 0) {
    return null;
  }

  // First row = main material
  const primary = data[0];

  // Convert petroload: Supabase returns 0-1 scale, we need 0-100
  let petroloadScore = null;
  if (primary.petroload_score != null) {
    petroloadScore = Math.round(primary.petroload_score * 100);
  } else {
    // Derive from risk level if petroload is null
    const riskDefaults = { High: 72, Medium: 42, Low: 15 };
    petroloadScore = riskDefaults[primary.risk_level] || null;
  }

  // Collect alternatives from all rows
  const alternatives = data
    .filter((row) => row.alternative_material)
    .map((row) => ({
      name: row.alternative_material,
      materialClass: row.alternative_class,
      reason: row.replacement_reason,
      priority: row.alternative_priority,
    }))
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  // Deduplicate alternatives by name
  const seen = new Set();
  const uniqueAlts = alternatives.filter((alt) => {
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
    confidenceScore: primary.confidence_score,
    explanation: buildExplanation(primary),
    alternatives: uniqueAlts,
  };
}
