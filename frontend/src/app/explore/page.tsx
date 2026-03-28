import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

type MaterialCard = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  petroload: number | null;
};

async function getMaterials(): Promise<MaterialCard[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("materials")
      .select("id, material_name, material_family, petroload_score, consumer_facing_summary, risk_level")
      .eq("review_status", "published")
      .not("consumer_facing_summary", "is", null)
      .order("material_name", { ascending: true })
      .limit(200);

    if (error || !data) return [];

    return data.map((item: any) => ({
      slug: String(item.material_name ?? "").trim(),
      name: String(item.material_name ?? "Unknown Material"),
      category: String(item.material_family ?? "Material"),
      summary: String(item.consumer_facing_summary ?? "Material intelligence profile coming online."),
      petroload: item.petroload_score != null ? Math.round(Number(item.petroload_score) * 100) : null,
    }));
  } catch {
    return [];
  }
}

function petroLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score <= 20) return "Bio-Based";
  if (score <= 50) return "Bridge";
  if (score <= 80) return "Synthetic";
  return "Petrochemical";
}

export default async function ExplorePage() {
  const materials = await getMaterials();

  return (
    <main className="min-h-screen bg-[#06131f] text-white">
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <div className="mb-3 text-xs uppercase tracking-[0.28em] text-cyan-300/80">
            Explore Materials
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Material intelligence library
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
            Browse the materials BioLens uses to classify petrochemical
            dependency, replacement potential, and product risk.
          </p>
        </div>

        {materials.length === 0 ? (
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1b2b] p-8 text-slate-300">
            No published materials available yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
              <article
                key={material.slug || material.name}
                className="rounded-2xl border border-cyan-500/20 bg-[#0a1b2b] p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.03)]"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                    {material.category}
                  </span>
                  <span className="text-sm text-slate-300">
                    {petroLabel(material.petroload)}
                  </span>
                </div>

                <h2 className="text-2xl font-semibold tracking-tight">
                  {material.name}
                </h2>

                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-300">
                  {material.summary}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Petroload:{" "}
                    <span className="font-medium text-white">
                      {material.petroload === null ? "Unknown" : material.petroload}
                    </span>
                  </div>

                  <Link
                    href={`/?q=${encodeURIComponent(material.name)}`}
                    className="rounded-full border border-cyan-400/20 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/10"
                  >
                    Analyze
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
