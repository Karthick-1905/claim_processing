import neo4j, { Driver, Session } from "neo4j-driver";

interface GlobalWithNeo4j {
  _neo4jDriver?: Driver;
}

declare const global: GlobalWithNeo4j;

export function getNeo4jConfig() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME || "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE || "neo4j";

  const isConfigured = Boolean(
    uri &&
    password &&
    !uri.includes("your-instance-id") &&
    !password.includes("your_secure")
  );

  return { uri, username, password, database, isConfigured };
}

export function getNeo4jDriver(): Driver | null {
  const { uri, username, password, isConfigured } = getNeo4jConfig();

  if (!isConfigured || !uri || !password) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._neo4jDriver) {
      global._neo4jDriver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionPoolSize: 20,
          connectionTimeout: 5000,
        }
      );
    }
    return global._neo4jDriver;
  }

  return neo4j.driver(uri, neo4j.auth.basic(username, password));
}

export async function testNeo4jConnection(): Promise<{
  connected: boolean;
  message: string;
  serverInfo?: string;
}> {
  const { isConfigured } = getNeo4jConfig();
  if (!isConfigured) {
    return {
      connected: false,
      message: "Neo4j Aura credentials not configured in .env",
    };
  }

  const driver = getNeo4jDriver();
  if (!driver) {
    return {
      connected: false,
      message: "Unable to initialize Neo4j driver",
    };
  }

  let session: Session | null = null;
  try {
    const serverInfo = await driver.getServerInfo();
    session = driver.session();
    await session.run("RETURN 1 AS ping");
    return {
      connected: true,
      message: "Connected to Neo4j Aura",
      serverInfo: `${serverInfo.agent} (${serverInfo.address})`,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return {
      connected: false,
      message: `Neo4j connection error: ${errMessage}`,
    };
  } finally {
    if (session) {
      await session.close();
    }
  }
}
