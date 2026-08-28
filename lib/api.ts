"use client";

import type { Bill, Expense, PriceItem, Purchase } from "./types";

/*
 * Every mutation is applied to local state first and sent here afterwards, so
 * the UI stays instant. A failed write is reported through onError rather than
 * thrown, because a rejected promise in an event handler would go unnoticed.
 */

let onError: ((message: string) => void) | null = null;
let onDesync: (() => void) | null = null;

export function setApiErrorHandler(handler: (message: string) => void) {
  onError = handler;
}

/*
 * Called when a write fails after the screen has already moved on. Rather than
 * inverting each operation by hand — which gets it wrong the moment two writes
 * overlap — the ledger is re-read, so what is shown is whatever the database
 * actually holds.
 */
export function setDesyncHandler(handler: () => void) {
  onDesync = handler;
}

/** A dead session cannot be retried out of; send them to sign in again. */
function signedOut(res: Response): boolean {
  if (res.status !== 401) return false;
  // Redirecting to the page we are already on would reload it forever.
  if (window.location.pathname === "/login") return true;
  const to = new URL("/login", window.location.origin);
  to.searchParams.set("next", window.location.pathname + window.location.search);
  window.location.href = to.toString();
  return true;
}

async function send(path: string, init: RequestInit, what: string) {
  try {
    const res = await fetch(path, init);
    if (signedOut(res)) return false;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      onError?.(body.error ?? `Could not save ${what}`);
      onDesync?.();
      return false;
    }
    return true;
  } catch {
    onError?.(`Could not reach the server to save ${what}`);
    onDesync?.();
    return false;
  }
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function loadLedger(): Promise<{
  bills: Bill[];
  expenses: Expense[];
  purchases: Purchase[];
  prices: PriceItem[];
} | null> {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    if (signedOut(res)) return null;
    if (!res.ok) {
      onError?.("Could not load your data");
      return null;
    }
    return await res.json();
  } catch {
    onError?.("Could not reach the server");
    return null;
  }
}

/** The ledger's fingerprint, or null if it could not be read. */
export async function ledgerVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/data/version", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).v ?? null;
  } catch {
    return null;
  }
}

export const api = {
  addBill: (bill: Bill) => send("/api/bills", json(bill), "the bill"),
  updateBill: (bill: Bill) =>
    send("/api/bills", { ...json(bill), method: "PATCH" }, "the changes"),
  deleteBill: (id: string) =>
    send(`/api/bills?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),
  settleBill: (p: { id: string; billId: string; date: string; amount: number }) =>
    send("/api/bills/settle", json(p), "the payment"),

  addExpense: (expense: Expense) => send("/api/expenses", json(expense), "the expense"),
  updateExpense: (expense: Expense) =>
    send("/api/expenses", { ...json(expense), method: "PATCH" }, "the changes"),
  deleteExpense: (id: string) =>
    send(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),

  addPurchase: (purchase: Purchase) => send("/api/purchases", json(purchase), "the purchase"),
  updatePurchase: (purchase: Purchase) =>
    send("/api/purchases", { ...json(purchase), method: "PATCH" }, "the changes"),
  deletePurchase: (id: string) =>
    send(`/api/purchases?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),
  payPurchase: (p: { id: string; purchaseId: string; date: string; amount: number }) =>
    send("/api/purchases/pay", json(p), "the payment"),

  savePrice: (item: PriceItem) => send("/api/prices", json(item), "the price"),
  deletePrice: (id: string) =>
    send(`/api/prices?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the removal"),
};
