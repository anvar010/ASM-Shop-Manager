/*
 * Turning what was said into an amount and a description.
 *
 * Only figures spoken as digits are read — the recognizer writes "മിൽമ 1415"
 * for "Milma fourteen fifteen". Number *words* ("ആയിരത്തി നാനൂറ്") are left
 * alone on purpose: a wrong amount in a ledger is worse than an empty field the
 * person fills in themselves.
 */

const MALAYALAM_DIGITS = "൦൧൨൩൪൫൬൭൮൯";

function toAsciiDigits(text: string): string {
  return text.replace(/[൦-൯]/g, (d) => String(MALAYALAM_DIGITS.indexOf(d)));
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const CURRENCY = /₹|rs\.?|rupees?|രൂപ(?:യുടെ|യ്ക്ക്|യ)?/gi;

export interface Heard {
  /** As a string for the amount field, or "" when no figure was heard. */
  amount: string;
  /** What is left once the figure and the word "rupees" are taken out. */
  text: string;
}

export function parseSpeech(transcript: string): Heard {
  const ascii = toAsciiDigits(transcript);
  const found = ascii.match(NUMBER);
  // The last figure wins: "2 kilo tomato 80" is eighty rupees.
  const raw = found ? found[found.length - 1] : "";
  const value = parseFloat(raw.replace(/,/g, ""));
  const amount = Number.isFinite(value) && value > 0 && value < 10_000_000 ? String(value) : "";

  const text = (amount ? ascii.replace(raw, " ") : ascii)
    .replace(CURRENCY, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { amount, text };
}
