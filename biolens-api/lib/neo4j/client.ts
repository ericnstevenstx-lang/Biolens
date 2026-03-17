import neo4j, { Driver } from 'neo4j-driver'

let driver: Driver | null = null

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    )
  }
  return driver
}

export async function withNeo4jSession<T>(
  fn: (session: ReturnType<Driver['session']>) => Promise<T>
): Promise<T> {
  const session = getNeo4jDriver().session()
  try {
    return await fn(session)
  } finally {
    await session.close()
  }
}
