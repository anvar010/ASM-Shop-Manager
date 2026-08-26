import { hourOf, WEEKDAYS_SHORT } from "./format";
import { dateKeyOf, dayBack } from "./seed";
import type { Bill, PeriodId, PeriodStats } from "./types";

const TODAY_BUCKETS = [
  { label: "6a", from: 0, to: 9 },
  { label: "9a", from: 9, to: 12 },
  { label: "12p", from: 12, to: 15 },
  { label: "3p", from: 15, to: 18 },
  { label: "6p", from: 18, to: 21 },
  { label: "9p", from: 21, to: 24 },
];

/** Today's takings bucketed into three-hour blocks. */
export function todayTrend(bills: Bill[]): number[] {
  return TODAY_BUCKETS.map((bucket) =>
    bills.reduce((sum, bill) => {
      const h = hourOf(bill.time);
      return h >= bucket.from && h < bucket.to ? sum + bill.amount : sum;
    }, 0),
  );
}

/** Days each period spans, and what its strongest trend bucket represents. */
export const PERIOD_META: Record<PeriodId, { days: number; bestTitle: string }> = {
  today: { days: 1, bestTitle: "Busiest hours" },
  week: { days: 7, bestTitle: "Best day" },
  month: { days: 28, bestTitle: "Best week" },
};

export function sumOf(list: Bill[]): number {
  return list.reduce((s, b) => s + b.amount, 0);
}

/** Bills falling between two day offsets, inclusive (0 = today). */
export function billsBetween(bills: Bill[], a: number, b: number): Bill[] {
  const keys = new Set<string>();
  for (let i = a; i <= b; i++) keys.add(dateKeyOf(dayBack(i)));
  return bills.filter((x) => keys.has(x.date));
}

function finishPeriod(
  label: string,
  list: Bill[],
  prevList: Bill[],
  trend: number[],
  trendLabels: string[],
  word: string,
): PeriodStats {
  const total = sumOf(list);
  const prevTotal = sumOf(prevList);
  const has = prevTotal > 0;
  const pct = has ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  return {
    label,
    list,
    total,
    bills: list.length,
    trend,
    trendLabels,
    compare: has
      ? `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% vs ${word}`
      : `No ${word} data`,
    up: pct >= 0,
    has,
  };
}

/** The day before a YYYY-MM-DD key, computed without touching the local clock. */
function dayBeforeKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`;
}

/**
 * One chosen day, shaped exactly like a period so every figure downstream —
 * the chart, the splits, the day list — works on it unchanged.
 */
export function buildDay(key: string, bills: Bill[], label: string): PeriodStats {
  const list = bills.filter((b) => b.date === key);
  return finishPeriod(
    label,
    list,
    bills.filter((b) => b.date === dayBeforeKey(key)),
    todayTrend(list),
    TODAY_BUCKETS.map((b) => b.label),
    "the day before",
  );
}

export function buildPeriod(kind: PeriodId, bills: Bill[], todaysBills: Bill[]): PeriodStats {
  if (kind === "week") {
    const trend: number[] = [];
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayBack(i);
      const key = dateKeyOf(d);
      trend.push(sumOf(bills.filter((b) => b.date === key)));
      labels.push(i === 0 ? "Today" : WEEKDAYS_SHORT[d.getDay()]);
    }
    return finishPeriod(
      "This Week",
      billsBetween(bills, 0, 6),
      billsBetween(bills, 7, 13),
      trend,
      labels,
      "last week",
    );
  }

  if (kind === "month") {
    const trend: number[] = [];
    const labels: string[] = [];
    for (let w = 3; w >= 0; w--) {
      trend.push(sumOf(billsBetween(bills, w * 7, w * 7 + 6)));
      labels.push(w === 0 ? "This wk" : `${w}w ago`);
    }
    return finishPeriod(
      "This Month",
      billsBetween(bills, 0, 27),
      billsBetween(bills, 28, 55),
      trend,
      labels,
      "last month",
    );
  }

  return finishPeriod(
    "Today",
    todaysBills,
    billsBetween(bills, 1, 1),
    todayTrend(todaysBills),
    TODAY_BUCKETS.map((b) => b.label),
    "yesterday",
  );
}
