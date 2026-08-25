/*
 * Loads the demo ledger into the database.
 *
 *   node db/seed.mjs          add the demo rows
 *   node db/seed.mjs --reset  empty every table first
 *
 * Dates are relative to the day it is run, so trends and the day strip look
 * right immediately. Re-running without --reset will duplicate rows.
 */
import mysql from "mysql2/promise";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { register } from "node:module";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));

const c = await mysql.createConnection({
  host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
  password: env.DB_PASSWORD, database: env.DB_NAME, connectTimeout: 20000 });

if (process.argv.includes("--reset")) {
  for (const t of ["bill_credit_payments", "purchase_payments", "bills", "expenses", "purchases"]) {
    await c.query(`DELETE FROM ${t}`);
  }
  console.log("cleared existing rows");
}

const pad = (n) => (n < 10 ? "0" + n : String(n));
const key = (back) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const t24 = (label) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label);
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${pad(h)}:${m[2]}:00`;
};

let bills = 0, credits = 0, expenses = 0, purchases = 0, payments = 0;

async function bill(back, desc, cat, amt, time, mode, customer = null) {
  const id = randomUUID();
  await c.execute(
    `INSERT INTO bills (id, sold_on, sold_at, description, category, amount, mode, customer)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, key(back), t24(time), desc, cat, amt, mode, mode === "credit" ? customer : null]);
  bills++;
  return id;
}

// ---- today ----
await bill(0, "Basmati Rice 5kg x2", "groceries", 740, "9:14 AM", "cash");
await bill(0, "Tomatoes 2kg + Onions 1kg", "produce", 180, "10:02 AM", "upi");
await bill(0, "Detergent Powder 1kg", "other", 210, "11:35 AM", "cash");
await bill(0, "Bananas + Apples", "produce", 95, "12:50 PM", "cash");
await bill(0, "Mineral Water (case)", "other", 360, "2:20 PM", "upi");
await bill(0, "Grocery mix", "groceries", 425, "4:05 PM", "cash");

// ---- credit sales, spread over the week ----
const creditSpec = [
  [0, "Rice + dal", "groceries", 480, "5:30 PM", "Ravi"],
  [1, "Milk + bread daily", "groceries", 260, "8:40 AM", "Ravi"],
  [1, "Vegetables weekly", "produce", 540, "6:15 PM", "Suresh"],
  [3, "Rice 10kg + oil", "groceries", 1150, "11:20 AM", "Suresh"],
  [4, "Snacks for shop party", "other", 380, "5:05 PM", "Lakshmi"],
  [6, "Monthly grocery basket", "groceries", 1680, "10:30 AM", "Lakshmi"],
];
for (const [back, desc, cat, amt, time, who] of creditSpec) {
  await bill(back, desc, cat, amt, time, "credit", who);
}

// ---- history: hand-written recent days, then a deterministic tail ----
const HISTORY = [
  [1, [["Grocery mix","groceries",620,"9:20 AM","cash"],["Fresh vegetables","produce",420,"11:45 AM","upi"],["Cleaning supplies","other",395,"3:10 PM","cash"],["Evening snacks","other",365,"6:30 PM","cash"]]],
  [2, [["Rice + oil bundle","groceries",910,"10:05 AM","upi"],["Potatoes 5kg","produce",285,"12:20 PM","cash"],["Detergent + soap","other",330,"5:40 PM","upi"]]],
  [3, [["Weekend grocery load","groceries",1340,"9:00 AM","upi"],["Seasonal fruit crate","produce",720,"11:10 AM","cash"],["Biscuit cartons","other",410,"2:35 PM","cash"],["Floor cleaner","other",165,"4:50 PM","upi"]]],
  [4, [["Dal + flour","groceries",560,"10:40 AM","cash"],["Leafy greens + herbs","produce",175,"1:05 PM","cash"],["Snack packs","other",120,"5:20 PM","upi"]]],
  [5, [["Bulk rice order","groceries",1480,"8:50 AM","upi"],["Tomatoes 4kg","produce",340,"12:00 PM","cash"],["Household basket","other",405,"4:15 PM","cash"]]],
  [6, [["Grocery restock sale","groceries",690,"9:35 AM","upi"],["Onions 5kg","produce",240,"2:10 PM","cash"],["Cleaning combo","other",210,"6:05 PM","cash"]]],
];
for (const [back, items] of HISTORY) {
  for (const [desc, cat, amt, time, mode] of items) await bill(back, desc, cat, amt, time, mode);
}

const seeded = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const FILLER = [["Rice + dal bundle","groceries"],["Cooking oil 2L","groceries"],["Wheat flour 10kg","groceries"],["Sugar + tea order","groceries"],["Tomatoes 3kg","produce"],["Onions 5kg","produce"],["Seasonal fruit","produce"],["Leafy greens","produce"],["Potatoes 5kg","produce"],["Cleaning supplies","other"],["Soap + detergent","other"],["Assorted items","other"]];
for (let back = 7; back <= 63; back++) {
  const count = 3 + Math.floor(seeded(back) * 4);
  for (let j = 0; j < count; j++) {
    const r = seeded(back * 17 + j * 3);
    const [desc, cat] = FILLER[Math.floor(r * FILLER.length) % FILLER.length];
    const hour = 8 + Math.floor(seeded(back * 5 + j) * 12);
    const mins = Math.floor(seeded(back + j * 7) * 60);
    const decay = 1 - Math.min(0.22, (back - 7) * 0.004);
    const base = 80 + Math.round((r * 560) / 5) * 5;
    const amt = Math.max(40, Math.round((base * decay) / 5) * 5);
    const label = `${hour > 12 ? hour - 12 : hour}:${pad(mins)} ${hour >= 12 ? "PM" : "AM"}`;
    await bill(back, desc, cat, amt, label, seeded(back * 3 + j) > 0.62 ? "upi" : "cash");
  }
}

// ---- one repayment, so a part-settled tab is visible ----
const [[ravi]] = await c.query(
  "SELECT id FROM bills WHERE mode='credit' AND customer='Ravi' ORDER BY sold_on LIMIT 1");
await c.execute("INSERT INTO bill_credit_payments (id,bill_id,paid_on,amount) VALUES (?,?,?,?)",
  [randomUUID(), ravi.id, key(0), 100]);
credits++;

// ---- expenses ----
for (const [back, desc, cat, amt, time] of [
  [0, "Wholesale grocery restock", "supplier", 640, "8:05 AM"],
  [0, "Shop electricity bill", "electricity", 340, "11:20 AM"],
  [0, "Helper daily wage", "wages", 400, "1:15 PM"],
  [1, "Helper daily wage", "wages", 400, "1:10 PM"],
  [1, "Vegetable transport", "transport", 180, "7:30 AM"],
  [2, "Helper daily wage", "wages", 400, "1:20 PM"],
]) {
  await c.execute(
    `INSERT INTO expenses (id, spent_on, spent_at, description, category, amount) VALUES (?,?,?,?,?,?)`,
    [randomUUID(), key(back), t24(time), desc, cat, amt]);
  expenses++;
}

// ---- wholesale purchases ----
const PURCHASES = [
  [0, "Ramesh Dairy", "Milk crates x20", 3000, 2500, []],
  [1, "Ramesh Dairy", "Milk crates x14", 2000, 2000, []],
  [2, "Kumar Wholesale", "Rice 50kg + Toor dal 20kg", 7400, 4000, [[1, 1400]]],
  [4, "Kumar Wholesale", "Sunflower oil 30L", 4200, 4200, []],
  [5, "Anil Traders", "Detergent + soap cartons", 2600, 1000, [[3, 600]]],
  [8, "Anil Traders", "Biscuit cartons x12", 1800, 1800, []],
];
for (const [back, supplier, item, amt, upfront, pays] of PURCHASES) {
  const id = randomUUID();
  await c.execute(
    `INSERT INTO purchases (id, bought_on, supplier, item, amount, paid_upfront) VALUES (?,?,?,?,?,?)`,
    [id, key(back), supplier, item, amt, upfront]);
  purchases++;
  for (const [payBack, payAmt] of pays) {
    await c.execute("INSERT INTO purchase_payments (id,purchase_id,paid_on,amount) VALUES (?,?,?,?)",
      [randomUUID(), id, key(payBack), payAmt]);
    payments++;
  }
}

console.log(`bills ${bills}  credit repayments ${credits}  expenses ${expenses}  purchases ${purchases}  supplier payments ${payments}`);
await c.end();
