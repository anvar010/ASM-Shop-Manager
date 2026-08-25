/**
 * Formatting helpers.
 *
 * These deliberately avoid `toLocaleString` / `toLocaleDateString`. Those rely on
 * the runtime's ICU data, which can differ between the Node server and the
 * browser — producing different strings for the same value and tripping React
 * hydration mismatches. Everything here is computed the same way in both places.
 */

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Indian digit grouping: 1234567 -> "12,34,567" */
export function groupIN(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const s = String(rounded);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export function formatINR(value: number): string {
  const sign = value < 0 ? "-" : "";
  return sign + "₹" + groupIN(value);
}

/** "Sat, 24 Aug" */
export function formatShortDate(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "24 Aug" */
export function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "2026-08-17" -> "17 Aug". Parsed by hand so server and client agree. */
export function formatDateKey(key: string): string {
  const parts = key.split("-");
  const month = MONTHS_SHORT[parseInt(parts[1], 10) - 1];
  return month ? `${parseInt(parts[2], 10)} ${month}` : key;
}

/** "Saturday, 24 Aug" */
export function formatLongDate(d: Date): string {
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "9:14 AM" */
export function formatTime(d: Date): string {
  const hours = d.getHours();
  const mins = d.getMinutes();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mins < 10 ? "0" + mins : mins} ${hours >= 12 ? "PM" : "AM"}`;
}

/** Parses "9:14 AM" back to a 24h hour number. Falls back to midday. */
export function hourOf(timeLabel: string): number {
  const m = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(timeLabel.trim());
  if (!m) return 12;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h;
}
