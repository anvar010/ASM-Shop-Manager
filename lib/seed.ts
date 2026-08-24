import { formatDayMonth, formatLongDate, WEEKDAYS_SHORT } from "./format";
import type { Bill, CategoryId, DayOption, Expense, PaymentModeId, Product } from "./types";

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/** YYYY-MM-DD in local time. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dayBack(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export const TODAY_KEY = dateKeyOf(new Date());

/** The seven days offered by the Bills date filter, today first. */
export const DAY_OPTIONS: DayOption[] = Array.from({ length: 7 }, (_, i) => {
  const d = dayBack(i);
  return {
    key: dateKeyOf(d),
    short: i === 0 ? "Today" : i === 1 ? "Yest" : WEEKDAYS_SHORT[d.getDay()],
    sub: formatDayMonth(d),
    long: i === 0 ? "today" : i === 1 ? "yesterday" : formatLongDate(d),
  };
});

/* ------------------------------------------------------------------ *
 * Today's seeded bills
 * ------------------------------------------------------------------ */

const TODAY_BILLS: Omit<Bill, "date">[] = [
  { id: "b1", desc: "Basmati Rice 5kg x2", category: "groceries", amount: 740, time: "9:14 AM", mode: "cash" },
  { id: "b2", desc: "Tomatoes 2kg + Onions 1kg", category: "produce", amount: 180, time: "10:02 AM", mode: "upi" },
  { id: "b3", desc: "Detergent Powder 1kg", category: "other", amount: 210, time: "11:35 AM", mode: "cash" },
  { id: "b4", desc: "Bananas + Apples", category: "produce", amount: 95, time: "12:50 PM", mode: "cash" },
  { id: "b5", desc: "Mineral Water (case)", category: "other", amount: 360, time: "2:20 PM", mode: "upi" },
  { id: "b6", desc: "Grocery mix", category: "groceries", amount: 425, time: "4:05 PM", mode: "cash" },
  { id: "b7", desc: "Rice + dal", category: "groceries", amount: 480, time: "5:30 PM", mode: "credit", customer: "Ravi" },
];

/* ------------------------------------------------------------------ *
 * History
 *
 * The last six days are written by hand so the recent, most-visible days read
 * naturally. Everything older is generated from a deterministic pseudo-random
 * function, so week and month totals are real sums rather than magic numbers —
 * and identical on server and client.
 * ------------------------------------------------------------------ */

type HistoryItem = [string, CategoryId, number, string, PaymentModeId];

const HISTORY_SPEC: { off: number; items: HistoryItem[] }[] = [
  {
    off: 1,
    items: [
      ["Grocery mix", "groceries", 620, "9:20 AM", "cash"],
      ["Fresh vegetables", "produce", 420, "11:45 AM", "upi"],
      ["Cleaning supplies", "other", 395, "3:10 PM", "cash"],
      ["Evening snacks", "other", 365, "6:30 PM", "cash"],
    ],
  },
  {
    off: 2,
    items: [
      ["Rice + oil bundle", "groceries", 910, "10:05 AM", "upi"],
      ["Potatoes 5kg", "produce", 285, "12:20 PM", "cash"],
      ["Detergent + soap", "other", 330, "5:40 PM", "upi"],
    ],
  },
  {
    off: 3,
    items: [
      ["Weekend grocery load", "groceries", 1340, "9:00 AM", "upi"],
      ["Seasonal fruit crate", "produce", 720, "11:10 AM", "cash"],
      ["Biscuit cartons", "other", 410, "2:35 PM", "cash"],
      ["Floor cleaner", "other", 165, "4:50 PM", "upi"],
      ["Late grocery mix", "groceries", 295, "7:15 PM", "cash"],
    ],
  },
  {
    off: 4,
    items: [
      ["Dal + flour", "groceries", 560, "10:40 AM", "cash"],
      ["Leafy greens + herbs", "produce", 175, "1:05 PM", "cash"],
      ["Snack packs", "other", 120, "5:20 PM", "upi"],
    ],
  },
  {
    off: 5,
    items: [
      ["Bulk rice order", "groceries", 1480, "8:50 AM", "upi"],
      ["Tomatoes 4kg", "produce", 340, "12:00 PM", "cash"],
      ["Household basket", "other", 405, "4:15 PM", "cash"],
      ["Chips + biscuits", "other", 155, "6:45 PM", "cash"],
    ],
  },
  {
    off: 6,
    items: [
      ["Grocery restock sale", "groceries", 690, "9:35 AM", "upi"],
      ["Onions 5kg", "produce", 240, "2:10 PM", "cash"],
      ["Cleaning combo", "other", 210, "6:05 PM", "cash"],
    ],
  },
];

/** Deterministic pseudo-random in [0, 1). */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FILLER_ITEMS: [string, CategoryId][] = [
  ["Rice + dal bundle", "groceries"],
  ["Cooking oil 2L", "groceries"],
  ["Wheat flour 10kg", "groceries"],
  ["Sugar + tea order", "groceries"],
  ["Tomatoes 3kg", "produce"],
  ["Onions 5kg", "produce"],
  ["Seasonal fruit", "produce"],
  ["Leafy greens", "produce"],
  ["Potatoes 5kg", "produce"],
  ["Cleaning supplies", "other"],
  ["Soap + detergent", "other"],
  ["Assorted items", "other"],
];

function buildHistory(): Bill[] {
  const out: Bill[] = [];

  for (const day of HISTORY_SPEC) {
    const key = dateKeyOf(dayBack(day.off));
    day.items.forEach((it, i) => {
      out.push({
        id: `h${day.off}_${i}`,
        date: key,
        desc: it[0],
        category: it[1],
        amount: it[2],
        time: it[3],
        mode: it[4],
      });
    });
  }

  for (let off = 7; off <= 63; off++) {
    const key = dateKeyOf(dayBack(off));
    const count = 3 + Math.floor(seeded(off) * 4);
    for (let j = 0; j < count; j++) {
      const r = seeded(off * 17 + j * 3);
      const item = FILLER_ITEMS[Math.floor(r * FILLER_ITEMS.length) % FILLER_ITEMS.length];
      const hour = 8 + Math.floor(seeded(off * 5 + j) * 12);
      const mins = Math.floor(seeded(off + j * 7) * 60);
      const h12 = hour > 12 ? hour - 12 : hour;
      // Baskets shrink slightly the further back you go, so recent weeks trend up.
      const decay = 1 - Math.min(0.22, (off - 7) * 0.004);
      const base = 80 + Math.round((r * 560) / 5) * 5;
      out.push({
        id: `g${off}_${j}`,
        date: key,
        desc: item[0],
        category: item[1],
        amount: Math.max(40, Math.round((base * decay) / 5) * 5),
        time: `${h12}:${mins < 10 ? "0" + mins : mins} ${hour >= 12 ? "PM" : "AM"}`,
        mode: seeded(off * 3 + j) > 0.62 ? "upi" : "cash",
      });
    }
  }

  return out;
}

export const SEED_BILLS: Bill[] = [
  ...TODAY_BILLS.map((b) => ({ ...b, date: TODAY_KEY })),
  ...buildHistory(),
];

/* ------------------------------------------------------------------ *
 * Expenses and stock
 * ------------------------------------------------------------------ */

export const SEED_EXPENSES: Expense[] = [
  { id: "e1", desc: "Wholesale grocery restock", category: "supplier", amount: 640, time: "8:05 AM" },
  { id: "e2", desc: "Shop electricity bill", category: "electricity", amount: 340, time: "11:20 AM" },
  { id: "e3", desc: "Helper daily wage", category: "wages", amount: 400, time: "1:15 PM" },
];

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", name: "Basmati Rice 5kg", category: "groceries", unit: "bags", qty: 42, threshold: 10, updated: "Today, 8:30 AM" },
  { id: "p2", name: "Sunflower Oil 1L", category: "groceries", unit: "btls", qty: 18, threshold: 8, updated: "Today, 8:30 AM" },
  { id: "p3", name: "Toor Dal 1kg", category: "groceries", unit: "bags", qty: 6, threshold: 10, updated: "Yesterday, 6:10 PM" },
  { id: "p4", name: "Mineral Water 1L", category: "other", unit: "btls", qty: 120, threshold: 30, updated: "Today, 8:30 AM" },
  { id: "p5", name: "Cola 500ml", category: "other", unit: "btls", qty: 4, threshold: 15, updated: "Today, 11:00 AM" },
  { id: "p6", name: "Tea Powder 250g", category: "other", unit: "pkts", qty: 22, threshold: 10, updated: "Yesterday, 6:10 PM" },
  { id: "p7", name: "Detergent Powder 1kg", category: "other", unit: "pkts", qty: 0, threshold: 10, updated: "Today, 11:40 AM" },
  { id: "p8", name: "Dish Soap 500ml", category: "other", unit: "btls", qty: 15, threshold: 8, updated: "Yesterday, 6:10 PM" },
  { id: "p9", name: "Potato Chips", category: "other", unit: "pkts", qty: 9, threshold: 12, updated: "Today, 9:15 AM" },
  { id: "p10", name: "Biscuits Family Pack", category: "other", unit: "pkts", qty: 33, threshold: 10, updated: "Today, 9:15 AM" },
  { id: "p11", name: "Wheat Flour 10kg", category: "groceries", unit: "bags", qty: 27, threshold: 10, updated: "Today, 8:30 AM" },
  { id: "p12", name: "Floor Cleaner 1L", category: "other", unit: "btls", qty: 7, threshold: 8, updated: "Yesterday, 6:10 PM" },
  { id: "p13", name: "Tomatoes", category: "produce", unit: "kg", qty: 14, threshold: 8, updated: "Today, 7:50 AM" },
  { id: "p14", name: "Bananas", category: "produce", unit: "dozen", qty: 3, threshold: 6, updated: "Today, 7:50 AM" },
];
