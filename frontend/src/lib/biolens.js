import { supabase } from "./supabase";

// ═══════════════════════════════════════════════════════════════
// 🎯 UTILITY HELPERS (Enhanced - Maintained for Compatibility)
// ═══════════════════════════════════════════════════════════════

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
// ✅ ENHANCED AUTOCOMPLETE (Powers Your SearchBar - Maintained)
// ═══════════════════════════════════════════════════════════════

export async function fetchAutocomplete(query, limit = 6) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const { data: enhancedData, error: enhancedError } = await supabase.rpc(
      'search_materials_with_alternatives',
      {
        search_term: query.trim(),
        limit_count: limit
      }
    );

    if (!enhancedError && enhancedData && Array.isArray(enhancedData) && enhancedData.length > 0) {
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

// ═══════════════════════════════════════════════════════════════
// 🔍 PRIMARY MATERIAL SEARCH (Text-based - Maintained)
// ═══════════════════════════════════════════════════════════════

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
// 🏢 EXPANDED GS1 COMPANY PREFIX DATABASE
// ═══════════════════════════════════════════════════════════════

const GS1_COMPANY_DATABASE = {
  // Procter & Gamble (Personal Care & Household)
  '037000': { name: 'Procter & Gamble', sector: 'Consumer Goods', categories: ['Personal Care', 'Household Cleaning'], sustainability: 'Mixed' },
  '030772': { name: 'Procter & Gamble', sector: 'Personal Care', categories: ['Shampoo', 'Hair Care'], sustainability: 'Mixed' },
  
  // Unilever (Global Consumer Goods)
  '079400': { name: 'Unilever', sector: 'Personal Care', categories: ['Soap', 'Deodorant'], sustainability: 'Good' },
  '041800': { name: 'Unilever', sector: 'Food & Personal Care', categories: ['Margarine', 'Body Wash'], sustainability: 'Good' },
  
  // Johnson & Johnson
  '381370': { name: 'Johnson & Johnson', sector: 'Healthcare', categories: ['Medical Devices', 'Pharmaceuticals'], sustainability: 'Mixed' },
  '381371': { name: 'Johnson & Johnson', sector: 'Consumer Products', categories: ['Baby Care', 'First Aid'], sustainability: 'Mixed' },
  
  // L'Oréal
  '071249': { name: "L'Oréal", sector: 'Cosmetics', categories: ['Hair Color', 'Skincare'], sustainability: 'Mixed' },
  '030170': { name: "L'Oréal", sector: 'Beauty', categories: ['Makeup', 'Fragrance'], sustainability: 'Mixed' },
  
  // Beverage Companies
  '049000': { name: 'The Coca-Cola Company', sector: 'Beverages', categories: ['Soft Drinks', 'Juices'], sustainability: 'Poor' },
  '012000': { name: 'PepsiCo', sector: 'Beverages & Snacks', categories: ['Soft Drinks', 'Chips'], sustainability: 'Poor' },
  '028400': { name: 'PepsiCo', sector: 'Beverages', categories: ['Sports Drinks', 'Water'], sustainability: 'Poor' },
  
  // Food Companies
  '028000': { name: 'Nestlé', sector: 'Food & Beverages', categories: ['Chocolate', 'Coffee'], sustainability: 'Poor' },
  '030000': { name: 'Nestlé', sector: 'Food Products', categories: ['Frozen Food', 'Pet Food'], sustainability: 'Poor' },
  '021000': { name: 'Kraft Heinz', sector: 'Food', categories: ['Condiments', 'Cheese'], sustainability: 'Mixed' },
  '016000': { name: 'General Mills', sector: 'Food', categories: ['Cereal', 'Snacks'], sustainability: 'Mixed' },
  '038000': { name: "Kellogg's", sector: 'Cereal & Snacks', categories: ['Breakfast Cereal', 'Crackers'], sustainability: 'Mixed' },
  
  // Household & Personal Care
  '035000': { name: 'Colgate-Palmolive', sector: 'Oral Care', categories: ['Toothpaste', 'Dish Soap'], sustainability: 'Mixed' },
  '070330': { name: 'SC Johnson', sector: 'Household Products', categories: ['Cleaners', 'Air Fresheners'], sustainability: 'Good' },
  '062338': { name: 'Reckitt Benckiser', sector: 'Health & Hygiene', categories: ['Disinfectants', 'Pain Relief'], sustainability: 'Mixed' },
  
  // Clorox Company
  '044600': { name: 'The Clorox Company', sector: 'Household Cleaning', categories: ['Bleach', 'Disinfectants'], sustainability: 'Mixed' },
  
  // Battery & Electronics Manufacturers
  '039800': { name: 'Energizer', sector: 'Batteries', categories: ['Alkaline Batteries', 'Rechargeable'], sustainability: 'Mixed' },
  '041333': { name: 'Duracell', sector: 'Batteries', categories: ['Alkaline Batteries'], sustainability: 'Mixed' },
  
  // 3M Company
  '051131': { name: '3M', sector: 'Industrial Products', categories: ['Adhesives', 'Office Supplies'], sustainability: 'Mixed' },
  '051141': { name: '3M', sector: 'Consumer Products', categories: ['Tapes', 'Home Improvement'], sustainability: 'Mixed' },
};

function getCompanyFromPrefix(barcode) {
  const cleanBarcode = barcode.replace(/\D/g, '');
  
  // Try different prefix lengths (6-9 digits) for maximum coverage
  for (let length = 6; length <= 9; length++) {
    const prefix = cleanBarcode.substring(0, length);
    if (GS1_COMPANY_DATABASE[prefix]) {
      return { prefix, ...GS1_COMPANY_DATABASE[prefix] };
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 📦 CATEGORY-BASED MATERIAL INFERENCE PROFILES
// ═══════════════════════════════════════════════════════════════

const CATEGORY_MATERIAL_PROFILES = {
  'household_cleaning': {
    primary_materials: [
      { 
        material: 'HDPE Bottle', 
        component: 'Container', 
        likelihood: 0.70, 
        petroload: 75,
        description: 'High-density polyethylene bottle - most common for household cleaners'
      },
      { 
        material: 'PP Trigger Sprayer', 
        component: 'Dispensing mechanism', 
        likelihood: 0.85, 
        petroload: 78,
        description: 'Polypropylene trigger assembly with metal spring components'
      },
      { 
        material: 'BOPP Label', 
        component: 'Product label', 
        likelihood: 0.90, 
        petroload: 82,
        description: 'Biaxially oriented polypropylene film label with adhesive backing'
      }
    ],
    typical_ingredients: ['Surfactants', 'Quaternary Ammonium Compounds', 'Fragrances'],
    confidence: 'high',
    estimated_petroload: 76
  },
  
  'laundry_detergent': {
    primary_materials: [
      { 
        material: 'HDPE Jug', 
        component: 'Container', 
        likelihood: 0.80, 
        petroload: 75,
        description: 'Large high-density polyethylene container for liquid detergent'
      },
      { 
        material: 'PP Cap', 
        component: 'Closure/Measuring Cup', 
        likelihood: 0.95, 
        petroload: 78,
        description: 'Polypropylene cap that often doubles as a measuring cup'
      }
    ],
    typical_ingredients: ['Linear Alkylbenzene Sulfonate', 'Enzymes', 'Optical Brighteners'],
    confidence: 'high',
    estimated_petroload: 75
  },
  
  'shampoo_conditioner': {
    primary_materials: [
      { 
        material: 'HDPE Bottle', 
        component: 'Container', 
        likelihood: 0.65, 
        petroload: 75,
        description: 'High-density polyethylene bottle with flip-top or pump dispenser'
      },
      { 
        material: 'PP Cap', 
        component: 'Flip Cap/Pump', 
        likelihood: 0.90, 
        petroload: 78,
        description: 'Polypropylene flip-top cap or pump mechanism'
      }
    ],
    typical_ingredients: ['Sodium Lauryl Sulfate', 'Silicone', 'Fragrance', 'Parabens'],
    confidence: 'high',
    estimated_petroload: 78
  },
  
  'soft_drinks': {
    primary_materials: [
      { 
        material: 'PET Bottle', 
        component: 'Container', 
        likelihood: 0.90, 
        petroload: 90,
        description: 'Polyethylene terephthalate bottle for carbonated beverages'
      },
      { 
        material: 'HDPE Cap', 
        component: 'Closure', 
        likelihood: 0.95, 
        petroload: 75,
        description: 'High-density polyethylene screw cap with liner'
      },
      { 
        material: 'PET Shrink Label', 
        component: 'Label', 
        likelihood: 0.80, 
        petroload: 90,
        description: 'Heat-shrink PET film label with printed graphics'
      }
    ],
    confidence: 'high',
    estimated_petroload: 87
  },
  
  'batteries': {
    primary_materials: [
      { 
        material: 'Steel Casing', 
        component: 'Outer Shell', 
        likelihood: 0.90, 
        petroload: 45,
        description: 'Steel cylindrical or rectangular casing for protection'
      },
      { 
        material: 'Alkaline Chemistry', 
        component: 'Internal Components', 
        likelihood: 0.80, 
        petroload: 35,
        description: 'Zinc anode, manganese dioxide cathode, potassium hydroxide electrolyte'
      },
      { 
        material: 'Paperboard Packaging', 
        component: 'Retail Packaging', 
        likelihood: 0.95, 
        petroload: 25,
        description: 'Cardboard blister pack or box for retail display'
      }
    ],
    confidence: 'high',
    estimated_petroload: 42
  },
  
  'electronics': {
    primary_materials: [
      { 
        material: 'ABS Plastic', 
        component: 'Housing/Casing', 
        likelihood: 0.60, 
        petroload: 88,
        description: 'Acrylonitrile butadiene styrene - tough plastic for electronics housings'
      },
      { 
        material: 'Polycarbonate', 
        component: 'Clear Components', 
        likelihood: 0.30, 
        petroload: 90,
        description: 'Impact-resistant clear plastic for screens and lenses'
      },
      { 
        material: 'FR-4 PCB', 
        component: 'Circuit Boards', 
        likelihood: 0.95, 
        petroload: 65,
        description: 'Fiberglass-reinforced epoxy laminate circuit board substrate'
      }
    ],
    confidence: 'medium',
    estimated_petroload: 81
  },
  
  'cereal': {
    primary_materials: [
      { 
        material: 'Paperboard Box', 
        component: 'Outer Packaging', 
        likelihood: 0.95, 
        petroload: 30,
        description: 'Recycled paperboard with printed graphics and coatings'
      },
      { 
        material: 'LDPE Liner', 
        component: 'Inner Bag', 
        likelihood: 0.85, 
        petroload: 82,
        description: 'Low-density polyethylene bag to maintain freshness'
      }
    ],
    confidence: 'high',
    estimated_petroload: 55
  },
  
  'bread': {
    primary_materials: [
      { 
        material: 'LDPE Bag', 
        component: 'Primary Packaging', 
        likelihood: 0.90, 
        petroload: 82,
        description: 'Low-density polyethylene bag with perforations for freshness'
      },
      { 
        material: 'Plastic Coated Wire Tie', 
        component: 'Closure', 
        likelihood: 0.80, 
        petroload: 70,
        description: 'Wire twist tie with plastic coating'
      }
    ],
    confidence: 'high',
    estimated_petroload: 80
  }
};

// ═══════════════════════════════════════════════════════════════
// 🧠 INTELLIGENT PRODUCT CATEGORIZATION
// ═══════════════════════════════════════════════════════════════

function detectProductCategory(productName, apiCategory, company) {
  const name = (productName || '').toLowerCase();
  const category = (apiCategory || '').toLowerCase();
  const companyName = company?.name?.toLowerCase() || '';
  
  // Cleaning Products Detection
  if (name.includes('windex') || name.includes('lysol') || name.includes('clorox') || 
      name.includes('cleaner') || name.includes('disinfect') || name.includes('spray') ||
      name.includes('bleach') || name.includes('bathroom') || name.includes('kitchen cleaner') ||
      category.includes('household cleaners') || category.includes('surface cleaner')) {
    return 'household_cleaning';
  }
  
  // Laundry Products
  if (name.includes('tide') || name.includes('detergent') || name.includes('laundry') ||
      name.includes('fabric softener') || name.includes('downy') || name.includes('gain') ||
      category.includes('laundry')) {
    return 'laundry_detergent';
  }
  
  // Personal Care
  if (name.includes('shampoo') || name.includes('conditioner') || name.includes('body wash') ||
      name.includes('head & shoulders') || category.includes('shampoo') || 
      category.includes('hair care') || category.includes('conditioner')) {
    return 'shampoo_conditioner';
  }
  
  // Beverages
  if (name.includes('coke') || name.includes('pepsi') || name.includes('soda') ||
      name.includes('coca-cola') || category.includes('carbonated') || 
      category.includes('soft drink') || category.includes('beverages')) {
    return 'soft_drinks';
  }
  
  // Batteries & Power
  if (name.includes('battery') || name.includes('batteries') || name.includes('energizer') ||
      name.includes('duracell') || category.includes('batteries') || category.includes('power')) {
    return 'batteries';
  }
  
  // Electronics
  if (category.includes('electronic') || name.includes('charger') || name.includes('adapter') ||
      name.includes('cable') || name.includes('remote') || name.includes('headphones') ||
      name.includes('earbuds') || category.includes('consumer electronics')) {
    return 'electronics';
  }
  
  // Food Packaging
  if (name.includes('cereal') || category.includes('breakfast cereal') || 
      category.includes('cereal')) {
    return 'cereal';
  }
  
  if (name.includes('bread') || category.includes('bread') || category.includes('bakery')) {
    return 'bread';
  }
  
  // Company-Based Inference
  if (companyName.includes('clorox') || companyName.includes('sc johnson')) {
    return 'household_cleaning';
  }
  if (companyName.includes('energizer') || companyName.includes('duracell')) {
    return 'batteries';
  }
  if (companyName.includes('procter & gamble') || companyName.includes('p&g')) {
    if (name.includes('tide') || name.includes('gain')) return 'laundry_detergent';
    if (name.includes('head & shoulders') || name.includes('pantene')) return 'shampoo_conditioner';
    return 'household_cleaning'; // Default for P&G
  }
  
  return 'general';
}

function inferMaterialsFromCategory(categoryKey, productName, company) {
  const profile = CATEGORY_MATERIAL_PROFILES[categoryKey];
  
  if (!profile) {
    return {
      category: 'unknown',
      materials: [],
      estimatedPetroload: null,
      confidence: 'low',
      analysisType: 'none',
      message: 'Unable to determine likely materials from product information.'
    };
  }
  
  return {
    category: categoryKey,
    materials: profile.primary_materials,
    typicalIngredients: profile.typical_ingredients || [],
    estimatedPetroload: profile.estimated_petroload,
    confidence: profile.confidence,
    analysisType: 'category_inference',
    message: `Material analysis based on typical ${categoryKey.replace(/_/g, ' ')} products.`
  };
}

// ═══════════════════════════════════════════════════════════════
// 🌐 MULTI-API BARCODE LOOKUP SYSTEM (New Enhanced System)
// ═══════════════════════════════════════════════════════════════

export async function lookupProductByBarcode(rawBarcode) {
  if (!rawBarcode) {
    return { success: false, error: 'No barcode provided' };
  }

  const normalizedBarcode = rawBarcode.replace(/[\s\-]/g, '');
  console.log('🔍 Multi-route barcode lookup:', normalizedBarcode);

  // Step 1: Company identification (always available, instant)
  const companyInfo = getCompanyFromPrefix(normalizedBarcode);
  console.log('🏢 Company identified:', companyInfo?.name || 'Unknown');

  try {
    // Step 2: Local BioLens database (fastest, most accurate)
    const localResult = await lookupLocalDatabase(normalizedBarcode);
    if (localResult.success) {
      return {
        ...localResult,
        source: 'BioLens Database (Curated)',
        companyInfo,
        confidenceLevel: 'high'
      };
    }

    // Step 3: Parallel external API lookup for maximum coverage
    console.log('🌐 Querying external APIs...');
    const apiPromises = [
      lookupOpenBeautyFacts(normalizedBarcode),
      lookupOpenFoodFacts(normalizedBarcode),
      lookupUPCItemDB(normalizedBarcode),
      lookupOpenProductsFacts(normalizedBarcode)
    ];

    const apiResults = await Promise.allSettled(apiPromises);
    
    // Find the best result (prioritize by data quality)
    const successfulResults = apiResults
      .filter(result => result.status === 'fulfilled' && result.value?.success)
      .map(result => result.value);

    if (successfulResults.length > 0) {
      const bestResult = successfulResults[0]; // First successful result
      
      // Enhance with company info if missing
      if (!bestResult.product.brand && companyInfo) {
        bestResult.product.brand = companyInfo.name;
      }
      
      // If no materials detected, infer from category
      let finalMaterials = bestResult.materials;
      let inferredData = null;
      
      if (!finalMaterials || finalMaterials.length === 0) {
        const categoryKey = detectProductCategory(
          bestResult.product.name,
          bestResult.product.category,
          companyInfo
        );
        
        inferredData = inferMaterialsFromCategory(categoryKey, bestResult.product.name, companyInfo);
        finalMaterials = convertInferredMaterialsToStandardFormat(inferredData);
      }
      
      const confidenceLevel = calculateConfidenceLevel(bestResult, companyInfo, inferredData);
      
      return {
        ...bestResult,
        companyInfo,
        materials: finalMaterials,
        inferredMaterials: inferredData,
        confidenceLevel,
        isInferred: !!inferredData
      };
    }

    // Step 4: Company-based fallback with smart material inference
    if (companyInfo) {
      const categoryKey = detectProductCategory('', '', companyInfo);
      const inferredData = inferMaterialsFromCategory(categoryKey, '', companyInfo);
      const materials = convertInferredMaterialsToStandardFormat(inferredData);
      
      return {
        success: true,
        source: 'Company Prefix + Category Inference',
        isGeneric: true,
        companyInfo,
        product: {
          name: `${companyInfo.name} Product`,
          brand: companyInfo.name,
          category: companyInfo.sector,
          barcode: normalizedBarcode,
        },
        materials,
        inferredMaterials: inferredData,
        confidenceLevel: 'low',
        isInferred: true,
        message: `Identified as a ${companyInfo.name} product. Material analysis based on typical ${companyInfo.sector} products.`
      };
    }

    // Step 5: Complete failure
    return {
      success: false,
      error: 'Product not found',
      barcode: normalizedBarcode,
      message: `Product with barcode ${normalizedBarcode} not found in any database.`,
      suggestions: [
        'Try scanning from a different angle or better lighting',
        'Search for materials by product name instead',
        'Ensure the barcode is clean and fully visible'
      ]
    };

  } catch (error) {
    console.error('Barcode lookup system error:', error);
    return {
      success: false,
      error: 'System error',
      companyInfo,
      message: 'Barcode lookup service temporarily unavailable. Please try again.',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧴 OPEN BEAUTY FACTS API (Free - Personal Care Products)
// ═══════════════════════════════════════════════════════════════

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
    const materials = await extractMaterialsFromIngredients(
      product.ingredients_text_en || product.ingredients_text,
      product.packaging_text
    );

    return {
      success: true,
      source: 'Open Beauty Facts',
      product: {
        name: product.product_name || product.product_name_en || 'Unknown Beauty Product',
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

// ═══════════════════════════════════════════════════════════════
// 🥫 OPEN FOOD FACTS API (Free - Food & Beverage Products)
// ═══════════════════════════════════════════════════════════════

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
    const materials = await extractMaterialsFromIngredients(
      product.ingredients_text_en || product.ingredients_text,
      product.packaging_text
    );

    return {
      success: true,
      source: 'Open Food Facts',
      product: {
        name: product.product_name || product.product_name_en || 'Unknown Food Product',
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

// ═══════════════════════════════════════════════════════════════
// 📦 UPC ITEM DB API (Free Tier - General Consumer Products)
// ═══════════════════════════════════════════════════════════════

async function lookupUPCItemDB(barcode) {
  try {
    console.log('📦 Checking UPC Item DB...');
    
    // Using free trial endpoint (100 requests/day limit)
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
    );

    if (!response.ok) return { success: false };

    const data = await response.json();
    
    if (data.code === "OK" && data.items?.length > 0) {
      const item = data.items[0];
      
      return {
        success: true,
        source: 'UPC Item DB',
        product: {
          name: item.title || 'Unknown Product',
          brand: item.brand || null,
          category: item.category || null,
          barcode: barcode,
          description: item.description || null,
          image: item.images && item.images.length > 0 ? item.images[0] : null,
        },
        materials: [], // Will trigger category-based inference
        dataQuality: {
          completeness: 75, // Estimated based on typical UPC DB data
          lastUpdated: null
        }
      };
    }
    
    return { success: false };

  } catch (error) {
    console.error('UPC Item DB error:', error);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🌍 OPEN PRODUCTS FACTS API (Free - Broader Product Coverage)
// ═══════════════════════════════════════════════════════════════

async function lookupOpenProductsFacts(barcode) {
  try {
    console.log('🌍 Checking Open Products Facts...');
    
    const response = await fetch(
      `https://world.openproductsfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'BioLens-MaterialIntelligence/1.0 (Contact: support@biolens.app)'
        }
      }
    );

    if (!response.ok) return { success: false };

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      return {
        success: true,
        source: 'Open Products Facts',
        product: {
          name: product.product_name || product.generic_name || 'Unknown Product',
          brand: extractBrandName(product.brands),
          category: extractCategoryName(product.categories_tags),
          barcode: barcode,
          image: product.image_url || null,
        },
        materials: [], // Will trigger category-based inference
        dataQuality: {
          completeness: 60, // Estimated based on typical Open Products data
          lastUpdated: product.last_modified_t ? new Date(product.last_modified_t * 1000).toLocaleDateString() : null
        }
      };
    }
    
    return { success: false };

  } catch (error) {
    console.error('Open Products Facts error:', error);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// 💾 LOCAL BIOLENS DATABASE LOOKUP
// ═══════════════════════════════════════════════════════════════

async function lookupLocalDatabase(barcode) {
  try {
    // Try multiple barcode formats for maximum compatibility
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

    // Get detailed material composition
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

    const materials = (materialData || []).map(m => ({
      name: m.materials.material_name,
      family: m.materials.material_family,
      percentage: m.percentage,
      petroloadScore: m.materials.petroload_score,
      biodegradabilityScore: m.materials.biodegradability_score,
      toxicityScore: m.materials.toxicity_score,
      summary: m.materials.consumer_facing_summary,
      source: 'curated',
      confidence: 1.0
    }));

    return {
      success: true,
      product: {
        name: product.products.product_name,
        brand: product.products.brands?.brand_name,
        category: product.products.categories?.category_name,
        barcode: barcode,
      },
      materials: materials,
    };

  } catch (error) {
    console.error('Local database lookup error:', error);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧬 MATERIAL EXTRACTION FROM INGREDIENTS & PACKAGING
// ═══════════════════════════════════════════════════════════════

async function extractMaterialsFromIngredients(ingredientsText, packagingText) {
  const materials = [];
  const detectedMaterials = new Set();

  const analysisText = [ingredientsText, packagingText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Comprehensive material detection patterns
  const materialPatterns = [
    // Common packaging plastics
    { keywords: ['hdpe', 'high density polyethylene', 'plastic 2'], dbMatch: 'HDPE' },
    { keywords: ['pet', 'pete', 'polyethylene terephthalate', 'plastic 1'], dbMatch: 'PET' },
    { keywords: ['pp', 'polypropylene', 'plastic 5'], dbMatch: 'Polypropylene' },
    { keywords: ['ldpe', 'low density polyethylene', 'plastic 4'], dbMatch: 'LDPE' },
    { keywords: ['pvc', 'polyvinyl chloride', 'plastic 3'], dbMatch: 'PVC' },
    { keywords: ['ps', 'polystyrene', 'plastic 6'], dbMatch: 'Polystyrene' },
    
    // Personal care ingredients
    { keywords: ['sodium lauryl sulfate', 'sls'], dbMatch: 'Sodium Lauryl Sulfate' },
    { keywords: ['sodium laureth sulfate', 'sles'], dbMatch: 'Sodium Laureth Sulfate' },
    { keywords: ['dimethicone', 'silicone'], dbMatch: 'Silicone' },
    { keywords: ['paraben', 'methylparaben', 'propylparaben'], dbMatch: 'Parabens' },
    { keywords: ['cocamidopropyl betaine'], dbMatch: 'Cocamidopropyl Betaine' },
    
    // Other common materials
    { keywords: ['aluminum', 'aluminium'], dbMatch: 'Aluminum' },
    { keywords: ['glass'], dbMatch: 'Glass' },
    { keywords: ['paper', 'cardboard'], dbMatch: 'Paper' },
    { keywords: ['steel', 'tin'], dbMatch: 'Steel' },
  ];

  for (const pattern of materialPatterns) {
    const found = pattern.keywords.some(keyword => analysisText.includes(keyword));
    
    if (found && !detectedMaterials.has(pattern.dbMatch)) {
      detectedMaterials.add(pattern.dbMatch);
      
      // Match against BioLens materials database
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
          source: 'detected',
          confidence: 0.8
        });
      }
    }
  }

  return materials;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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

function convertInferredMaterialsToStandardFormat(inferredData) {
  if (!inferredData || !inferredData.materials) return [];
  
  return inferredData.materials.map(material => ({
    name: material.material,
    component: material.component,
    family: 'Inferred',
    petroloadScore: material.petroload,
    likelihood: material.likelihood,
    summary: material.description,
    source: 'inferred',
    confidence: inferredData.confidence
  }));
}

function calculateConfidenceLevel(productResult, companyInfo, inferredData) {
  // High confidence: Curated data or detailed ingredient lists
  if (productResult.source === 'BioLens Database (Curated)' || 
      (productResult.materials && productResult.materials.length > 0)) {
    return 'high';
  }
  
  // Medium confidence: Product found with category inference
  if (productResult.product && productResult.product.category && inferredData) {
    return 'medium';
  }
  
  // Low confidence: Company-only or generic inference
  return 'low';
}

// ═══════════════════════════════════════════════════════════════
// ✅ ENHANCED MATERIAL SEARCH (Available for Future Use - Maintained)
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

// ═══════════════════════════════════════════════════════════════
// 🛒 ALTERNATIVE PRODUCTS (Maintained for Compatibility)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// 🌍 GLOBAL IMPACT COUNTERS (Maintained)
// ═══════════════════════════════════════════════════════════════

export async function fetchGlobalImpact() {
  const { data, error } = await supabase.rpc("get_global_impact_counters");
  
  if (error) { 
    console.error("Impact counters error:", error); 
    return null; 
  }
  
  return data && data.length > 0 ? data[0] : null;
}

// ═══════════════════════════════════════════════════════════════
// 💾 SCAN HISTORY (localStorage - Maintained)
// ═══════════════════════════════════════════════════════════════

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
