import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { enrichByProductId, enrichByMaterialNames, normalizeIntelligence } from "@/lib/intelligence/enrich";

type InputType = "barcode" | "amazon" | "url" | "search";
interface IntakeRequest { inputType: InputType; value: string; }
interface ExtractedProduct { title?: string; brand?: string; category?: string; description?: string; bullets?: string[]; countryOfOrigin?: string; shipsFrom?: string; soldBy?: string; manufacturer?: string; imageUrl?: string; asin?: string; rawPayload?: Record<string, unknown>; }
interface OriginSignal { manufacturing_country?: string; ships_from_country?: string; seller_name?: string; manufacturer_name?: string; made_in_claim?: string; ships_from_claim?: string; sold_by_claim?: string; disclosure_level: "full" | "partial" | "none"; confidence: number; is_origin_disclosed: boolean; is_third_party_seller: boolean; is_marketplace_listing: boolean; }
interface OriginFlag { flag_code: string; flag_label: string; severity: "info" | "warning" | "critical"; }

function hash(v: string): string { return createHash("sha256").update(v).digest("hex").slice(0, 16); }
function buildCanonicalKey(t: InputType, v: string, asin?: string): string {
  if (t === "amazon") return "amazon:" + (asin ?? hash(v));
  if (t === "barcode") return "barcode:" + v.trim();
  if (t === "url") return "url:" + hash(v);
  return "search:" + hash(v);
}
function extractAsin(url: string): string | undefined {
  const patterns = [/dp\/([A-Z0-9]{10})/i, /gp\/product\/([A-Z0-9]{10})/i, /[?&]asin=([A-Z0-9]{10})/i];
  for (const p of patterns) { const m = url.match(p); if (m?.[1]) return m[1].toUpperCase(); }
}
function extractDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function extractFromHtml(html: string, pattern: RegExp): string | undefined { return pattern.exec(html)?.[1]?.replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim(); }
function parseAmazonHtml(html: string, asin: string, rawUrl: string): ExtractedProduct {
  const title = extractFromHtml(html, /<span[^>]+id="productTitle"[^>]*>\s*([\s\S]*?)\s*</i);
  const brand = extractFromHtml(html, /id="bylineInfo"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</i);
  const imageUrl = extractFromHtml(html, /id="landingImage"[^>]+src="([^"]+)"/i);
  const countryOfOrigin = extractFromHtml(html, /Country of Origin[^:]*:\s*<[^>]+>\s*([^<\n]{2,60})/i);
  const shipsFrom = extractFromHtml(html, /Ships from[^:]*:\s*<[^>]+>\s*([^<\n]{2,60})/i);
  const soldBy = extractFromHtml(html, /Sold by[^:]*:\s*<[^>]+>\s*<a[^>]*>([^<]+)</i);
  const bullets: string[] = [];
  const rBullet = /<span class="a-list-item">\s*([\s\S]*?)\s*</gi;
  let m: RegExpExecArray | null;
  while ((m = rBullet.exec(html)) !== null && bullets.length < 8) { const t = m[1].replace(/<[^>]+>/g, "").trim(); if (t.length > 5 && t.length < 300) bullets.push(t); }
  return { asin, title, brand, imageUrl, countryOfOrigin, shipsFrom, soldBy, bullets: bullets.length ? bullets : undefined, rawPayload: { asin, url: rawUrl, scraped: true } };
}
async function fetchAmazonProduct(asin: string, rawUrl: string): Promise<ExtractedProduct> {
  try {
    const res = await fetch("https://www.amazon.com/dp/" + asin, { headers: { "User-Agent": "Mozilla/5.0 (compatible; BioLens/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { asin, rawPayload: { asin, url: rawUrl, fetchStatus: res.status } };
    return parseAmazonHtml(await res.text(), asin, rawUrl);
  } catch { return { asin, rawPayload: { asin, url: rawUrl, fetchError: "timeout_or_blocked" } }; }
}
async function fetchGenericUrl(url: string): Promise<ExtractedProduct> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; BioLens/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { rawPayload: { url, fetchStatus: res.status } };
    const html = await res.text();
    const x = (p: RegExp) => p.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim();
    return { title: x(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ?? x(/<title>([^<]+)</i), imageUrl: x(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i), description: x(/<meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]{10,300})"/i), rawPayload: { url, scraped: true } };
  } catch { return { rawPayload: { url, fetchError: "timeout_or_blocked" } }; }
}
function normalizeTitle(t?: string): string { if (!t) return ""; return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function detectGtinType(v: string): { upc?: string; ean?: string; gtin?: string } { const c = v.replace(/\D/g, ""); if (c.length === 12) return { upc: c }; if (c.length === 13) return { ean: c }; if (c.length === 14) return { gtin: c }; return {}; }
function buildOriginSignal(e: ExtractedProduct): OriginSignal {
  const isTP = e.soldBy !== undefined && !["amazon", "amazon.com"].some(s => e.soldBy?.toLowerCase().includes(s));
  const dl: OriginSignal["disclosure_level"] = e.countryOfOrigin ? "full" : e.shipsFrom ? "partial" : "none";
  return { manufacturing_country: e.countryOfOrigin, ships_from_country: e.shipsFrom, seller_name: e.soldBy, manufacturer_name: e.manufacturer, made_in_claim: e.countryOfOrigin ? "Made in " + e.countryOfOrigin : undefined, ships_from_claim: e.shipsFrom ? "Ships from " + e.shipsFrom : undefined, sold_by_claim: e.soldBy ? "Sold by " + e.soldBy : undefined, disclosure_level: dl, confidence: dl === "full" ? 0.85 : dl === "partial" ? 0.5 : 0.1, is_origin_disclosed: !!(e.countryOfOrigin || e.shipsFrom), is_third_party_seller: isTP, is_marketplace_listing: isTP };
}
function generateFlags(s: OriginSignal): OriginFlag[] {
  const f: OriginFlag[] = [];
  if (!s.is_origin_disclosed) f.push({ flag_code: "ORIGIN_NOT_DISCLOSED", flag_label: "Country of origin not disclosed", severity: "warning" });
  if (s.is_third_party_seller) f.push({ flag_code: "THIRD_PARTY_SELLER", flag_label: "Product sold by third-party seller", severity: "info" });
  const ol = (s.manufacturing_country ?? s.ships_from_country ?? "").toLowerCase();
  if (["china", "vietnam", "bangladesh", "cambodia", "indonesia"].some(c => ol.includes(c))) f.push({ flag_code: "IMPORT_DEPENDENCY", flag_label: "Sourced from import-dependent region: " + (s.manufacturing_country ?? s.ships_from_country), severity: "info" });
  return f;
}
async function upsertProduct(t: InputType, v: string, e: ExtractedProduct, ck: string): Promise<string> {
  const sb = await createSupabaseServerClient();
  const gf = t === "barcode" ? detectGtinType(v) : {};
  const { data: existing } = await sb.from("products").select("id").eq("canonical_key", ck).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await sb.from("products").insert({ canonical_key: ck, product_title: e.title ?? v, normalized_title: normalizeTitle(e.title ?? v), manufacturer_name: e.manufacturer ?? e.brand ?? null, country_of_origin: e.countryOfOrigin ?? null, source_type: t, source_id: e.asin ?? (t === "barcode" ? v : null), image_url: e.imageUrl ?? null, ...gf }).select("id").single();
  if (error || !data) throw new Error("Product insert failed: " + error?.message);
  return data.id as string;
}
async function insertProductSource(pid: string, t: InputType, v: string, e: ExtractedProduct): Promise<void> { const sb = await createSupabaseServerClient(); const su = t === "amazon" ? "https://www.amazon.com/dp/" + e.asin : t === "url" ? v : null; await sb.from("product_sources").insert({ product_id: pid, source_type: t, source_url: su, source_domain: su ? extractDomain(su) : null, source_external_id: e.asin ?? (t === "barcode" ? v : null), raw_payload: e.rawPayload ?? {} }); }
async function insertOriginSignal(pid: string, s: OriginSignal): Promise<void> { const sb = await createSupabaseServerClient(); await sb.from("product_origin_signals").insert({ product_id: pid, ...s }); }
async function insertOriginFlags(pid: string, flags: OriginFlag[]): Promise<void> { if (!flags.length) return; const sb = await createSupabaseServerClient(); await sb.from("product_origin_flags").insert(flags.map(f => ({ product_id: pid, ...f }))); }

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: IntakeRequest;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 }); }
  const { inputType, value } = body;
  if (!inputType || !value) return NextResponse.json({ success: false, error: "inputType and value are required" }, { status: 400 });
  if (!["barcode", "amazon", "url", "search"].includes(inputType)) return NextResponse.json({ success: false, error: "Unknown inputType: " + inputType }, { status: 400 });
  try {
    let extracted: ExtractedProduct = {};
    let asin: string | undefined;
    if (inputType === "amazon") { asin = extractAsin(value); if (!asin) return NextResponse.json({ success: false, error: "Could not extract ASIN from URL" }, { status: 422 }); extracted = await fetchAmazonProduct(asin, value); }
    else if (inputType === "url") { extracted = await fetchGenericUrl(value); }
    else if (inputType === "barcode") { extracted = { rawPayload: { barcode: value } }; }
    else { extracted = { title: value, rawPayload: { query: value } }; }
    const canonicalKey = buildCanonicalKey(inputType, value, asin);
    const productId = await upsertProduct(inputType, value, extracted, canonicalKey);
    const signal = buildOriginSignal(extracted);
    const flags = generateFlags(signal);
    await Promise.all([insertProductSource(productId, inputType, value, extracted), insertOriginSignal(productId, signal), insertOriginFlags(productId, flags)]);
    let intelligence = await enrichByProductId(productId);
    if (intelligence.materials.length === 0 && inputType === "search") { const fb = await enrichByMaterialNames([value]); if (fb.length) intelligence = normalizeIntelligence(null, fb); }
    if (!intelligence.corporate && (extracted.brand || extracted.manufacturer)) { intelligence = { ...intelligence, corporate: { brand: extracted.brand ?? undefined, manufacturer: extracted.manufacturer ?? undefined, confidence: "estimated" } }; }
    const feocRegions = ["china", "vietnam", "bangladesh", "cambodia", "indonesia"];
    const madeIn = signal.manufacturing_country ?? extracted.countryOfOrigin ?? "";
    const normalizedFlags = [...flags.map(f => f.flag_code), ...(feocRegions.some(r => madeIn.toLowerCase().includes(r)) ? ["FEOC-EXPOSURE-RISK"] : [])];
    const origin = { madeIn: signal.manufacturing_country ?? extracted.countryOfOrigin ?? null, shipsFrom: signal.ships_from_country ?? extracted.shipsFrom ?? null, soldBy: signal.seller_name ?? extracted.soldBy ?? null, manufacturer: signal.manufacturer_name ?? extracted.manufacturer ?? null, importer: null, disclosureLevel: signal.disclosure_level, confidence: signal.confidence > 0.7 ? "verified" : signal.confidence > 0.4 ? "estimated" : "limited", flags: flags.map(f => f.flag_label) };
    const product = { id: productId, name: extracted.title ?? value, brand: extracted.brand ?? intelligence.corporate?.brand ?? null, imageUrl: extracted.imageUrl ?? null, barcode: inputType === "barcode" ? value : null, category: extracted.category ?? null, petroloadIndex: intelligence.petroloadIndex, petroloadLabel: intelligence.petroloadLabel, materials: intelligence.materials, healthEffects: intelligence.healthEffects, lifecycle: intelligence.lifecycle, alternatives: intelligence.alternatives, corporate: intelligence.corporate, evidence: intelligence.evidence, materialInsight: intelligence.materialInsight, confidence: intelligence.confidence };
    return NextResponse.json({ success: true, productId, product, origin, flags: normalizedFlags });
  } catch (err) { return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}
