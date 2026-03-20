import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

type GensparkResult = {
  source_url: string;
  retailer_name?: string | null;
  brand_name?: string | null;
  product_title?: string | null;

  gtin?: string | null;
  upc?: string | null;
  ean?: string | null;

  price_text?: string | null;
  currency_code?: string | null;
  availability_text?: string | null;
  image_url?: string | null;
  category_text?: string | null;

  description_text?: string | null;
  materials_text?: string | null;
  ingredients_text?: string | null;

  country_of_origin?: string | null;
  manufacturing_country?: string | null;
  assembly_country?: string | null;
  ships_from_country?: string | null;
  ships_from_region?: string | null;
  seller_name?: string | null;
  seller_country?: string | null;
  manufacturer_name?: string | null;
  importer_name?: string | null;
  distributor_name?: string | null;
  parent_company?: string | null;

  made_in_claim?: string | null;
  ships_from_claim?: string | null;
  sold_by_claim?: string | null;
  imported_by_claim?: string | null;
  designed_in_claim?: string | null;

  disclosure_level?: "none" | "partial" | "full" | null;
  confidence?: "low" | "medium" | "high" | null;
  is_origin_disclosed?: boolean | null;
  is_third_party_seller?: boolean | null;
  is_marketplace_listing?: boolean | null;

  claims?: string[] | null;
  certifications?: string[] | null;

  raw_payload?: Record<string, unknown> | null;
};

type GensparkPayload = {
  query: string;
  source?: string;
  results: GensparkResult[];
};

type JsonRecord = Record<string, unknown>;

function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length ? cleaned : null;
}

function normalizeKeyText(value: string | null | undefined): string | null {
  const cleaned = normalizeText(value);
  return cleaned ? cleaned.toLowerCase() : null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "tag",
      "psc",
    ];

    for (const key of trackingParams) {
      parsed.searchParams.delete(key);
    }

    const search = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return trimmed;
  }
}

function getSourceDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function mapSourceType(url: string | null | undefined): string {
  const domain = getSourceDomain(url) ?? "";

  if (
    domain.includes("amazon.") ||
    domain.includes("walmart.") ||
    domain.includes("target.") ||
    domain.includes("costco.") ||
    domain.includes("homedepot.") ||
    domain.includes("lowes.")
  ) {
    return "retailer";
  }

  if (
    domain.includes("etsy.") ||
    domain.includes("ebay.") ||
    domain.includes("aliexpress.") ||
    domain.includes("temu.") ||
    domain.includes("mercari.")
  ) {
    return "marketplace";
  }

  if (domain) {
    return "manufacturer";
  }

  return "other";
}

function mapCanonicalSourceType(sourceType: string): string {
  switch (sourceType) {
    case "retailer":
      return "retailer";
    case "marketplace":
      return "marketplace";
    case "manufacturer":
      return "brand_site";
    default:
      return "other";
  }
}

function makeDedupeHash(result: GensparkResult): string {
  const identity = [
    normalizeKeyText(result.gtin) ?? "",
    normalizeKeyText(result.upc) ?? "",
    normalizeKeyText(result.ean) ?? "",
    normalizeUrl(result.source_url)?.toLowerCase() ?? "",
  ].join("|");

  return createHash("md5").update(identity).digest("hex");
}

function buildCanonicalKey(result: GensparkResult): string | null {
  const gtin = normalizeKeyText(result.gtin);
  if (gtin) return `gtin:${gtin}`;

  const upc = normalizeKeyText(result.upc);
  if (upc) return `upc:${upc}`;

  const ean = normalizeKeyText(result.ean);
  if (ean) return `ean:${ean}`;

  const domain = getSourceDomain(result.source_url);
  const title = normalizeKeyText(result.product_title);
  const brand = normalizeKeyText(result.brand_name);

  if (domain && title && brand) {
    return `brand_title:${brand}|${title}|${domain}`;
  }

  return null;
}

function mapSourcePriorityScore(sourceType: string): number {
  switch (sourceType) {
    case "manufacturer":
      return 0.9;
    case "retailer":
      return 0.75;
    case "marketplace":
      return 0.45;
    default:
      return 0.5;
  }
}

function mapIdentityConfidence(result: GensparkResult, sourceType: string): number {
  if (normalizeText(result.gtin)) return 0.95;
  if (normalizeText(result.upc) || normalizeText(result.ean)) return 0.9;
  if (sourceType === "manufacturer") return 0.7;
  if (sourceType === "retailer") return 0.6;
  return 0.4;
}

function mapOriginConfidenceLabel(sourceType: string): "low" | "medium" | "high" {
  switch (sourceType) {
    case "manufacturer":
      return "high";
    case "retailer":
      return "medium";
    case "marketplace":
      return "low";
    default:
      return "low";
  }
}

function mapDisclosureLevel(
  result: GensparkResult,
  sourceType: string
): "none" | "partial" | "full" {
  if (result.disclosure_level) return result.disclosure_level;

  const originSignals = [
    result.country_of_origin,
    result.manufacturing_country,
    result.assembly_country,
    result.ships_from_country,
    result.seller_country,
    result.made_in_claim,
    result.ships_from_claim,
    result.designed_in_claim,
  ].filter(Boolean);

  if (originSignals.length >= 3) return "full";
  if (originSignals.length >= 1) return "partial";

  return sourceType === "manufacturer" ? "partial" : "none";
}

function isTrustedAutoPromoteCandidate(result: GensparkResult, sourceType: string): boolean {
  const hasBarcode =
    !!normalizeText(result.gtin) ||
    !!normalizeText(result.upc) ||
    !!normalizeText(result.ean);

  const hasTitle = !!normalizeText(result.product_title);
  const hasUrl = !!normalizeUrl(result.source_url);

  if (!hasTitle || !hasUrl) return false;

  return hasBarcode && (sourceType === "retailer" || sourceType === "manufacturer");
}

function assertPayload(body: unknown): GensparkPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON body.");
  }

  const payload = body as Partial<GensparkPayload>;

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
    results: payload.results as GensparkResult[],
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        {
          ok: false,
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const payload = assertPayload(await req.json());

    const { data: runRow, error: runError } = await supabase
      .from("product_search_runs")
      .insert({
        query_text: payload.query,
        source_system: payload.source,
        run_status: "processing",
        raw_request: payload as unknown as JsonRecord,
      })
      .select("id")
      .single();

    if (runError || !runRow) {
      return Response.json(
        {
          ok: false,
          error: "Failed to create product_search_runs row.",
          details: runError?.message ?? null,
        },
        { status: 500 }
      );
    }

    const searchRunId = String(runRow.id);

    let stagedCount = 0;
    let skippedDuplicates = 0;
    let autoPromotedCount = 0;
    let reviewReadyCount = 0;
    let productSourceInsertedCount = 0;
    let originSignalInsertedCount = 0;

    const errors: Array<{ source_url: string; error: string }> = [];

    for (const result of payload.results) {
      const originalSourceUrl = result.source_url;

      try {
        const sourceUrl = normalizeUrl(result.source_url);
        if (!sourceUrl) {
          throw new Error("Invalid source_url.");
        }

        const sourceDomain = getSourceDomain(sourceUrl);
        const sourceType = mapSourceType(sourceUrl);
        const normalizedTitle = normalizeKeyText(result.product_title);
        const dedupeHash = makeDedupeHash({ ...result, source_url: sourceUrl });

        const { data: existingStage, error: existingStageError } = await supabase
          .from("product_candidate_staging")
          .select("id")
          .eq("dedupe_hash", dedupeHash)
          .maybeSingle();

        if (existingStageError) {
          throw new Error(`Staging dedupe lookup failed: ${existingStageError.message}`);
        }

        if (existingStage?.id) {
          skippedDuplicates += 1;
          continue;
        }

        const stageInsert = {
          search_run_id: searchRunId,
          source_url: sourceUrl,
          retailer_name: normalizeText(result.retailer_name),
          brand_name: normalizeText(result.brand_name),
          product_title: normalizeText(result.product_title),
          normalized_title: normalizedTitle,
          gtin: normalizeText(result.gtin),
          price_text: normalizeText(result.price_text),
          currency_code: normalizeKeyText(result.currency_code),
          availability_text: normalizeText(result.availability_text),
          image_url: normalizeUrl(result.image_url),
          category_text: normalizeText(result.category_text),
          description_text: normalizeText(result.description_text),
          materials_text: normalizeText(result.materials_text),
          ingredients_text: normalizeText(result.ingredients_text),
          raw_payload: (result.raw_payload ?? result) as JsonRecord,
          dedupe_hash: dedupeHash,
          review_status: "draft",
        };

        const { data: stageRow, error: stageInsertError } = await supabase
          .from("product_candidate_staging")
          .insert(stageInsert)
          .select("id")
          .single();

        if (stageInsertError || !stageRow) {
          throw new Error(`Failed to insert staging row: ${stageInsertError?.message}`);
        }

        stagedCount += 1;

        let productId: string | null = null;

        const gtin = normalizeText(result.gtin);
        const upc = normalizeText(result.upc);
        const ean = normalizeText(result.ean);
        const canonicalKey = buildCanonicalKey({ ...result, source_url: sourceUrl });

        if (gtin) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("gtin", gtin)
            .maybeSingle();

          if (error) throw new Error(`GTIN lookup failed: ${error.message}`);
          if (data?.id) productId = String(data.id);
        }

        if (!productId && upc) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("upc", upc)
            .maybeSingle();

          if (error) throw new Error(`UPC lookup failed: ${error.message}`);
          if (data?.id) productId = String(data.id);
        }

        if (!productId && ean) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("ean", ean)
            .maybeSingle();

          if (error) throw new Error(`EAN lookup failed: ${error.message}`);
          if (data?.id) productId = String(data.id);
        }

        if (!productId && canonicalKey) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("canonical_key", canonicalKey)
            .maybeSingle();

          if (error) throw new Error(`Canonical key lookup failed: ${error.message}`);
          if (data?.id) productId = String(data.id);
        }

        if (!productId) {
          const { data, error } = await supabase
            .from("products")
            .select("id")
            .eq("digital_link_url", sourceUrl)
            .maybeSingle();

          if (error) throw new Error(`URL lookup failed: ${error.message}`);
          if (data?.id) productId = String(data.id);
        }

        const canAutoPromote = isTrustedAutoPromoteCandidate(
          { ...result, source_url: sourceUrl },
          sourceType
        );

        if (!productId && canAutoPromote) {
          const productInsert = {
            gtin,
            upc,
            ean,
            digital_link_url: sourceUrl,
            manufacturer_name:
              normalizeText(result.manufacturer_name) ?? normalizeText(result.brand_name),
            product_title: normalizeText(result.product_title),
            normalized_title:
              normalizedTitle ?? normalizeKeyText(result.product_title) ?? "unknown product",
            country_of_origin:
              normalizeText(result.country_of_origin) ??
              normalizeText(result.manufacturing_country),
            identity_confidence: mapIdentityConfidence(result, sourceType),
            source_priority_score: mapSourcePriorityScore(sourceType),
            canonical_key: canonicalKey,
            source_type: sourceType,
            source_id: sourceDomain,
            image_url: normalizeUrl(result.image_url),
          };

          const { data: newProduct, error: productInsertError } = await supabase
            .from("products")
            .insert(productInsert)
            .select("id")
            .single();

          if (productInsertError || !newProduct) {
            throw new Error(`Failed to insert product: ${productInsertError?.message}`);
          }

          productId = String(newProduct.id);
        }

        if (productId) {
          const sourcePayload = {
            product_id: productId,
            source_type: sourceType,
            source_url: sourceUrl,
            source_domain: sourceDomain,
            source_external_id: gtin ?? upc ?? ean ?? null,
            raw_payload: (result.raw_payload ?? result) as JsonRecord,
          };

          const { error: productSourceError } = await supabase
            .from("product_sources")
            .insert(sourcePayload);

          if (!productSourceError) {
            productSourceInsertedCount += 1;
          }

          const { data: existingSource, error: existingSourceError } = await supabase
            .from("sources")
            .select("id")
            .eq("source_url", sourceUrl)
            .maybeSingle();

          if (existingSourceError) {
            throw new Error(`Source registry lookup failed: ${existingSourceError.message}`);
          }

          if (!existingSource?.id) {
            const { error: sourceInsertError } = await supabase
              .from("sources")
              .insert({
                source_url: sourceUrl,
                source_domain: sourceDomain,
                source_type: mapCanonicalSourceType(sourceType),
                extraction_method: "genspark_ingest",
                reliability_score:
                  sourceType === "manufacturer"
                    ? 0.9
                    : sourceType === "retailer"
                    ? 0.75
                    : sourceType === "marketplace"
                    ? 0.45
                    : 0.5,
                accessed_at: new Date().toISOString(),
                publisher_name:
                  normalizeText(result.retailer_name) ?? normalizeText(result.brand_name),
              });

            if (sourceInsertError) {
              throw new Error(`Failed to insert canonical source: ${sourceInsertError.message}`);
            }
          }

          const { error: originInsertError } = await supabase
            .from("product_origin_signals")
            .insert({
              product_id: productId,
              manufacturing_country:
                normalizeText(result.manufacturing_country) ??
                normalizeText(result.country_of_origin),
              assembly_country: normalizeText(result.assembly_country),
              ships_from_country: normalizeText(result.ships_from_country),
              ships_from_region: normalizeText(result.ships_from_region),
              seller_name:
                normalizeText(result.seller_name) ?? normalizeText(result.retailer_name),
              seller_country: normalizeText(result.seller_country),
              manufacturer_name:
                normalizeText(result.manufacturer_name) ?? normalizeText(result.brand_name),
              importer_name: normalizeText(result.importer_name),
              distributor_name: normalizeText(result.distributor_name),
              parent_company: normalizeText(result.parent_company),
              made_in_claim:
                normalizeText(result.made_in_claim) ??
                normalizeText(result.country_of_origin),
              ships_from_claim: normalizeText(result.ships_from_claim),
              sold_by_claim:
                normalizeText(result.sold_by_claim) ?? normalizeText(result.retailer_name),
              imported_by_claim: normalizeText(result.imported_by_claim),
              designed_in_claim: normalizeText(result.designed_in_claim),
              disclosure_level: mapDisclosureLevel(result, sourceType),
              confidence: result.confidence ?? mapOriginConfidenceLabel(sourceType),
              is_origin_disclosed:
                result.is_origin_disclosed ??
                Boolean(
                  result.country_of_origin ||
                    result.manufacturing_country ||
                    result.made_in_claim
                ),
              is_third_party_seller: result.is_third_party_seller ?? null,
              is_marketplace_listing:
                result.is_marketplace_listing ?? sourceType === "marketplace",
            });

          if (originInsertError) {
            throw new Error(`Failed to insert origin signal: ${originInsertError.message}`);
          }

          originSignalInsertedCount += 1;

          const { error: stageUpdateError } = await supabase
            .from("product_candidate_staging")
            .update({
              review_status: "auto_approved",
              updated_at: new Date().toISOString(),
            })
            .eq("id", stageRow.id);

          if (stageUpdateError) {
            throw new Error(`Failed to mark staging row auto_approved: ${stageUpdateError.message}`);
          }

          autoPromotedCount += 1;
        } else {
          const { error: stageReviewError } = await supabase
            .from("product_candidate_staging")
            .update({
              review_status: "review_ready",
              updated_at: new Date().toISOString(),
            })
            .eq("id", stageRow.id);

          if (stageReviewError) {
            throw new Error(`Failed to mark staging row review_ready: ${stageReviewError.message}`);
          }

          reviewReadyCount += 1;
        }
      } catch (err) {
        errors.push({
          source_url: originalSourceUrl,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const finalRunStatus = errors.length > 0 ? "completed_with_errors" : "completed";

    await supabase
      .from("product_search_runs")
      .update({
        run_status: finalRunStatus,
        raw_response: {
          totals: {
            received: payload.results.length,
            staged: stagedCount,
            skipped_duplicates: skippedDuplicates,
            auto_promoted: autoPromotedCount,
            review_ready: reviewReadyCount,
            product_sources_inserted: productSourceInsertedCount,
            origin_signals_inserted: originSignalInsertedCount,
            errors: errors.length,
          },
          errors,
        } as JsonRecord,
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchRunId);

    return Response.json({
      ok: true,
      search_run_id: searchRunId,
      totals: {
        received: payload.results.length,
        staged: stagedCount,
        skipped_duplicates: skippedDuplicates,
        auto_promoted: autoPromotedCount,
        review_ready: reviewReadyCount,
        product_sources_inserted: productSourceInsertedCount,
        origin_signals_inserted: originSignalInsertedCount,
        errors: errors.length,
      },
      errors,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
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
      method: "POST",
      message: "Use POST with a Genspark payload.",
    },
    { status: 200 }
  );
}
