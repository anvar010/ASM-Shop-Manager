"use client";

import type { Bill, Expense, Purchase } from "./types";

/*
 * Every mutation is applied to local state first and sent here afterwards, so
 * the UI stays instant. A failed write is reported through onError rather than
 * thrown, because a rejected promise in an event handler would go unnoticed.
 */

let onError: ((message: string) => void) | null = null;

export function setApiErrorHandler(handler: (message: string) => void) {
  onError = handler;
}

async function send(path: string, init: RequestInit, what: string) {
  try {
    const res = await fetch(path, init);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      onError?.(body.error ?? `Could not save ${what}`);
      return false;
    }
    return true;
  } catch {
    onError?.(`Could not reach the server to save ${what}`);
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
} | null> {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
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

export const api = {
  addBill: (bill: Bill) => send("/api/bills", json(bill), "the bill"),
  deleteBill: (id: string) =>
    send(`/api/bills?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),
  settleBill: (p: { id: string; billId: string; date: string; amount: number }) =>
    send("/api/bills/settle", json(p), "the payment"),

  addExpense: (expense: Expense) => send("/api/expenses", json(expense), "the expense"),
  deleteExpense: (id: string) =>
    send(`/api/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),

  addPurchase: (purchase: Purchase) => send("/api/purchases", json(purchase), "the purchase"),
  updatePurchase: (purchase: Purchase) =>
    send("/api/purchases", { ...json(purchase), method: "PATCH" }, "the changes"),
  deletePurchase: (id: string) =>
    send(`/api/purchases?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),
  payPurchase: (p: { id: string; purchaseId: string; date: string; amount: number }) =>
    send("/api/purchases/pay", json(p), "the payment"),
};
