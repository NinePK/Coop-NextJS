import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __coopPgPool: Pool | undefined;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl:
        process.env.PGSSLMODE === "disable"
          ? false
          : { rejectUnauthorized: false },
    });
  }

  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    user: requireEnv("PGUSER"),
    password: process.env.PGPASSWORD ?? "",
    database: requireEnv("PGDATABASE"),
    max: 10,
    ssl:
      process.env.PGSSLMODE === "disable"
        ? false
        : { rejectUnauthorized: false },
  });
}

export function getPool() {
  if (!global.__coopPgPool) {
    global.__coopPgPool = createPool();
  }
  return global.__coopPgPool;
}

export async function queryRows<T extends QueryResultRow[]>(
  sql: string,
  params: unknown[] = [],
) {
  const result = await getPool().query(sql, params);
  return result.rows as T;
}

export async function execute(sql: string, params: unknown[] = []) {
  const result: QueryResult = await getPool().query(sql, params);
  return result;
}
