import neo4j, { Driver, Session } from 'neo4j-driver'

let _driver: Driver | null = null

function getDriver(): Driver {
  if (_driver) return _driver

  const uri      = process.env.NEO4J_URI
  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !username || !password) {
    throw new Error('NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set')
  }

  _driver = neo4j.driver(
    uri,
    neo4j.auth.basic(username, password),
    {
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 10000,
      connectionTimeout: 5000,
    }
  )

  return _driver
}

export async function withNeo4jSession<T>(
  fn: (session: Session) => Promise<T>
): Promise<T> {
  const driver  = getDriver()
  const session = driver.session({ database: 'neo4j' })
  try {
    return await fn(session)
  } finally {
    await session.close()
  }
}

export async function verifyNeo4jConnectivity(): Promise<boolean> {
  try {
    const driver = getDriver()
    await driver.verifyConnectivity()
    return true
  } catch {
    return false
  }
}
