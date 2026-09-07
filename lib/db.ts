import "server-only"

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var auroraPool: Pool | undefined
}

function getSSLConfig() {
  if (process.env.NODE_ENV === 'production') {
    // Production — full cert verification
    const certPath = path.join(process.cwd(), 'certs', 'rds-ca.pem');
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(certPath).toString(),
    };
  }
  // Dev — SSL required by Aurora but skip cert verification locally
  return {
    rejectUnauthorized: false,
  };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 2,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.AURORA_DATABASE_URL || process.env.POSTGRES_URL
}

function createPool() {
  const connectionString = getConnectionString()

  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX ?? 10),
    })
  }

  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX ?? 10),
  })
}



if (process.env.NODE_ENV !== "production") {
  globalThis.auroraPool = pool
}

/*
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}
*/
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
