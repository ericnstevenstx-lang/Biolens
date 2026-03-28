import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    "";
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    if (!supabaseUrl || !supabaseKey) {
          return NextResponse.json(
            { success: false, error: "Supabase env vars not configured" },
            { status: 500 }
                );
    }

  try {
        const { data, error } = await supabase
          .from("materials")
          .select(
                    `id,
                             material_name,
                                      material_family,
                                               petroload_score,
                                                        biodegradability_score,
                                                                 toxicity_score,
                                                                          microplastic_risk_score,
                                                                                   risk_level,
                                                                                            consumer_facing_summary,
                                                                                                     description,
                                                                                                              petro_based_flag,
                                                                                                                       bio_based_flag,
                                                                                                                                transition_flag,
                                                                                                                                         synthetic_flag,
                                                                                                                                                  plant_based_flag`
                  )
          .eq("review_status", "published")
          .order("material_name", { ascending: true });

      if (error) throw error;

      return NextResponse.json({ success: true, materials: data || [] });
  } catch (e) {
        console.error("materials/browse error:", e);
        return NextResponse.json(
          { success: false, error: "Failed to load materials" },
          { status: 500 }
              );
  }
}
