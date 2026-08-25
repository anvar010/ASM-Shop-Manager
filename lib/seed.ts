import { formatDayMonth, formatLongDate, WEEKDAYS_SHORT } from "./format";
import type { DayOption } from "./types";

/*
 * Date helpers shared across the app. The demo ledger that used to live here
 * now loads into MySQL via db/seed.mjs.
 */

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
