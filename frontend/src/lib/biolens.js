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

function pct(val) { 
  return val != null ? Math.round(val * 100) : null; 
}

// ═══════════════════════════════════════════════════════════════
// ✅ ENHANCED AUTOCOMPLETE (Powers Your SearchBar)
// ═══════════════════════════════════════════════════════════════

export async function fetchAutocomplete(query, limit = 6) {
  if (!query || query.trim().length < 2) {
    return []; // Always return array for consistency
  }

  try {
    // Try enhanced search first (fuzzy matching + alternatives)
    const { data: enhancedData, error: enhancedError } = await supabase.rpc(
      'search_materials_with_alternatives',
      {
        search_term: query.trim(),
        limit_count: limit
      }
    );

    if (!enhancedError && enhancedData && Array.isArray(enhancedData) && enhancedData.length > 0) {
      // Transform to match SearchBar's expected format
      return enhancedData.map((material) => ({
        label: material.material_name || "",
        type: "material",
        materialName: material.material_name || "",
        materialId: material.id || null,
        petroloadScore: material.petroload_score || null,
        alternativesCount: material.alternatives_count || 0,
        matchType: material.match_type || "fuzzy",
        materialFamily: material.material_family || null,
      }));
    }
  } catch (enhancedErr) {
    console.warn("Enhanced autocomplete unavailable, using fallback:", enhancedErr);
  }

  // Graceful fallback to original autocomplete
  try {
    const { data, error } = await supabase.rpc("search_biolens_autocomplete", {
      user_query: query,
      p_limit: limit,
    });
    
    if (error) {
      console.error("Autocomplete error:", error);
      return [];
    }
    
    // Ensure consistent return format
    return (data || []).map((s) => ({
      label: s.suggestion_label || "",
      type: s.suggestion_type || "material",
      materialName: s.material_name || "",
      materialId: s.material_id || null,
      petroloadScore: null,
      alternativesCount: 0,
      matchType: "basic",
      materialFamily: null,
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

export function formatScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score * 100)}%`;
}

// ─── Alternative Products (Maintained) ─────────────────────────

export async function fetchAlternativeProducts(query, limit = 6) {
  const { data, error } = await supabase.rpc("get_best_alternative_products_for_query", {
    user_query: query, 
    p_limit: limit,
  });
  
  if (error) { 
    console.error("Alt products error:", error); 
    return []; 
  }
  
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
  const { data, error } = await supabase.rpc("get_product_purchase_sources", { 
    p_product_id: productId 
  });
  
  if (error) { 
    console.error("Sources error:", error); 
    return []; 
  }
  
  return data || [];
}

// ─── Global Impact Counters ────────────────────────────────────

export async function fetchGlobalImpact() {
  const { data, error } = await supabase.rpc("get_global_impact_counters");
  
  if (error) { 
    console.error("Impact counters error:", error); 
    return null; 
  }
  
  return data && data.length > 0 ? data[0] : null;
}

// ─── Scan History (localStorage) ───────────────────────────────

const HISTORY_KEY = "biolens_scan_history";
const MAX_HISTORY = 20;

export function getScanHistory() {
  try { 
    const r = localStorage.getItem(HISTORY_KEY); 
    return r ? JSON.parse(r) : []; 
  } catch { 
    return []; 
  }
}

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
  
  const filtered = history.filter((h) => h.query.toLowerCase() !== query.toLowerCase());
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  
  try { 
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); 
  } catch {}
  
  return updated;
}

export function clearScanHistory() {
  try { 
    localStorage.removeItem(HISTORY_KEY); 
  } catch {}
}
// Add to your existing biolens.js file (keep all existing functions)

/**
 * 🏢 FREE GS1 Company Prefix Lookup (No membership required)
 * Identifies manufacturer from barcode prefix using public data
 */
function getCompanyFromPrefix(barcode) {
  // Remove any formatting and get clean digits
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  // Major company prefixes (expandable database)
  const gs1Prefixes = {
    // Procter & Gamble (your Head & Shoulders bottle)
    '037000': { name: 'Procter & Gamble', sector: 'Consumer Goods', sustainability: 'Mixed' },
    '030772': { name: 'Procter & Gamble', sector: 'Personal Care', sustainability: 'Mixed' },
    
    // Unilever
    '079400': { name: 'Unilever', sector: 'Personal Care', sustainability: 'Good' },
    '041800': { name: 'Unilever', sector: 'Food & Personal Care', sustainability: 'Good' },
    
    // Johnson & Johnson
    '381370': { name: 'Johnson & Johnson', sector: 'Healthcare', sustainability: 'Mixed' },
    '381371': { name: 'Johnson & Johnson', sector: 'Consumer Products', sustainability: 'Mixed' },
    
    // L'Oréal
    '071249': { name: "L'Oréal", sector: 'Cosmetics', sustainability: 'Mixed' },
    '030170': { name: "L'Oréal", sector: 'Beauty', sustainability: 'Mixed' },
    
    // Beverage Companies
    '049000': { name: 'The Coca-Cola Company', sector: 'Beverages', sustainability: 'Poor' },
    '012000': { name: 'PepsiCo', sector: 'Beverages & Snacks', sustainability: 'Poor' },
    '028400': { name: 'PepsiCo', sector: 'Beverages', sustainability: 'Poor' },
    
    // Food Companies
    '028000': { name: 'Nestlé', sector: 'Food & Beverages', sustainability: 'Poor' },
    '030000': { name: 'Nestlé', sector: 'Food Products', sustainability: 'Poor' },
    '021000': { name: 'Kraft Heinz', sector: 'Food', sustainability: 'Mixed' },
    '016000': { name: 'General Mills', sector: 'Food', sustainability: 'Mixed' },
    '038000': { name: "Kellogg's", sector: 'Cereal & Snacks', sustainability: 'Mixed' },
    
    // Household & Personal Care
    '035000': { name: 'Colgate-Palmolive', sector: 'Oral Care', sustainability: 'Mixed' },
    '070330': { name: 'SC Johnson', sector: 'Household Products', sustainability: 'Good' },
    '062338': { name: 'Reckitt Benckiser', sector: 'Health & Hygiene', sustainability: 'Mixed' },
  };

  // Try different prefix lengths (6, 7, 8, 9 digits)
  for (let length = 6; length <= 9; length++) {
    const prefix = cleanBarcode.substring(0, length);
    if (gs1Prefixes[prefix]) {
      return { prefix, ...gs1Prefixes[prefix] };
    }
  }

  return null;
}

/**
 * 🔍 COMPLETE FREE barcode lookup system
 * Strategy: Local DB → Open Beauty Facts → Open Food Facts → Company Prefix Fallback
 */
export async function lookupProductByBarcode(rawBarcode) {
  if (!rawBarcode) {
    return { success: false, error: 'No barcode provided' };
  }

  const normalizedBarcode = rawBarcode.replace(/[\s\-]/g, '');
  console.log('🔍 Looking up barcode:', normalizedBarcode);

  // Get company info from prefix (always available)
  const companyInfo = getCompanyFromPrefix(normalizedBarcode);
  console.log('🏢 Company from prefix:', companyInfo);

  try {
    // Step 1: Check your local BioLens database first (fastest)
    const localResult = await lookupLocalDatabase(normalizedBarcode);
    if (localResult.success) {
      return { 
        ...localResult, 
        source: 'BioLens Database (Cached)',
        companyInfo 
      };
    }

    // Step 2: Try Open Beauty Facts (personal care, cosmetics, household)
    const beautyResult = await lookupOpenBeautyFacts(normalizedBarcode);
    if (beautyResult.success) {
      // Enhance with company info if brand missing
      if (!beautyResult.product.brand && companyInfo) {
        beautyResult.product.brand = companyInfo.name;
      }
      return { ...beautyResult, companyInfo };
    }

    // Step 3: Try Open Food Facts (food, beverages, some personal care)
    const foodResult = await lookupOpenFoodFacts(normalizedBarcode);
    if (foodResult.success) {
      if (!foodResult.product.brand && companyInfo) {
        foodResult.product.brand = companyInfo.name;
      }
      return { ...foodResult, companyInfo };
    }

    // Step 4: Company prefix fallback (better than nothing)
    if (companyInfo) {
      return {
        success: true,
        source: 'Company Prefix Identification',
        isGeneric: true,
        companyInfo,
        product: {
          name: `${companyInfo.name} Product`,
          brand: companyInfo.name,
          category: companyInfo.sector,
          barcode: normalizedBarcode,
        },
        materials: await getGenericMaterialsByCompany(companyInfo),
        message: `Specific product not found, but identified as a ${companyInfo.name} product in ${companyInfo.sector}.`,
        sustainabilityNote: getSustainabilityNote(companyInfo.sustainability)
      };
    }

    // Step 5: Complete failure
    return {
      success: false,
      error: 'Product not found',
      barcode: normalizedBarcode,
      message: `Product with barcode ${normalizedBarcode} not found in any database.`,
      suggestions: [
        'Try scanning from a different angle',
        'Search for materials by product name instead',
        'Ensure barcode is clean and well-lit'
      ]
    };

  } catch (error) {
    console.error('Barcode lookup system error:', error);
    return {
      success: false,
      error: 'System error',
      companyInfo,
      message: 'Barcode lookup service temporarily unavailable.',
    };
  }
}

/**
 * 🧴 Open Beauty Facts API (FREE - perfect for your Head & Shoulders bottle)
 */
async function lookupOpenBeautyFacts(barcode) {
  try {
    console.log('🧴 Checking Open Beauty Facts...');
    
    const response = await fetch(
      `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'BioLens-MaterialIntelligence/1.0 (Contact: support@biolens.app)'
        }
      }
    );

    if (!response.ok) return { success: false };

    const data = await response.json();
    if (data.status === 0 || !data.product) return { success: false };

    const product = data.product;
    const materials = await extractMaterialsFromOpenData(product, 'beauty');

    return {
      success: true,
      source: 'Open Beauty Facts',
      product: {
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: extractBrandName(product.brands),
        category: extractCategoryName(product.categories_tags),
        barcode: barcode,
        image: product.image_url || product.image_front_url,
        ingredients: product.ingredients_text_en || product.ingredients_text,
        packaging: product.packaging_text,
      },
      materials: materials,
      dataQuality: {
        completeness: calculateDataCompleteness(product),
        lastUpdated: product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : null,
      }
    };

  } catch (error) {
    console.error('Open Beauty Facts error:', error);
    return { success: false };
  }
}

/**
 * 🥫 Open Food Facts API (FREE - food, beverages, some household)
 */
async function lookupOpenFoodFacts(barcode) {
  try {
    console.log('🥫 Checking Open Food Facts...');
    
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'BioLens-MaterialIntelligence/1.0 (Contact: support@biolens.app)'
        }
      }
    );

    if (!response.ok) return { success: false };

    const data = await response.json();
    if (data.status === 0 || !data.product) return { success: false };

    const product = data.product;
    const materials = await extractMaterialsFromOpenData(product, 'food');

    return {
      success: true,
      source: 'Open Food Facts',
      product: {
        name: product.product_name || product.product_name_en || 'Unknown Product',
        brand: extractBrandName(product.brands),
        category: extractCategoryName(product.categories_tags),
        barcode: barcode,
        image: product.image_url || product.image_front_url,
        ingredients: product.ingredients_text_en || product.ingredients_text,
        packaging: product.packaging_text,
        nutritionGrade: product.nutrition_grades,
        ecoScore: product.ecoscore_grade,
      },
      materials: materials,
      dataQuality: {
        completeness: calculateDataCompleteness(product),
        lastUpdated: product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : null,
      }
    };

  } catch (error) {
    console.error('Open Food Facts error:', error);
    return { success: false };
  }
}

/**
 * 💾 Local BioLens database lookup
 */
async function lookupLocalDatabase(barcode) {
  try {
    const barcodeVariations = [
      barcode,
      barcode.padStart(12, '0'),
      barcode.padStart(13, '0'),
      barcode.replace(/^0+/, '') || '0',
    ];

    const { data, error } = await supabase
      .from('product_barcodes')
      .select(`
        barcode,
        products (
          id,
          product_name,
          brands (brand_name),
          categories (category_name)
        )
      `)
      .in('barcode', barcodeVariations)
      .limit(1);

    if (error || !data || data.length === 0) return { success: false };

    const product = data[0];

    // Get material composition
    const { data: materialData } = await supabase
      .from('product_materials')
      .select(`
        percentage,
        materials (
          material_name,
          material_family,
          petroload_score,
          biodegradability_score,
          toxicity_score,
          consumer_facing_summary
        )
      `)
      .eq('product_id', product.products.id);

    return {
      success: true,
      product: {
        name: product.products.product_name,
        brand: product.products.brands?.brand_name,
        category: product.products.categories?.category_name,
        barcode: barcode,
      },
      materials: (materialData || []).map(m => ({
        name: m.materials.material_name,
        family: m.materials.material_family,
        percentage: m.percentage,
        petroloadScore: m.materials.petroload_score,
        biodegradabilityScore: m.materials.biodegradability_score,
        toxicityScore: m.materials.toxicity_score,
        summary: m.materials.consumer_facing_summary,
        source: 'curated'
      })),
    };

  } catch (error) {
    return { success: false };
  }
}

/**
 * 🧬 Smart material extraction from Open database product data
 */
async function extractMaterialsFromOpenData(product, type) {
  const materials = [];
  const detectedKeywords = new Set();

  // Collect all text for analysis
  const analysisText = [
    product.packaging_text,
    product.packaging_tags?.join(' '),
    product.ingredients_text_en,
    product.ingredients_text,
  ].filter(Boolean).join(' ').toLowerCase();

  // Material detection patterns with BioLens database matching
  const materialPatterns = [
    // Common plastics
    { keywords: ['hdpe', 'high density polyethylene', 'plastic 2'], dbMatch: 'HDPE' },
    { keywords: ['pet', 'pete', 'polyethylene terephthalate', 'plastic 1'], dbMatch: 'PET Plastic' },
    { keywords: ['pp', 'polypropylene', 'plastic 5'], dbMatch: 'Polypropylene' },
    { keywords: ['ldpe', 'low density polyethylene', 'plastic 4'], dbMatch: 'LDPE' },
    { keywords: ['pvc', 'polyvinyl chloride', 'plastic 3'], dbMatch: 'PVC' },
    
    // Personal care chemicals (for your Head & Shoulders)
    { keywords: ['sodium lauryl sulfate', 'sls'], dbMatch: 'Sodium Lauryl Sulfate' },
    { keywords: ['sodium laureth sulfate', 'sles'], dbMatch: 'Sodium Laureth Sulfate' },
    { keywords: ['dimethicone', 'silicone'], dbMatch: 'Silicone' },
    
    // Other common materials
    { keywords: ['aluminum', 'aluminium'], dbMatch: 'Aluminum' },
    { keywords: ['glass'], dbMatch: 'Glass' },
    { keywords: ['paper', 'cardboard'], dbMatch: 'Paper' },
  ];

  for (const pattern of materialPatterns) {
    const found = pattern.keywords.some(keyword => analysisText.includes(keyword));
    
    if (found && !detectedKeywords.has(pattern.dbMatch)) {
      detectedKeywords.add(pattern.dbMatch);
      
      // Match with your BioLens materials database
      const { data: matchedMaterials } = await supabase
        .from('materials')
        .select('material_name, material_family, petroload_score, biodegradability_score, toxicity_score, consumer_facing_summary')
        .ilike('material_name', `%${pattern.dbMatch}%`)
        .limit(1);

      if (matchedMaterials && matchedMaterials.length > 0) {
        const material = matchedMaterials[0];
        materials.push({
          name: material.material_name,
          family: material.material_family,
          petroloadScore: material.petroload_score,
          biodegradabilityScore: material.biodegradability_score,
          toxicityScore: material.toxicity_score,
          summary: material.consumer_facing_summary,
          detectedFrom: type === 'beauty' ? 'ingredients/packaging' : 'packaging',
          source: 'detected'
        });
      }
    }
  }

  return materials;
}

/**
 * 🏭 Get generic materials based on company sector
 */
async function getGenericMaterialsByCompany(companyInfo) {
  const sectorMaterials = {
    'Personal Care': ['HDPE', 'Polypropylene', 'Sodium Lauryl Sulfate'],
    'Food & Beverages': ['PET Plastic', 'Aluminum', 'Paper'],
    'Household Products': ['HDPE', 'Polypropylene', 'Sodium Lauryl Sulfate'],
    'Consumer Goods': ['Polypropylene', 'HDPE', 'Paper'],
  };

  const materialNames = sectorMaterials[companyInfo.sector] || ['Plastic (Generic)'];
  const materials = [];

  for (const materialName of materialNames) {
    const { data } = await supabase
      .from('materials')
      .select('material_name, material_family, petroload_score, biodegradability_score, toxicity_score')
      .ilike('material_name', `%${materialName}%`)
      .limit(1);

    if (data && data.length > 0) {
      materials.push({
        ...data[0],
        source: 'estimated',
        confidence: 0.6
      });
    }
  }

  return materials;
}

// Helper functions
function extractBrandName(brands) {
  if (!brands) return null;
  return brands.split(',')[0].trim();
}

function extractCategoryName(categories) {
  if (!categories || !Array.isArray(categories)) return null;
  const cleaned = categories[0]?.replace('en:', '').replace(/-/g, ' ');
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : null;
}

function calculateDataCompleteness(product) {
  const fields = [
    product.product_name,
    product.brands,
    product.categories_tags?.length,
    product.ingredients_text,
    product.packaging_text,
    product.image_url,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

function getSustainabilityNote(rating) {
  const notes = {
    'Good': 'This company has shown commitment to sustainability initiatives.',
    'Mixed': 'This company has some sustainability efforts but room for improvement.',
    'Poor': 'This company lags behind in sustainability practices.'
  };
  return notes[rating] || 'Sustainability information not available.';
}
