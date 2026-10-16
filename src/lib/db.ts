import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

// Server-only runtime check
if (typeof window !== "undefined") {
  throw new Error("Database module cannot be loaded in client-side code");
}

let pool: Pool | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please configure your PostgreSQL connection string in .env.local"
    );
  }

  const isLocal =
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
  });

  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPool();
  return p.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  return p.connect();
}
