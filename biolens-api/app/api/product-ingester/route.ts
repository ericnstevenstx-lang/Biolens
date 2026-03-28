import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const OFF_REGISTRY_SOURCE_ID = '8cc45a83-9e2c-447d-a2d0-c9bb1b8e4d77'

function productUrl(source: string, code: string): string {
  const domains: Record<string, string> = {
    off: 'world.openfoodfacts.org',
    obf: 'world.openbeautyfacts.org',
    opf: 'world.openproductsfacts.org',
  }
  return `https://${domains[source] || domains.off}/product/${code}`
}

function sourceDomain(source: string): string {
  const domains: Record<string, string> = {
    off: 'world.openfoodfacts.org',
    obf: 'world.openbeautyfacts.org',
    opf: 'world.openproductsfacts.org',
  }
  return domains[source] || domains.off
}

const DEFAULT_QUERIES = [
  // Personal care / cosmetics (high petrochemical exposure)
  'shampoo', 'conditioner', 'body wash', 'face wash', 'moisturizer',
  'sunscreen', 'deodorant', 'toothpaste', 'lip balm', 'hand soap',
  'lotion', 'face cream', 'hair gel', 'body lotion', 'hand sanitizer',
  // Cleaning products
  'laundry detergent', 'dish soap', 'all purpose cleaner', 'fabric softener',
  'bleach', 'disinfectant', 'glass cleaner', 'stain remover',
  // Baby / children
  'baby wipes', 'baby shampoo', 'baby lotion', 'diaper cream',
  // Household
  'sponge', 'paper towels', 'trash bags', 'ziplock bags',
  // Textiles
  'cotton shirt', 'polyester', 'nylon', 'microfiber cloth',
  // Additional high-coverage queries
  'makeup', 'mascara', 'foundation', 'nail polish', 'perfume',
  'shower gel', 'bath bomb', 'soap bar', 'shaving cream', 'aftershave',
  'hair spray', 'hair dye', 'dry shampoo', 'beard oil',
  'cleaning spray', 'floor cleaner', 'oven cleaner', 'toilet cleaner',
  'air freshener', 'candle', 'insect repellent', 'hand cream',
  'baby food', 'baby bottle', 'diaper', 'baby powder',
  'plastic wrap', 'aluminum foil', 'food container', 'water bottle',
  'kitchen sponge', 'dish rack', 'cutting board', 'food storage',
  'laundry pods', 'dryer sheets', 'detergent pods',
  'yoga mat', 'gym bag', 'water filter', 'reusable bag',
]

// Rotation queries by day of week for variety
const DAY_QUERIES: Record<number, string[]> = {
  0: ['plastic container', 'food wrap', 'storage bag', 'tupperware', 'cling film', 'beeswax wrap', 'silicone mat', 'parchment paper', 'wax paper', 'freezer bag', 'vacuum bag', 'produce bag', 'compost bag', 'biodegradable bag', 'reusable straw'],
  1: ['baby formula', 'baby cereal', 'baby snack', 'pacifier', 'teether', 'sippy cup', 'bib', 'nursing pad', 'breast pump', 'bottle brush', 'sterilizer', 'changing pad', 'wet wipe', 'rash cream', 'baby oil'],
  2: ['kitchen towel', 'dish cloth', 'scrub brush', 'mop', 'broom', 'dustpan', 'vacuum bag', 'lint roller', 'rubber glove', 'scouring pad', 'steel wool', 'magic eraser', 'furniture polish', 'wood cleaner', 'carpet cleaner'],
  3: ['cotton towel', 'bath mat', 'shower curtain', 'curtain', 'bedsheet', 'pillowcase', 'duvet cover', 'blanket', 'throw pillow', 'mattress pad', 'mattress protector', 'quilt', 'comforter', 'sleeping bag', 'towel set'],
  4: ['face mask', 'serum', 'toner', 'eye cream', 'acne treatment', 'exfoliant', 'micellar water', 'cleansing oil', 'face mist', 'sheet mask', 'clay mask', 'face scrub', 'retinol', 'vitamin c serum', 'hyaluronic acid'],
  5: ['snack bar', 'protein bar', 'energy drink', 'sports drink', 'juice', 'smoothie', 'cereal', 'oatmeal', 'granola', 'trail mix', 'chips', 'crackers', 'cookies', 'candy', 'chocolate'],
  6: ['hemp oil', 'bamboo brush', 'organic soap', 'natural deodorant', 'mineral sunscreen', 'plant based', 'vegan leather', 'recycled plastic', 'biodegradable', 'compostable', 'zero waste', 'refillable', 'sustainable', 'eco friendly', 'organic cotton'],
}

interface OFFProduct {
  code: string
  product_name?: string
  brands?: string
  categories?: string
  ingredients_text?: string
  ingredients_text_en?: string
  origins?: string
  manufacturing_places?: string
  countries?: string
  stores?: string
  price?: string | number
  labels?: string
  packaging?: string
  quantity?: string
  image_url?: string
}

function splitCSV(value: string | undefined): string[] | null {
  if (!value) return null
  const arr = value.split(',').map((s) => s.trim()).filter(Boolean)
  return arr.length ? arr : null
}

async function searchOFF(query: string, page = 1, pageSize = 50, country?: string, source: 'off' | 'obf' | 'opf' = 'off'): Promise<OFFProduct[]> {
  const domains: Record<string, string> = {
    off: 'https://world.openfoodfacts.org/cgi/search.pl',
    obf: 'https://world.openbeautyfacts.org/cgi/search.pl',
    opf: 'https://world.openproductsfacts.org/cgi/search.pl',
  }
  const url = new URL(domains[source])
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', 'true')
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))
  if (country) url.searchParams.set('countries_tags', country)

  const resp = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'BioLens-Ingester/1.0 (contact: eric@esandassociates.com)',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!resp.ok) return []
  const data = await resp.json()
  return (data.products || []) as OFFProduct[]
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const queries: string[] = body.queries || DEFAULT_QUERIES
    const pagesPerQuery: number = body.pages_per_query || 2
    const country: string | undefined = body.country || undefined
    const apiSource: 'off' | 'obf' | 'opf' = body.source || 'off'
    const startPage: number = body.start_page || 1
    const maxQueries = Math.min(queries.length, 15)
    const limitedQueries = queries.slice(0, maxQueries)

    const supabase = await createSupabaseServerClient()
    const runId = crypto.randomUUID()
    const startTime = Date.now()

    let totalInserted = 0
    let totalSkipped = 0
    let totalPromoted = 0
    let totalFetched = 0
    const queryResults: Array<{
      query: string
      fetched: number
      inserted: number
      promoted: number
    }> = []

    for (const query of limitedQueries) {
      let qFetched = 0
      let qInserted = 0
      let qPromoted = 0

      for (let page = startPage; page < startPage + pagesPerQuery; page++) {
        if (page > 1 || limitedQueries.indexOf(query) > 0) {
          await new Promise((r) => setTimeout(r, 150))
        }

        const products = await searchOFF(query, page, 50, country, apiSource)
        if (!products.length) break
        qFetched += products.length

        for (const p of products) {
          if (!p.code) continue

          // Dedupe
          const { data: existing } = await supabase
            .from('source_products_raw')
            .select('id')
            .eq('external_product_id', p.code)
            .eq('source', apiSource)
            .limit(1)

          if (existing && existing.length > 0) {
            totalSkipped++
            continue
          }

          const ingredientText = p.ingredients_text_en || p.ingredients_text || null
          const gtin = p.code.length >= 8 ? p.code : null
          const upc = p.code.length === 12 ? p.code : null

          const { error: insertErr } = await supabase
            .from('source_products_raw')
            .insert({
              registry_source_id: OFF_REGISTRY_SOURCE_ID,
              ingestion_run_id: runId,
              source: apiSource,
              external_product_id: p.code,
              barcode: p.code,
              gtin,
              upc,
              product_name: p.product_name || null,
              brand: p.brands || null,
              category: p.categories?.split(',')[0]?.trim() || null,
              quantity: p.quantity || null,
              ingredient_list_text: ingredientText,
              inci_text: ingredientText,
              country_of_origin: splitCSV(p.origins),
              countries_sold: splitCSV(p.countries),
              manufacturing_places: splitCSV(p.manufacturing_places),
              stores: splitCSV(p.stores),
              labels_claims: splitCSV(p.labels),
              packaging_text: p.packaging || null,
              source_url: productUrl(apiSource, p.code),
              raw_payload: p,
            })

          if (insertErr) continue
          qInserted++

          // Auto-promote if name + gtin
          if (p.product_name && gtin) {
            const { data: existingProd } = await supabase
              .from('products')
              .select('id')
              .eq('gtin', gtin)
              .limit(1)

            if (!existingProd || existingProd.length === 0) {
              const price = p.price ? parseFloat(String(p.price)) : null
              const { data: newProd, error: promoteErr } = await supabase
                .from('products')
                .insert({
                  gtin,
                  upc,
                  product_title: p.product_name,
                  normalized_title: p.product_name.toLowerCase(),
                  manufacturer_name: p.brands || null,
                  country_of_origin: splitCSV(p.origins)?.[0] || null,
                  canonical_key: `barcode:${gtin.toLowerCase()}`,
                  source_type: apiSource,
                  source_id: productUrl(apiSource, p.code),
                  image_url: p.image_url || null,
                  display_price: price && !isNaN(price) ? price : null,
                })
                .select('id')
                .single()

              if (!promoteErr && newProd) {
                qPromoted++
                await supabase
                  .from('source_products_raw')
                  .update({ promoted_product_id: newProd.id })
                  .eq('external_product_id', p.code)
                  .eq('source', apiSource)

                await supabase.from('product_sources').insert({
                  product_id: newProd.id,
                  source_type: apiSource,
                  source_url: productUrl(apiSource, p.code),
                  source_domain: sourceDomain(apiSource),
                  source_external_id: p.code,
                })
              }
            }
          }
        }
      }

      totalFetched += qFetched
      totalInserted += qInserted
      totalPromoted += qPromoted
      queryResults.push({ query, fetched: qFetched, inserted: qInserted, promoted: qPromoted })
    }

    return NextResponse.json({
      success: true,
      run_id: runId,
      queries_run: limitedQueries.length,
      total_fetched: totalFetched,
      total_inserted: totalInserted,
      total_skipped: totalSkipped,
      total_promoted: totalPromoted,
      elapsed_ms: Date.now() - startTime,
      query_results: queryResults,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  // Vercel cron hits GET - trigger ingestion with day-rotation queries
  const dayOfWeek = new Date().getDay()
  const dayQueries = DAY_QUERIES[dayOfWeek] || DAY_QUERIES[0]

  // Alternate between OFF, OBF, OPF sources each day
  const sources: Array<'off' | 'obf' | 'opf'> = ['off', 'obf', 'opf']
  const source = sources[dayOfWeek % 3]

  // Build a mock request and call POST logic
  const mockReq = new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queries: dayQueries,
      pages_per_query: 2,
      source,
    }),
  })

  return POST(mockReq)
}
