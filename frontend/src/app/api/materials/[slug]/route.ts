import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xjddcvjbpxxmlywgdgfj.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZGRjdmpicHh4bWx5d2dkZ2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDU4ODgsImV4cCI6MjA4ODQ4MTg4OH0.kz1PnKVsGEEhXsp9GLQZTLdhkaZuubLvrkaqy047j7I";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Missing slug parameter" },
      { status: 400 }
    );
  }

  const decoded = decodeURIComponent(slug);

  try {
    /* ---- 1. Fetch the material row ---- */
    const { data: material, error: matErr } = await supabase
      .from("materials")
      .select(
        `id,
         material_name,
         normalized_name,
         slug,
         material_family,
         description,
         common_uses,
         environmental_notes,
         consumer_facing_summary,
         risk_level,
         petroload_score,
         petro_based_flag,
         bio_based_flag,
         synthetic_flag,
         transition_flag,
         plant_based_flag,
         natural_material_flag,
         petro_dependency_ratio,
         biodegradability_score,
         toxicity_score,
         microplastic_risk_score,
         water_intensity_score,
         land_use_score,
         cas_rn,
         inci_name,
         review_status`
      )
      .or(
        `slug.eq.${decoded},normalized_name.eq.${decoded},material_name.ilike.${decoded}`
      )
      .limit(1)
      .maybeSingle();

    if (matErr) throw matErr;

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    /* ---- 2. Concern assessments joined with category names ---- */
    const { data: concerns, error: conErr } = await supabase
      .from("material_concern_assessments")
      .select(
        `id,
         concern_score,
         concern_tier,
         concern_status,
         consumer_facing_note,
         confidence_score,
         primary_exposure_pathways,
         applies_to_finished_good,
         toxicity_concern_categories (
           code,
           name,
           concern_domain,
           description,
           why_it_matters,
           display_order
         )`
      )
      .eq("material_id", material.id)
      .order("concern_score", { ascending: false });

    if (conErr) throw conErr;

    /* ---- 3. Material alternatives ---- */
    const { data: alternatives, error: altErr } = await supabase
      .from("material_alternatives")
      .select(
        `id,
         replacement_reason,
         reason,
         priority_rank,
         priority,
         performance_notes,
         cost_notes,
         product_category_relevance,
         alternative_material:materials!material_alternatives_alternative_material_id_fkey (
           id,
           material_name,
           slug,
           petroload_score,
           bio_based_flag,
           risk_level,
           consumer_facing_summary
         )`
      )
      .eq("material_id", material.id)
      .order("priority_rank", { ascending: true })
      .limit(10);

    if (altErr) throw altErr;

    /* ---- 4. Lifecycle scores ---- */
    const { data: lifecycle, error: lcErr } = await supabase
      .from("lifecycle_scores")
      .select("*")
      .eq("material_id", material.id)
      .maybeSingle();

    if (lcErr) throw lcErr;

    /* ---- 5. Material health score (inverse of avg concern) ---- */
    let materialHealthScore: number | null = null;
    if (concerns && concerns.length > 0) {
      const scored = concerns.filter(
        (c: any) => typeof c.concern_score === "number"
      );
      if (scored.length > 0) {
        const avg =
          scored.reduce((s: number, c: any) => s + Number(c.concern_score), 0) /
          scored.length;
        materialHealthScore = Math.round(100 - avg);
      }
    }

    return NextResponse.json({
      success: true,
      material,
      concerns: concerns || [],
      alternatives: alternatives || [],
      lifecycle: lifecycle || null,
      materialHealthScore,
    });
  } catch (e: any) {
    console.error("materials/[slug] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to load material" },
      { status: 500 }
    );
  }
}
