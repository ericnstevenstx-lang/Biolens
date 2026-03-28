import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import {
  enrichByProductId,
  enrichByMaterialNames,
  normalizeIntelligence,
  fetchConcernAssessmentsForMaterials,
  resolveCapitalFlow,
  fetchPoliticalActivity,
} from "@/lib/intelligence/enrich";

type InputType = "barcode" | "amazon" | "url" | "search";

interface IntakeRequest {
  inputType: InputType;
  value: string;
}

interface ExtractedProduct {
  title?: string;
  brand?: string;
  category?: string;
  description?: string;
  bullets?: string[];
  countryOfOrigin?: string;
  shipsFrom?: string;
  soldBy?: string;
  manufacturer?: string;
  imageUrl?: string;
  asin?: string;
  rawPayload?: Record<string, unknown>;
  price?: number;
}

interface OriginSignal {
  manufacturing_country?: string;
  ships_from_country?: string;
  seller_name?: string;
  manufacturer_name?: string;
  made_in_claim?: string;
  ships_from_claim?: string;
  sold_by_claim?: string;
  disclosure_level: "full" | "partial" | "none";
  confidence: number;
  is_origin_disclosed: boolean;
  is_third_party_seller: boolean;
  is_marketplace_listing: boolean;
}

interface OriginFlag {
  flag_code: string;
  flag_label: string;
  severity: "info" | "warning" | "critical";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function buildCanonicalKey(type: InputType, value: string, asin?: string): string {
  if (type === "amazon") return `amazon:${asin ?? hash(value)}`;
  if (type === "barcode") return `barcode:${value.trim()}`;
  if (type === "url") return `url:${hash(value)}`;
  return `search:${hash(value)}`;
}

function extractAsin(url: string): string | undefined {
  const patterns = [
    /dp\/([A-Z0-9]{10})/i,
    /gp\/product\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  return undefined;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractFromHtml(html: string, pattern: RegExp): string | undefined {
  return pattern
    .exec(html)?.[1]
    ?.replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, "")
    .trim();
}

function parseAmazonHtml(html: string, asin: string, rawUrl: string): ExtractedProduct {
  const title = extractFromHtml(
    html,
    /<span[^>]+id="productTitle"[^>]*>\s*([\s\S]*?)\s*</i
  );
  let brand = extractFromHtml(
    html,
    /id="bylineInfo"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</i
  ) || extractFromHtml(html, /"brand"\s*:\s*"([^"]+)"/i);
  // Clean up "Visit the X Store" -> "X"
  if (brand) {
    brand = brand.replace(/^Visit the\s+/i, "").replace(/\s+Store$/i, "").trim();
  }
  const imageUrl = extractFromHtml(
    html,
    /id="landingImage"[^>]+src="([^"]+)"/i
  ) || extractFromHtml(html, /"large"\s*:\s*"([^"]+)"/i);
  const countryOfOrigin = extractFromHtml(
    html,
    /Country of Origin[^:]*:\s*<[^>]+>\s*([^<\n]{2,60})/i
  );
  const shipsFrom = extractFromHtml(
    html,
    /Ships from[^:]*:\s*<[^>]+>\s*([^<\n]{2,60})/i
  );
  const soldBy = extractFromHtml(
    html,
    /Sold by[^:]*:\s*<[^>]+>\s*<a[^>]*>([^<]+)</i
  );

  // Extract material/fabric from product details table (Amazon uses th/td format)
  const material = extractFromHtml(
    html,
    /Fabric Type\s*<\/th>\s*<td[^>]*>\s*([^<]{2,120})/i
  ) || extractFromHtml(
    html,
    /Material Type\s*<\/th>\s*<td[^>]*>\s*([^<]{2,120})/i
  ) || extractFromHtml(
    html,
    /(?:Material|Fabric Type|Material Type)[^:]*<\/span>\s*<span[^>]*>\s*([^<]{2,80})/i
  ) || extractFromHtml(
    html,
    /"material"\s*:\s*"([^"]+)"/i
  );

  // Extract category from breadcrumbs or JSON-LD
  const category = extractFromHtml(
    html,
    /class="a-link-normal a-color-tertiary"[^>]*>\s*([^<]{2,50})\s*</i
  ) || extractFromHtml(
    html,
    /"category"\s*:\s*"([^"]+)"/i
  );

  // Extract price
  const priceStr = extractFromHtml(
    html,
    /class="a-price-whole"[^>]*>(\d+)/i
  );

  // Extract description
  const description = extractFromHtml(
    html,
    /id="productDescription"[^>]*>[\s\S]*?<p[^>]*>\s*([\s\S]*?)\s*<\/p>/i
  )?.replace(/<[^>]+>/g, "").trim();

  const bullets: string[] = [];
  const bulletPattern = /<span class="a-list-item">\s*([\s\S]*?)\s*</gi;
  let match: RegExpExecArray | null;

  while ((match = bulletPattern.exec(html)) !== null && bullets.length < 8) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 5 && text.length < 300) bullets.push(text);
  }

  // Extract manufacturer from product details table
  const manufacturer = extractFromHtml(
    html,
    /Manufacturer\s*<\/th>\s*<td[^>]*>\s*([^<]{2,80})/i
  );

  // Extract country from product details table
  const countryFromTable = extractFromHtml(
    html,
    /Country of Origin\s*<\/th>\s*<td[^>]*>\s*([^<]{2,60})/i
  );

  // Extract certifications from Amazon's sustainability section only
  // (not the whole page, which mentions FSC in packaging policy text)
  const certifications: string[] = [];
  const sustainabilityMatch = html.match(/Sustainability features[\s\S]{0,3000}?(?=<\/div>\s*<\/div>\s*<\/div>|$)/i);
  const certZone = sustainabilityMatch ? sustainabilityMatch[0] : "";
  // Also check bullet points for cert claims
  const certText = certZone + " " + (bullets || []).join(" ");
  const certPatterns = [
    { pattern: /OEKO-TEX/i, label: "OEKO-TEX" },
    { pattern: /STANDARD 100/i, label: "STANDARD 100" },
    { pattern: /GOTS/i, label: "GOTS Certified" },
    { pattern: /Fair Trade/i, label: "Fair Trade" },
    { pattern: /USDA Organic/i, label: "USDA Organic" },
    { pattern: /Global Recycled Standard/i, label: "GRS Certified" },
    { pattern: /FSC.{0,20}Certified/i, label: "FSC Certified" },
    { pattern: /B Corp/i, label: "B Corp" },
    { pattern: /Cradle to Cradle/i, label: "Cradle to Cradle" },
    { pattern: /GREENGUARD/i, label: "GREENGUARD" },
    { pattern: /CertiPUR/i, label: "CertiPUR-US" },
    { pattern: /bluesign/i, label: "bluesign" },
  ];
  for (const { pattern, label } of certPatterns) {
    if (pattern.test(certText) && !certifications.includes(label)) {
      certifications.push(label);
    }
  }

  // Parse ALL materials from fabric/material type field + title + bullets
  // e.g. "Front: Velvet, Reverse: Washed Microfiber, Filling: Polyester" -> multiple materials
  const allText = [material, title, description, ...(bullets || [])].filter(Boolean).join(" ");
  const inferredMaterial = inferMaterialFromText(allText);
  // Also extract additional materials from the fabric type string
  const additionalMaterials = material ? inferAllMaterialsFromText(material) : [];

  return {
    asin,
    title,
    brand,
    category: category || undefined,
    description: description || undefined,
    imageUrl,
    countryOfOrigin: countryOfOrigin || countryFromTable || undefined,
    shipsFrom,
    soldBy,
    manufacturer: manufacturer || brand || undefined,
    bullets: bullets.length ? bullets : undefined,
    rawPayload: {
      asin,
      url: rawUrl,
      scraped: true,
      extractedMaterial: inferredMaterial || undefined,
      allExtractedMaterials: additionalMaterials.length ? additionalMaterials : undefined,
      fabricType: material || undefined,
      price: priceStr ? Number(priceStr) : undefined,
      certifications: certifications.length ? certifications : undefined,
    },
  };
}

// Infer ALL materials from text (e.g. fabric type field with multiple materials)
function inferAllMaterialsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: string[] = [];
  const materials: [string, string][] = [
    ["100% polyester", "Polyester"],
    ["100% cotton", "Cotton"],
    ["100% nylon", "Nylon"],
    ["polyester", "Polyester"],
    ["cotton", "Cotton"],
    ["microfiber", "Microfiber"],
    ["velvet", "Velvet"],
    ["fleece", "Fleece"],
    ["linen", "Linen"],
    ["silk", "Silk"],
    ["wool", "Wool"],
    ["nylon", "Nylon"],
    ["spandex", "Spandex"],
    ["rayon", "Rayon"],
    ["viscose", "Viscose"],
    ["bamboo", "Bamboo"],
    ["hemp", "Hemp"],
    ["acrylic", "Acrylic"],
    ["satin", "Satin"],
    ["denim", "Denim"],
  ];
  for (const [pattern, name] of materials) {
    if (lower.includes(pattern) && !found.includes(name)) {
      found.push(name);
    }
  }
  return found;
}

// Infer primary material from text content (title, description, bullets)
function inferMaterialFromText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const materials: [string, string][] = [
    ["100% polyester", "Polyester"],
    ["100% cotton", "Cotton"],
    ["100% nylon", "Nylon"],
    ["polyester", "Polyester"],
    ["cotton", "Cotton"],
    ["microfiber", "Microfiber"],
    ["bamboo", "Bamboo"],
    ["linen", "Linen"],
    ["silk", "Silk"],
    ["wool", "Wool"],
    ["acrylic", "Acrylic"],
    ["nylon", "Nylon"],
    ["spandex", "Spandex"],
    ["rayon", "Rayon"],
    ["viscose", "Viscose"],
    ["polyethylene", "Polyethylene"],
    ["polypropylene", "Polypropylene"],
    ["hdpe", "HDPE"],
    ["pvc", "PVC"],
    ["abs", "ABS Plastic"],
    ["silicone", "Silicone"],
    ["stainless steel", "Stainless Steel"],
    ["aluminum", "Aluminum"],
    ["glass", "Glass"],
    ["ceramic", "Ceramic"],
    ["rubber", "Rubber"],
    ["latex", "Latex"],
    ["leather", "Leather"],
    ["hemp", "Hemp"],
    ["jute", "Jute"],
    ["velvet", "Velvet"],
    ["fleece", "Fleece"],
    ["denim", "Denim"],
    ["canvas", "Canvas"],
    ["twill", "Twill"],
    ["satin", "Satin"],
    ["chiffon", "Chiffon"],
    ["organza", "Organza"],
    ["tulle", "Tulle"],
    ["muslin", "Muslin"],
    ["terry cloth", "Terry Cloth"],
    ["t-shirt", "Cotton"],
    ["tee shirt", "Cotton"],
    ["hoodie", "Cotton"],
    ["sweatshirt", "Cotton"],
    ["jeans", "Denim"],
    ["towel", "Cotton"],
    ["bedsheet", "Cotton"],
    ["bed sheet", "Cotton"],
    ["foam", "Polyurethane Foam"],
    ["memory foam", "Memory Foam"],
    ["plywood", "Plywood"],
    ["mdf", "MDF"],
    ["particleboard", "Particleboard"],
  ];
  // Prefer "100% X" matches first
  for (const [pattern, name] of materials) {
    if (lower.includes(pattern)) return name;
  }
  return null;
}

// Extract product name from Amazon URL slug (e.g. /RECYCO-California-Oversized-Bedspread/dp/...)
function titleFromAmazonUrl(url: string): string | undefined {
  const match = /amazon\.com\/([A-Za-z0-9-]+)\/dp\//i.exec(url);
  if (!match) return undefined;
  return match[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchAmazonProduct(asin: string, rawUrl: string): Promise<ExtractedProduct> {
  // Always extract title from URL as fallback
  const urlTitle = titleFromAmazonUrl(rawUrl);
  const urlMaterial = urlTitle ? inferMaterialFromText(urlTitle) : null;

  try {
    const response = await fetch(`https://www.amazon.com/dp/${asin}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Scraping failed - use URL-derived title + material as fallback
      return {
        asin,
        title: urlTitle || undefined,
        rawPayload: { asin, url: rawUrl, fetchStatus: response.status, extractedMaterial: urlMaterial || undefined },
      };
    }

    const parsed = parseAmazonHtml(await response.text(), asin, rawUrl);
    // Backfill from URL if scraping got empty results
    if (!parsed.title && urlTitle) parsed.title = urlTitle;
    if (!(parsed.rawPayload as any)?.extractedMaterial && urlMaterial) {
      (parsed.rawPayload as any).extractedMaterial = urlMaterial;
    }
    return parsed;
  } catch {
    // Timeout or blocked - use URL-derived data
    return {
      asin,
      title: urlTitle || undefined,
      rawPayload: { asin, url: rawUrl, fetchError: "timeout_or_blocked", extractedMaterial: urlMaterial || undefined },
    };
  }
}

async function fetchGenericUrl(url: string): Promise<ExtractedProduct> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { rawPayload: { url, fetchStatus: response.status } };
    }

    const html = await response.text();
    const extract = (pattern: RegExp): string | undefined =>
      pattern.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim();

    return {
      title:
        extract(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ??
        extract(/<title>([^<]+)</i),
      imageUrl: extract(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i),
      description: extract(
        /<meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]{10,300})"/i
      ),
      rawPayload: { url, scraped: true },
    };
  } catch {
    return { rawPayload: { url, fetchError: "timeout_or_blocked" } };
  }
}

function normalizeTitle(title?: string): string {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function detectGtinType(value: string): { upc?: string; ean?: string; gtin?: string } {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 12) return { upc: cleaned };
  if (cleaned.length === 13) return { ean: cleaned };
  if (cleaned.length === 14) return { gtin: cleaned };
  return {};
}

function buildOriginSignal(extracted: ExtractedProduct): OriginSignal {
  const isThirdPartySeller =
    extracted.soldBy !== undefined &&
    !["amazon", "amazon.com"].some((seller) =>
      extracted.soldBy?.toLowerCase().includes(seller)
    );

  const disclosureLevel: OriginSignal["disclosure_level"] = extracted.countryOfOrigin
    ? "full"
    : extracted.shipsFrom
      ? "partial"
      : "none";

  return {
    manufacturing_country: extracted.countryOfOrigin,
    ships_from_country: extracted.shipsFrom,
    seller_name: extracted.soldBy,
    manufacturer_name: extracted.manufacturer,
    made_in_claim: extracted.countryOfOrigin
      ? `Made in ${extracted.countryOfOrigin}`
      : undefined,
    ships_from_claim: extracted.shipsFrom
      ? `Ships from ${extracted.shipsFrom}`
      : undefined,
    sold_by_claim: extracted.soldBy ? `Sold by ${extracted.soldBy}` : undefined,
    disclosure_level: disclosureLevel,
    confidence: disclosureLevel === "full" ? 0.85 : disclosureLevel === "partial" ? 0.5 : 0.1,
    is_origin_disclosed: Boolean(extracted.countryOfOrigin || extracted.shipsFrom),
    is_third_party_seller: isThirdPartySeller,
    is_marketplace_listing: isThirdPartySeller,
  };
}

function generateFlags(signal: OriginSignal): OriginFlag[] {
  const flags: OriginFlag[] = [];

  if (!signal.is_origin_disclosed) {
    flags.push({
      flag_code: "ORIGIN_NOT_DISCLOSED",
      flag_label: "Country of origin not disclosed",
      severity: "warning",
    });
  }

  if (signal.is_third_party_seller) {
    flags.push({
      flag_code: "THIRD_PARTY_SELLER",
      flag_label: "Product sold by third-party seller",
      severity: "info",
    });
  }

  const originLocation =
    (signal.manufacturing_country ?? signal.ships_from_country ?? "").toLowerCase();

  if (["china", "vietnam", "bangladesh", "cambodia", "indonesia"].some((country) =>
    originLocation.includes(country)
  )) {
    flags.push({
      flag_code: "IMPORT_DEPENDENCY",
      flag_label: `Sourced from import-dependent region: ${
        signal.manufacturing_country ?? signal.ships_from_country
      }`,
      severity: "info",
    });
  }

  return flags;
}

async function upsertProduct(
  inputType: InputType,
  value: string,
  extracted: ExtractedProduct,
  canonicalKey: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const gtinFields = inputType === "barcode" ? detectGtinType(value) : {};

  const { data: existing } = await supabase
    .from("products")
    .select("id, manufacturer_name")
    .eq("canonical_key", canonicalKey)
    .maybeSingle();

  if (existing?.id) {
    // Backfill brand from DB if extraction didn't find one
    if (!extracted.brand && existing.manufacturer_name) {
      extracted.brand = existing.manufacturer_name;
    }
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      canonical_key: canonicalKey,
      product_title: extracted.title ?? value,
      normalized_title: normalizeTitle(extracted.title ?? value),
      manufacturer_name: extracted.manufacturer ?? extracted.brand ?? null,
      country_of_origin: extracted.countryOfOrigin ?? null,
      source_type: inputType,
      source_id: extracted.asin ?? (inputType === "barcode" ? value : null),
      image_url: extracted.imageUrl ?? null,
      ...gtinFields,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Product insert failed: ${error?.message ?? "unknown error"}`);
  }

  return data.id as string;
}

async function insertProductSource(
  productId: string,
  inputType: InputType,
  value: string,
  extracted: ExtractedProduct
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const sourceUrl =
    inputType === "amazon"
      ? `https://www.amazon.com/dp/${extracted.asin}`
      : inputType === "url"
        ? value
        : null;

  await supabase.from("product_sources").insert({
    product_id: productId,
    source_type: inputType,
    source_url: sourceUrl,
    source_domain: sourceUrl ? extractDomain(sourceUrl) : null,
    source_external_id: extracted.asin ?? (inputType === "barcode" ? value : null),
    raw_payload: extracted.rawPayload ?? {},
  });
}

async function insertOriginSignal(productId: string, signal: OriginSignal): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("product_origin_signals").insert({
    product_id: productId,
    ...signal,
  });
}

async function insertOriginFlags(productId: string, flags: OriginFlag[]): Promise<void> {
  if (!flags.length) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("product_origin_flags").insert(
    flags.map((flag) => ({
      product_id: productId,
      ...flag,
    }))
  );
}

function normalizeConfidence(confidence: number): "verified" | "estimated" | "limited" {
  if (confidence > 0.7) return "verified";
  if (confidence > 0.4) return "estimated";
  return "limited";
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value) continue;
    const normalized = String(value).trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function coerceCategory(extracted: ExtractedProduct, value: string): string | null {
  if (extracted.category?.trim()) return extracted.category.trim();

  const query = value.toLowerCase();
  if (
    ["shirt", "jacket", "hoodie", "pants", "sock", "apparel", "fleece", "bag", "tote"].some(
      (term) => query.includes(term)
    )
  ) {
    return "apparel";
  }

  if (["bottle", "container", "storage", "cup"].some((term) => query.includes(term))) {
    return "housewares";
  }

  return null;
}

function safeProductName(extracted: ExtractedProduct, value: string): string {
  const candidate = extracted.title?.trim() ?? value.trim();
  return candidate || "Unknown Product";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: IntakeRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const inputType = body?.inputType;
  const value = body?.value?.trim();

  if (!inputType || !value) {
    return NextResponse.json(
      { success: false, error: "inputType and value are required" },
      { status: 400 }
    );
  }

  if (!["barcode", "amazon", "url", "search"].includes(inputType)) {
    return NextResponse.json(
      { success: false, error: `Unknown inputType: ${inputType}` },
      { status: 400 }
    );
  }

  try {
    let extracted: ExtractedProduct = {};
    let asin: string | undefined;

    if (inputType === "amazon") {
      asin = extractAsin(value);
      if (!asin) {
        return NextResponse.json(
          { success: false, error: "Could not extract ASIN from URL" },
          { status: 422 }
        );
      }
      extracted = await fetchAmazonProduct(asin, value);
    } else if (inputType === "url") {
      extracted = await fetchGenericUrl(value);
    } else if (inputType === "barcode") {
      extracted = { rawPayload: { barcode: value } };
    } else {
      extracted = {
        title: value,
        rawPayload: { query: value },
      };
    }

    const canonicalKey = buildCanonicalKey(inputType, value, asin);
    const productId = await upsertProduct(inputType, value, extracted, canonicalKey);

    // For search products, read manufacturer + country from DB as fallback
    if (!extracted.brand || !extracted.countryOfOrigin) {
      const supabase = await createSupabaseServerClient();
      const { data: prodRow } = await supabase
        .from("products")
        .select("manufacturer_name, country_of_origin")
        .eq("id", productId)
        .maybeSingle();
      if (prodRow) {
        if (!extracted.brand && prodRow.manufacturer_name) {
          extracted.brand = prodRow.manufacturer_name;
        }
        if (!extracted.countryOfOrigin && prodRow.country_of_origin) {
          extracted.countryOfOrigin = prodRow.country_of_origin;
        }
      }
    }

    const originSignal = buildOriginSignal(extracted);
    const originFlags = generateFlags(originSignal);

    await Promise.all([
      insertProductSource(productId, inputType, value, extracted),
      insertOriginSignal(productId, originSignal),
      insertOriginFlags(productId, originFlags),
    ]);

    let intelligence = await enrichByProductId(productId);

    if (intelligence.materials.length === 0) {
      // Build search terms from extracted materials, title, or raw query
      const searchTerms: string[] = [];
      const allMats = (extracted.rawPayload as any)?.allExtractedMaterials as string[] | undefined;
      const extractedMaterial = (extracted.rawPayload as any)?.extractedMaterial;
      // Add individual materials first (most specific)
      if (allMats && allMats.length > 0) {
        for (const mat of allMats) searchTerms.push(mat);
      } else if (extractedMaterial) {
        searchTerms.push(extractedMaterial);
      }
      if (extracted.title && extracted.title !== value) searchTerms.push(extracted.title);
      searchTerms.push(value);

      // Try all extracted material names first, then fall back to title/query
      let fallbackGraphMaterials: any[] = [];
      if (allMats && allMats.length > 0) {
        // Search all extracted materials at once
        fallbackGraphMaterials = await enrichByMaterialNames(allMats);
      }
      if (fallbackGraphMaterials.length === 0) {
        // Fall back: try inferring material from title text, then search
        const titleMaterial = extracted.title ? inferMaterialFromText(extracted.title) : null;
        if (titleMaterial) {
          fallbackGraphMaterials = await enrichByMaterialNames([titleMaterial]);
        }
        // Last resort: search by value (for search inputType)
        if (fallbackGraphMaterials.length === 0 && inputType === "search") {
          fallbackGraphMaterials = await enrichByMaterialNames([value]);
        }
      }

      if (fallbackGraphMaterials.length) {
        const materialNames = fallbackGraphMaterials.map((g: any) => g.material);
        const [concerns, capitalFlow] = await Promise.all([
          fetchConcernAssessmentsForMaterials(materialNames),
          resolveCapitalFlow(productId, null, materialNames),
        ]);
        intelligence = normalizeIntelligence(null, fallbackGraphMaterials, capitalFlow, concerns);
      }
    }

    if (!intelligence.corporate && (extracted.brand || extracted.manufacturer)) {
      intelligence = {
        ...intelligence,
        corporate: {
          brand: extracted.brand ?? undefined,
          manufacturer: extracted.manufacturer ?? undefined,
          confidence: "estimated",
        },
      };
    }

    // Fetch political activity for the brand/manufacturer
    const companyForPolitics = extracted.brand ?? intelligence.corporate?.brand ?? intelligence.corporate?.manufacturer ?? null;
    const politicalActivity = await fetchPoliticalActivity(companyForPolitics);
    if (politicalActivity) {
      intelligence = { ...intelligence, politicalActivity };
    }

    const feocRegions = ["china", "vietnam", "bangladesh", "cambodia", "indonesia"];
    const madeIn = (originSignal.manufacturing_country ?? extracted.countryOfOrigin ?? "").toLowerCase();

    const normalizedFlagCodes = dedupeStrings([
      ...originFlags.map((flag) => flag.flag_code),
      feocRegions.some((region) => madeIn.includes(region)) ? "FEOC_EXPOSURE_RISK" : null,
    ]);

    const origin = {
      madeIn: originSignal.manufacturing_country ?? extracted.countryOfOrigin ?? null,
      shipsFrom: originSignal.ships_from_country ?? extracted.shipsFrom ?? null,
      soldBy: originSignal.seller_name ?? extracted.soldBy ?? null,
      manufacturer: originSignal.manufacturer_name ?? extracted.manufacturer ?? null,
      importer: null,
      disclosureLevel: originSignal.disclosure_level,
      confidence: normalizeConfidence(originSignal.confidence),
      flags: dedupeStrings(originFlags.map((flag) => flag.flag_label)),
    };

    const product = {
      id: productId,
      name: safeProductName(extracted, value),
      brand: extracted.brand ?? intelligence.corporate?.brand ?? null,
      imageUrl: extracted.imageUrl ?? null,
      barcode: inputType === "barcode" ? value : null,
      category: coerceCategory(extracted, value),
      petroloadIndex: intelligence.petroloadIndex,
      petroloadLabel: intelligence.petroloadLabel,
      materials: intelligence.materials,
      healthEffects: intelligence.healthEffects,
      lifecycle: intelligence.lifecycle,
      alternatives: intelligence.alternatives,
      corporate: intelligence.corporate,
      evidence: intelligence.evidence,
      capitalFlow: intelligence.capitalFlow,
      politicalActivity: intelligence.politicalActivity,
      materialInsight: intelligence.materialInsight,
      confidence: intelligence.confidence,
      certifications: (extracted.rawPayload as any)?.certifications || [],
    };

    return NextResponse.json({
      success: true,
      productId,
      product,
      origin,
      flags: normalizedFlagCodes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
