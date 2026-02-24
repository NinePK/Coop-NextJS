import mysql, { Pool } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __coopMysqlPool: Pool | undefined;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: requireEnv("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD ?? "",
    database: requireEnv("MYSQL_DATABASE"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  });
}

export function getPool() {
  if (!global.__coopMysqlPool) {
    global.__coopMysqlPool = createPool();
  }
  return global.__coopMysqlPool;
}

export async function queryRows<T>(sql: string, params: unknown[] = []) {
  const [rows] = await getPool().query(sql, params as (string | number | null)[]);
  return rows as T;
}

export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await getPool().execute(
    sql,
    params as (string | number | null)[],
  );
  return result;
}
