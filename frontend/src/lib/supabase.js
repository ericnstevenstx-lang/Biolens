import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// ✅ ENHANCED MATERIAL INTELLIGENCE FUNCTIONS
// ============================================================================

/**
 * 🔍 Smart material search with fuzzy matching and alternatives count
 * Handles typos, partial matches, and returns sustainable alternatives info
 */
export async function searchMaterialsEnhanced(query, limit = 12) {
  // Return featured materials when no query provided
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
      // Fallback to basic search if RPC fails
      return basicMaterialSearch(query, limit);
    }

    return data || [];
  } catch (error) {
    console.error('Search failed:', error);
    return basicMaterialSearch(query, limit);
  }
}

/**
 * 📄 Get complete material details with sustainable alternatives
 * Returns both material info and array of better alternatives
 */
export async function getMaterialWithAlternatives(materialId) {
  if (!materialId) {
    console.error('Material ID is required');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('get_material_with_alternatives', {
      material_uuid: materialId
    });

    if (error) {
      console.error('Material details error:', error);
      return getBasicMaterialDetails(materialId);
    }

    return data;
  } catch (error) {
    console.error('Material details failed:', error);
    return getBasicMaterialDetails(materialId);
  }
}

/**
 * ⭐ Get featured high-impact materials for homepage/explore page
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
    
    // Add alternatives_count for compatibility with search results
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
 * 📊 Log user interactions for analytics (optional - only works with auth)
 */
export async function logUserInteraction(materialId, interactionType, context = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      // No user session - skip logging (not an error)
      return false;
    }

    const { error } = await supabase.rpc('log_user_interaction', {
      p_user_id: session.user.id,
      p_material_id: materialId,
      p_interaction_type: interactionType,
      p_context: context
    });

    return !error;
  } catch (error) {
    console.warn('Interaction logging failed:', error);
    return false;
  }
}

// ============================================================================
// 🔄 FALLBACK FUNCTIONS (Used when enhanced functions fail)
// ============================================================================

async function basicMaterialSearch(query, limit) {
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
      .ilike('material_name', `%${query}%`)
      .limit(limit);

    if (error) throw error;
    
    // Add missing fields for compatibility
    return (data || []).map(material => ({
      ...material,
      alternatives_count: 0,
      match_type: 'basic'
    }));
  } catch (error) {
    console.error('Basic search error:', error);
    return [];
  }
}

async function getBasicMaterialDetails(materialId) {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (error) throw error;
    
    // Format to match enhanced structure
    return {
      material: {
        id: data.id,
        name: data.material_name,
        family: data.material_family,
        description: data.description,
        common_uses: data.common_uses,
        environmental_notes: data.environmental_notes,
        consumer_summary: data.consumer_facing_summary,
        risk_level: data.risk_level,
        scores: {
          petroload: data.petroload_score,
          biodegradability: data.biodegradability_score,
          toxicity: data.toxicity_score,
          microplastic_risk: data.microplastic_risk_score,
          water_intensity: data.water_intensity_score,
          land_use: data.land_use_score
        },
        flags: {
          petro_based: data.petro_based_flag,
          plant_based: data.plant_based_flag,
          bio_based: data.bio_based_flag,
          natural: data.natural_material_flag
        }
      },
      alternatives: [] // No alternatives in fallback mode
    };
  } catch (error) {
    console.error('Basic material details error:', error);
    return null;
  }
}

// ============================================================================
// 🎨 UTILITY FUNCTIONS FOR UI COMPONENTS
// ============================================================================

/**
 * Get impact level styling and text from petroload score
 */
export function getImpactLevel(score) {
  if (score >= 0.8) {
    return {
      text: 'High Impact',
      level: 'high',
      class: 'bg-red-500 text-white',
      color: 'red'
    };
  }
  if (score >= 0.5) {
    return {
      text: 'Medium Impact', 
      level: 'medium',
      class: 'bg-yellow-500 text-white',
      color: 'yellow'
    };
  }
  return {
    text: 'Low Impact',
    level: 'low', 
    class: 'bg-green-500 text-white',
    color: 'green'
  };
}

/**
 * Format score as percentage string
 */
export function formatScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score * 100)}%`;
}
