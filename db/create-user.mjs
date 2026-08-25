/*
 * Creates or updates an account.
 *
 *   node db/create-user.mjs <username> <password> <admin|staff> "<display name>"
 *
 * Re-running with the same username resets that account's password and role.
 */
import mysql from "mysql2/promise";
import fs from "node:fs";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";

const [username, password, role, name] = process.argv.slice(2);
if (!username || !password || !["admin", "staff"].includes(role)) {
  console.error('usage: node db/create-user.mjs <username> <password> <admin|staff> "<name>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("password must be at least 8 characters");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));

const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

const c = await mysql.createConnection({
  host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
  password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: true });

await c.query(fs.readFileSync("db/users.sql", "utf8"));
await c.execute(
  `INSERT INTO users (id, username, display_name, password_hash, role)
   VALUES (?,?,?,?,?)
   ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),
                           password_hash=VALUES(password_hash),
                           role=VALUES(role), active=1`,
  [randomUUID(), username.trim().toLowerCase(), name || username, hash, role]);

const [rows] = await c.query("SELECT username, display_name, role, active FROM users ORDER BY role");
console.table(rows);
await c.end();
