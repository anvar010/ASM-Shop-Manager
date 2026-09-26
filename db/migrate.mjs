/*
 * Applies db/updates.sql to the database named in .env.local.
 *
 *   node db/migrate.mjs
 *
 * The file only adds, and checks before each step, so running it twice is safe.
 */
import mysql from "mysql2/promise";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));

const c = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  multipleStatements: true,
});

try {
  await c.query(fs.readFileSync("db/updates.sql", "utf8"));
  const [t] = await c.query("SHOW TABLES LIKE 'daily_closings'");
  const [m] = await c.query("SHOW COLUMNS FROM bill_credit_payments LIKE 'mode'");
  const [k] = await c.query("SHOW COLUMNS FROM daily_closings LIKE 'taken_out'");
  console.log("daily_closings table:      ", t.length ? "ready" : "MISSING");
  console.log("daily_closings.taken_out:  ", k.length ? "ready" : "MISSING");
  console.log("bill_credit_payments.mode: ", m.length ? "ready" : "MISSING");
} finally {
  await c.end();
}
