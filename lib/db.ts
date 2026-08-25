import mysql from "mysql2/promise";

/*
 * One pool per process. On Vercel each function instance is its own process,
 * so the limit is deliberately tiny: a large pool per instance multiplies
 * across instances and exhausts the server's max_connections.
 */
declare global {
  var __asmPool: mysql.Pool | undefined;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export function db(): mysql.Pool {
  if (!globalThis.__asmPool) {
    globalThis.__asmPool = mysql.createPool({
      host: required("DB_HOST"),
      port: Number(process.env.DB_PORT ?? 3306),
      user: required("DB_USER"),
      password: required("DB_PASSWORD"),
      database: required("DB_NAME"),
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 2,
      connectTimeout: 15000,
      // DECIMAL arrives as a string by default so precision survives the wire;
      // the app works in numbers, so convert at the boundary.
      decimalNumbers: true,
      timezone: "Z",
      dateStrings: true,
    });
  }
  return globalThis.__asmPool;
}
