import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // Try enhanced search first
    const { data, error } = await supabase.rpc(
      "search_materials_with_alternatives",
      { search_term: q, limit_count: 6 }
    );

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return NextResponse.json(
        data.map((m: any) => ({
          label: m.material_name || "",
          materialFamily: m.material_family || null,
          petroloadScore: m.petroload_score != null ? Math.round(m.petroload_score * 100) : null,
          alternativesCount: m.alternatives_count || 0,
        }))
      );
    }

    // Fallback: simple ilike search
    const { data: fallback } = await supabase
      .from("materials")
      .select("material_name, material_family, petroload_score")
      .ilike("material_name", `%${q}%`)
      .order("petroload_score", { ascending: false })
      .limit(6);

    return NextResponse.json(
      (fallback || []).map((m: any) => ({
        label: m.material_name || "",
        materialFamily: m.material_family || null,
        petroloadScore: m.petroload_score != null ? Math.round(m.petroload_score * 100) : null,
        alternativesCount: 0,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
