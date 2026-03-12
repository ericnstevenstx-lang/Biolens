/**
 * Purchase impact adapter.
 * Computes estimated material-level impact metrics from available scores.
 * No fake precision — all values labeled as estimated.
 */

/**
 * Compute impact metrics for a material result.
 * @param {object} result - searchBioLens result
 * @returns {object} impact metrics
 */
export function computeImpact(result) {
  if (!result) return null;

  const petroload = result.petroloadScore ?? 0;
  const health = result.healthScore ?? 50;

  // Estimated petro dollars replaced per product unit
  // Logic: high-petroload materials cost ~$2-8 in petroleum inputs per kg
  // Switching to low-petroload saves proportionally
  const petroDollarsPerUnit = petroload > 50
    ? Number(((petroload / 100) * 6.5).toFixed(2))
    : Number(((petroload / 100) * 2.5).toFixed(2));

  // Estimated jobs supported per 1000 units shifted to alternatives
  // Plant-based materials support ~3-5x more agricultural/processing jobs
  const jobsMultiplier = result.materialClass === "Petro-Based" ? 0.8
    : result.materialClass === "Plant-Based" ? 3.2
    : result.materialClass === "Natural Material" ? 2.5
    : result.materialClass === "Transition Material" ? 1.8
    : result.materialClass === "Mineral Material" ? 1.4
    : 1.0;
  const jobsSupported = Number((jobsMultiplier * 1.2).toFixed(1));

  // Carbon proxy improvement (kg CO2e saved per kg material switched)
  // Petro materials: ~3-6 kg CO2e/kg; plant: ~0.5-1.5 kg CO2e/kg
  const carbonBaseline = (petroload / 100) * 5.5;
  const carbonImprovement = Number((carbonBaseline * 0.65).toFixed(1));

  // Microplastic avoidance (grams per wash cycle avoided)
  const shedsMicroplastics = ["Petro-Based"].includes(result.materialClass);
  const microplasticGrams = shedsMicroplastics
    ? Number(((petroload / 100) * 0.35).toFixed(2))
    : 0;

  return {
    petroDollarsPerUnit,
    jobsSupported,
    carbonImprovement,
    microplasticGrams,
    shedsMicroplastics,
    petroload,
    health,
    isEstimated: true,
  };
}

/**
 * Compute a simple comparison metric for an alternative material.
 */
export function computeAlternativeImpact(altMaterialClass) {
  const classScores = {
    "Plant-Based": { petroSaving: 85, carbonSaving: 70, jobsBoost: 3.2 },
    "Natural Material": { petroSaving: 75, carbonSaving: 60, jobsBoost: 2.5 },
    "Transition Material": { petroSaving: 40, carbonSaving: 30, jobsBoost: 1.8 },
    "Mineral Material": { petroSaving: 60, carbonSaving: 45, jobsBoost: 1.4 },
  };
  return classScores[altMaterialClass] || { petroSaving: 30, carbonSaving: 20, jobsBoost: 1.0 };
}
