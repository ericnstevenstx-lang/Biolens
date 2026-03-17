import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getNeo4jDriver } from '@/lib/neo4j/client'

export async function GET() {
  const checks: Record<string, string> = {}
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('products').select('id').limit(1)
    checks.supabase = error ? `error: ${error.message}` : 'ok'
  } catch (e) {
    checks.supabase = `error: ${e}`
  }
  try {
    const driver = getNeo4jDriver()
    await driver.verifyConnectivity()
    checks.neo4j = 'ok'
  } catch (e) {
    checks.neo4j = `error: ${e}`
  }
  const healthy = Object.values(checks).every(v => v === 'ok')
  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
