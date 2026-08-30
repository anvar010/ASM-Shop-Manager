import { formatDayMonth, formatLongDate, WEEKDAYS_SHORT } from "./format";
import type { DayOption } from "./types";

/*
 * Date helpers shared across the app. The demo ledger that used to live here
 * now loads into MySQL via db/seed.mjs.
 */

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

/*
 * A shop's day does not end when the calendar's does. Sales are still being
 * rung up past midnight, and they belong to the night they were made — so the
 * ledger rolls over at 3 AM instead.
 *
 * Three works because the shop has never recorded a bill between 1 AM and
 * 10 AM: it clears the latest sale on record by two and a half hours and the
 * earliest by eight, so neither a late night nor an early opening lands on the
 * wrong day. Only the date stamped on new entries is affected — every bill
 * already saved keeps the date it was given.
 */
export const DAY_RESET_HOUR = 3;

/** The clock wound back to the trading day it belongs to. */
function tradingDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() - DAY_RESET_HOUR);
  return d;
}

/** The date on the wall calendar, which after midnight is a day ahead. */
export function calendarKey(): string {
  return dateKeyOf(new Date());
}

/** YYYY-MM-DD in local time. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dayBack(n: number): Date {
  const d = tradingDate();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/*
 * Computed on call, never cached at module load: a shop leaves this open all
 * day, and a constant captured at import would keep filing tomorrow's sales
 * under today's date after midnight.
 */
export function todayKey(): string {
  return dateKeyOf(tradingDate());
}

/** The seven days offered by the Bills date filter, today first. */
export function dayOptions(): DayOption[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = dayBack(i);
    return {
      key: dateKeyOf(d),
      short: i === 0 ? "Today" : i === 1 ? "Yest" : WEEKDAYS_SHORT[d.getDay()],
      sub: formatDayMonth(d),
      long: i === 0 ? "today" : i === 1 ? "yesterday" : formatLongDate(d),
    };
  });
}
