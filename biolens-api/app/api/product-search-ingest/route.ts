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

type JsonRecord = Record<string, unknown>;

function norm(v?: string | null): string | null {
  return v?.trim() || null;
}

function dedupe(r: Result): string {
  return createHash("md5")
    .update(`${(r.gtin || "").toLowerCase()}|${r.source_url.toLowerCase()}`)
    .digest("hex");
}

function strong(r: Result): boolean {
  return !!r.source_url && !!r.product_title && (!!r.gtin || !!r.upc || !!r.ean);
}

function mapSourceType(url: string): "retailer" | "marketplace" | "brand_site" | "other" {
  const lower = url.toLowerCase();

  if (
    lower.includes("amazon.") ||
    lower.includes("walmart.") ||
    lower.includes("target.") ||
    lower.includes("costco.") ||
    lower.includes("homedepot.") ||
    lower.includes("lowes.")
  ) {
    return "retailer";
  }

  if (
    lower.includes("etsy.") ||
    lower.includes("ebay.") ||
    lower.includes("aliexpress.") ||
    lower.includes("temu.") ||
    lower.includes("mercari.")
  ) {
    return "marketplace";
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname) return "brand_site";
  } catch {
    return "other";
  }

  return "other";
}

function safeConfidenceValue(
  sourceType: "retailer" | "marketplace" | "brand_site" | "other"
): "verified" | "inferred" | "estimated" | "unknown" {
  switch (sourceType) {
    case "retailer":
      return "inferred";
    case "brand_site":
      return "inferred";
    case "marketplace":
      return "estimated";
    default:
      return "unknown";
  }
}

function assertPayload(body: unknown): Payload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON body.");
  }

  const payload = body as Partial<Payload>;

  if (!payload.query || typeof payload.query !== "string") {
    throw new Error("Missing query.");
  }

  if (!Array.isArray(payload.results)) {
    throw new Error("Missing results array.");
  }

  for (const item of payload.results) {
    if (!item || typeof item !== "object" || !("source_url" in item)) {
      throw new Error("Each result must include source_url.");
    }
  }

  return {
    query: payload.query.trim(),
    source: payload.source?.trim() || "genspark",
    results: payload.results as Result[],
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return Response.json(
        { ok: false, error: "Missing Supabase config" },
        { status: 500 }
      );
    }

    const sb = createClient(url, key, { auth: { persistSession: false } });
    const body = assertPayload(await req.json());

    const { data: run, error: runError } = await sb
      .from("product_search_runs")
      .insert({
        query_text: body.query,
        source_system: body.source || "genspark",
        run_status: "processing",
        raw_request: body as unknown as JsonRecord,
      })
      .select("id")
      .single();

    if (runError || !run?.id) {
      return Response.json(
        {
          ok: false,
          error: "Failed to create product_search_runs row.",
          details: runError?.message ?? null,
        },
        { status: 500 }
      );
    }

    const runId = String(run.id);

    let staged = 0;
    let promoted = 0;
    let review = 0;
    let skipped = 0;
    let productSourcesInserted = 0;
    let originSignalsInserted = 0;

    const errors: Array<{ source_url: string; error: string }> = [];

    for (const r of body.results) {
      try {
        const hash = dedupe(r);

        const { data: exists, error: existsError } = await sb
          .from("product_candidate_staging")
          .select("id")
          .eq("dedupe_hash", hash)
          .maybeSingle();

        if (existsError) {
          throw new Error(`Staging dedupe lookup failed: ${existsError.message}`);
        }

        if (exists) {
          skipped++;
          continue;
        }

        const { data: stage, error: stageInsertError } = await sb
          .from("product_candidate_staging")
          .insert({
            search_run_id: runId,
            source_url: r.source_url,
            product_title: norm(r.product_title),
            brand_name: norm(r.brand_name),
            gtin: norm(r.gtin),
            description_text: norm(r.description_text),
            materials_text: norm(r.materials_text),
            dedupe_hash: hash,
            review_status: "draft",
            raw_payload: (r.raw_payload ?? r) as JsonRecord,
          })
          .select("id")
          .single();

        if (stageInsertError || !stage?.id) {
          throw new Error(`Failed to insert staging row: ${stageInsertError?.message}`);
        }

        staged++;

        if (strong(r)) {
          try {
            let productId: string | null = null;

            if (r.gtin) {
              const { data: found, error: foundError } = await sb
                .from("products")
                .select("id")
                .eq("gtin", r.gtin)
                .maybeSingle();

              if (foundError) {
                throw new Error(`GTIN lookup failed: ${foundError.message}`);
              }

              if (found?.id) {
                productId = String(found.id);
              }
            }

            if (!productId) {
              const { data: created, error: createError } = await sb
                .from("products")
                .insert({
                  gtin: norm(r.gtin),
                  upc: norm(r.upc),
                  ean: norm(r.ean),
                  digital_link_url: r.source_url,
                  product_title: norm(r.product_title),
                  normalized_title: norm(r.product_title)?.toLowerCase() ?? "unknown product",
                  manufacturer_name: norm(r.brand_name),
                  country_of_origin: norm(r.country_of_origin) ?? norm(r.manufacturing_country),
                })
                .select("id")
                .single();

              if (createError || !created?.id) {
                throw new Error(`Failed to insert product: ${createError?.message}`);
              }

              productId = String(created.id);
            }

            const sourceType = mapSourceType(r.source_url);

            const { error: productSourceError } = await sb
              .from("product_sources")
              .insert({
                product_id: productId,
                source_type: sourceType,
                source_url: r.source_url,
                source_domain: (() => {
                  try {
                    return new URL(r.source_url).hostname.replace(/^www\./, "");
                  } catch {
                    return null;
                  }
                })(),
                source_external_id: norm(r.gtin) ?? norm(r.upc) ?? norm(r.ean),
                raw_payload: (r.raw_payload ?? r) as JsonRecord,
              });

            if (!productSourceError) {
              productSourcesInserted++;
            }

            const { data: existingSource, error: existingSourceError } = await sb
              .from("sources")
              .select("id")
              .eq("source_url", r.source_url)
              .maybeSingle();

            if (existingSourceError) {
              throw new Error(`Source lookup failed: ${existingSourceError.message}`);
            }

            if (!existingSource?.id) {
              const { error: canonicalSourceError } = await sb
                .from("sources")
                .insert({
                  source_url: r.source_url,
                  source_type: sourceType,
                  extraction_method: "genspark_ingest",
                });

              if (canonicalSourceError) {
                throw new Error(`Failed to insert canonical source: ${canonicalSourceError.message}`);
              }
            }

            const { error: originError } = await sb
              .from("product_origin_signals")
              .insert({
                product_id: productId,
                manufacturing_country: norm(r.manufacturing_country) ?? norm(r.country_of_origin),
                made_in_claim: norm(r.country_of_origin),
                disclosure_level: "partial",
                confidence: safeConfidenceValue(sourceType),
                is_origin_disclosed: !!(r.country_of_origin || r.manufacturing_country),
                is_marketplace_listing: sourceType === "marketplace",
              });

            if (originError) {
              throw new Error(`Failed to insert origin signal: ${originError.message}`);
            }

            originSignalsInserted++;

            const { error: approveError } = await sb
              .from("product_candidate_staging")
              .update({
                review_status: "auto_approved",
                updated_at: new Date().toISOString(),
              })
              .eq("id", stage.id);

            if (approveError) {
              throw new Error(`Failed to mark auto_approved: ${approveError.message}`);
            }

            promoted++;
          } catch (promotionErr) {
            const { error: fallbackError } = await sb
              .from("product_candidate_staging")
              .update({
                review_status: "review_ready",
                updated_at: new Date().toISOString(),
              })
              .eq("id", stage.id);

            if (fallbackError) {
              throw new Error(`Promotion failed and fallback update failed: ${fallbackError.message}`);
            }

            review++;

            errors.push({
              source_url: r.source_url,
              error:
                promotionErr instanceof Error
                  ? promotionErr.message
                  : "Unknown promotion error",
            });
          }
        } else {
          const { error: reviewError } = await sb
            .from("product_candidate_staging")
            .update({
              review_status: "review_ready",
              updated_at: new Date().toISOString(),
            })
            .eq("id", stage.id);

          if (reviewError) {
            throw new Error(`Failed to mark review_ready: ${reviewError.message}`);
          }

          review++;
        }
      } catch (err) {
        errors.push({
          source_url: r.source_url,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    await sb
      .from("product_search_runs")
      .update({
        run_status: errors.length ? "completed_with_errors" : "completed",
        raw_response: {
          totals: {
            received: body.results.length,
            staged,
            promoted,
            review,
            skipped,
            product_sources_inserted: productSourcesInserted,
            origin_signals_inserted: originSignalsInserted,
            errors: errors.length,
          },
          errors,
        } as JsonRecord,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return Response.json({
      ok: true,
      search_run_id: runId,
      totals: {
        received: body.results.length,
        staged,
        promoted,
        review,
        skipped,
        product_sources_inserted: productSourcesInserted,
        origin_signals_inserted: originSignalsInserted,
        errors: errors.length,
      },
      errors,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Bad request",
      },
      { status: 400 }
    );
  }
}

export async function GET(): Promise<Response> {
  return Response.json(
    {
      ok: true,
      route: "product-search-ingest",
      mode: "hybrid",
      method: "POST",
      message: "Stage first, auto-promote when strong, fallback to review.",
    },
    { status: 200 }
  );
}
