import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { withNeo4jSession } from '@/lib/neo4j/client'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  const { barcode } = await params
  if (!barcode || barcode.length < 6) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400, headers: CORS })
  }
  try {
    const supabase = await createSupabaseServerClient()

    const { data: cached } = await supabase
      .from('neo4j_scan_cache')
      .select('payload')
      .eq('barcode', barcode)
      .eq('cache_key', 'scan_v1')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached?.payload) {
      return NextResponse.json({ ...cached.payload, cached: true }, { headers: CORS })
    }

    const { data: barcodeRow } = await supabase
      .from('product_barcodes')
      .select('product_id')
      .eq('barcode', barcode)
      .single()

    if (!barcodeRow) {
      return NextResponse.json({ error: 'Product not found', barcode }, { status: 404, headers: CORS })
    }

    const { data: intelligence, error: rpcError } = await supabase
      .rpc('get_biolens_product_intelligence', { p_product_id: barcodeRow.product_id })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500, headers: CORS })
    }

    let graphData = null
    const materialNames: string[] = intelligence?.materials?.map((m: { name: string }) => m.name) ?? []
    if (materialNames.length > 0) {
      graphData = await withNeo4jSession(async (session) => {
        const result = await session.run(
          `UNWIND $names AS name
           MATCH (m:Material {name: name})
           OPTIONAL MATCH (m)-[:HAS_CURRENT_LEDGER]->(l:MaterialRiskLedger)
           OPTIONAL MATCH (m)-[:HAS_ALTERNATIVE]->(alt:Alternative)
           RETURN m.name AS material,
                  l.overall_risk AS risk,
                  l.toxicity_score AS toxicity,
                  l.lifecycle_score AS lifecycle,
                  l.bio_pure_verified AS bio_pure,
                  collect(alt.name)[0..3] AS alternatives`,
          { names: materialNames }
        )
        return result.records.map(r => ({
          material: r.get('material'),
          risk: r.get('risk'),
          toxicity: r.get('toxicity'),
          lifecycle: r.get('lifecycle'),
          bio_pure: r.get('bio_pure'),
          alternatives: r.get('alternatives'),
        }))
      })
    }

    const payload = { barcode, product: intelligence, graph: graphData, cached: false, timestamp: new Date().toISOString() }

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    void Promise.resolve(supabase.from('neo4j_scan_cache').upsert({ barcode, cache_key: 'scan_v1', payload, expires_at: expiresAt }))

    return NextResponse.json(payload, { headers: CORS })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS })
  }
}
