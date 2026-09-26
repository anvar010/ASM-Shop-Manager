"use client";

export interface Closing {
  date: string;
  expected: number;
  counted: number;
  /** counted − expected: negative is a shortage. */
  difference: number;
  /** Cash removed from the drawer when closing; the rest carries to tomorrow. */
  takenOut: number;
  note: string | null;
  closedBy: string;
  /** UTC "YYYY-MM-DD HH:MM:SS" as the database gives it. */
  at?: string;
}

/** Recent closings, or null when they could not be read. `setup` means no table yet. */
export async function loadClosings(): Promise<{ closings: Closing[]; setup: boolean } | null> {
  try {
    const res = await fetch("/api/closings", { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return { closings: body.closings ?? [], setup: Boolean(body.setup) };
  } catch {
    return null;
  }
}

export async function closeDay(
  date: string,
  counted: number,
  note: string,
  takenOut: number,
): Promise<{ closing?: Closing; error?: string }> {
  try {
    const res = await fetch("/api/closings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, counted, note, takenOut }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? "Could not close the day" };
    notifyClosingsChanged();
    return { closing: body.closing };
  } catch {
    return { error: "You are offline — the day can be closed once you are back online." };
  }
}

/** "Short ₹200", "Over ₹50" or "Matches". */
export function differenceLabel(difference: number, format: (n: number) => string): string {
  if (Math.abs(difference) < 0.005) return "Matches";
  return difference < 0 ? `Short ${format(-difference)}` : `Over ${format(difference)}`;
}

export function differenceColor(difference: number): string {
  if (Math.abs(difference) < 0.005) return "var(--success)";
  return difference < 0 ? "var(--danger)" : "var(--warning)";
}

/** Undoes a closing. Returns an error message, or "" when it worked. */
export async function reopenDay(date: string): Promise<string> {
  try {
    const res = await fetch(`/api/closings?date=${encodeURIComponent(date)}`, { method: "DELETE" });
    if (res.ok) {
      notifyClosingsChanged();
      return "";
    }
    return (await res.json().catch(() => ({}))).error ?? "Could not reopen the day";
  } catch {
    return "You are offline — try again once you are back online.";
  }
}

/* Closing or reopening a day moves the next day's opening cash, so anything
   showing a drawer figure is told to look again. */
const CHANGED = "asm-closings-changed";

function notifyClosingsChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

export function onClosingsChanged(handler: () => void): () => void {
  window.addEventListener(CHANGED, handler);
  return () => window.removeEventListener(CHANGED, handler);
}

/** Cash already in the drawer when a day starts, carried from the last closing. */
export async function loadOpening(date: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/closings/opening?date=${encodeURIComponent(date)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return Number((await res.json()).opening ?? 0);
  } catch {
    return null;
  }
}
