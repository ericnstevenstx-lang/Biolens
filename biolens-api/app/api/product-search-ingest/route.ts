import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

type Result = {
  source_url: string;
  retailer_name?: string | null;
  brand_name?: string | null;
  product_title?: string | null;

  gtin?: string | null;
  upc?: string | null;
  ean?: string | null;

  description_text?: string | null;
  materials_text?: string | null;

  country_of_origin?: string | null;
  manufacturing_country?: string | null;
  brand_country?: string | null;

  image_url?: string | null;
  raw_payload?: Record<string, unknown> | null;
};

type Payload = {
  query: string;
  source?: string;
  results: Result[];
};

function norm(v?: string | null) {
  return v?.trim() || null;
}

function dedupe(r: Result) {
  return createHash("md5")
    .update(`${(r.gtin || "").toLowerCase()}|${r.source_url.toLowerCase()}`)
    .digest("hex");
}

function strong(r: Result) {
  return (
    !!r.source_url &&
    !!r.product_title &&
    (!!r.gtin || !!r.upc || !!r.ean)
  );
}

export async function POST(req: Request) {
  try {
    const url =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return Response.json({ ok: false, error: "Missing Supabase config" }, { status: 500 });
    }

    const sb = createClient(url, key, { auth: { persistSession: false } });

    const body: Payload = await req.json();

    const { data: run } = await sb
      .from("product_search_runs")
      .insert({
        query_text: body.query,
        source_system: body.source || "genspark",
        run_status: "processing",
      })
      .select("id")
      .single();

    let staged = 0;
    let promoted = 0;
    let review = 0;
    let skipped = 0;
    const errors: any[] = [];

    for (const r of body.results) {
      try {
        const hash = dedupe(r);

        const { data: exists } = await sb
          .from("product_candidate_staging")
          .select("id")
          .eq("dedupe_hash", hash)
          .maybeSingle();

        if (exists) {
          skipped++;
          continue;
        }

        const { data: stage } = await sb
          .from("product_candidate_staging")
          .insert({
            search_run_id: run.id,
            source_url: r.source_url,
            product_title: norm(r.product_title),
            brand_name: norm(r.brand_name),
            gtin: norm(r.gtin),
            description_text: norm(r.description_text),
            materials_text: norm(r.materials_text),
            dedupe_hash: hash,
            review_status: "draft",
          })
          .select("id")
          .single();

        staged++;

        // ===== AUTO PROMOTE ATTEMPT =====
        if (strong(r)) {
          try {
            let productId: string | null = null;

            if (r.gtin) {
              const { data: found } = await sb
                .from("products")
                .select("id")
                .eq("gtin", r.gtin)
                .maybeSingle();

              if (found) productId = found.id;
            }

            if (!productId) {
              const { data: created } = await sb
                .from("products")
                .insert({
                  gtin: r.gtin || null,
                  digital_link_url: r.source_url,
                })
                .select("id")
                .single();

              productId = created.id;
            }

            // SAFE SOURCE TYPE
            await sb.from("sources").insert({
              source_url: r.source_url,
              source_type: "retailer",
              extraction_method: "genspark",
            });

            // SAFE ORIGIN SIGNAL
            await sb.from("product_origin_signals").insert({
              product_id: productId,
              country_of_origin: r.country_of_origin || null,
              confidence_score: 0.8, // passes constraint
            });

            await sb
              .from("product_candidate_staging")
              .update({
                review_status: "auto_approved",
                approved_product_id: productId,
              })
              .eq("id", stage.id);

            promoted++;
          } catch (e) {
            // FAIL SAFE → REVIEW
            await sb
              .from("product_candidate_staging")
              .update({
                review_status: "review_ready",
              })
              .eq("id", stage.id);

            review++;
          }
        } else {
          await sb
            .from("product_candidate_staging")
            .update({
              review_status: "review_ready",
            })
            .eq("id", stage.id);

          review++;
        }
      } catch (err) {
        errors.push(err);
      }
    }

    await sb
      .from("product_search_runs")
      .update({
        run_status: errors.length ? "completed_with_errors" : "completed",
      })
      .eq("id", run.id);

    return Response.json({
      ok: true,
      totals: {
        staged,
        promoted,
        review,
        skipped,
        errors: errors.length,
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
