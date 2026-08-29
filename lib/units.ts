/*
 * Units for the price list.
 *
 * A price is quoted for an amount — "100 gram for ₹30" — not per one of
 * something, so every price is normalised to its base unit (gram, ml, or the
 * item itself) and converted back at the point it is used.
 *
 * Count units are each their own family: a packet is not a number of pieces,
 * and offering to convert between them would invent an answer.
 */

export type UnitId = "gram" | "kg" | "ml" | "litre" | "piece" | "packet";

interface UnitInfo {
  /** Units sharing a family can be converted between. */
  family: string;
  /** How many base units one of these is worth. */
  inBase: number;
  label: string;
  short: string;
}

export const UNITS: Record<UnitId, UnitInfo> = {
  gram: { family: "weight", inBase: 1, label: "gram", short: "g" },
  kg: { family: "weight", inBase: 1000, label: "kilogram", short: "kg" },
  ml: { family: "volume", inBase: 1, label: "millilitre", short: "ml" },
  litre: { family: "volume", inBase: 1000, label: "litre", short: "L" },
  piece: { family: "piece", inBase: 1, label: "piece", short: "pc" },
  packet: { family: "packet", inBase: 1, label: "packet", short: "pkt" },
};

export const UNIT_GROUPS: { label: string; units: UnitId[] }[] = [
  { label: "By weight", units: ["gram", "kg"] },
  { label: "By volume", units: ["ml", "litre"] },
  { label: "By count", units: ["piece", "packet"] },
];

/** Things sold one at a time, which cannot sensibly be split. */
export function isCount(unit: string | null | undefined): boolean {
  return isUnit(unit) && (UNITS[unit].family === "piece" || UNITS[unit].family === "packet");
}

export function isUnit(value: string | null | undefined): value is UnitId {
  return !!value && value in UNITS;
}

/** The units a given one can be sold in — grams priced, kilograms bought. */
export function unitsLike(unit: string | null | undefined): UnitId[] {
  if (!isUnit(unit)) return [];
  const family = UNITS[unit].family;
  return (Object.keys(UNITS) as UnitId[]).filter((u) => UNITS[u].family === family);
}

/**
 * What one base unit costs. A price of ₹30 for 100 gram is ₹0.30 per gram,
 * which is the only form the calculator has to deal with.
 */
export function ratePerBase(price: number, perQty: number, unit: string | null | undefined): number {
  if (!isUnit(unit) || !(perQty > 0)) return price;
  return price / (perQty * UNITS[unit].inBase);
}

/** What `qty` of `unit` costs, given a price quoted some other way. */
export function costOf(
  qty: number,
  unit: UnitId,
  price: number,
  perQty: number,
  pricedIn: string | null | undefined,
): number {
  const rate = ratePerBase(price, perQty, pricedIn);
  return Number((qty * UNITS[unit].inBase * rate).toFixed(2));
}

/** "100 gram" or "1 kg", without a stray "1 " in front of a single unit. */
export function quantityLabel(qty: number, unit: string | null | undefined): string {
  const short = isUnit(unit) ? UNITS[unit].short : (unit ?? "");
  return `${qty} ${short}`.trim();
}
