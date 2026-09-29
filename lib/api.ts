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

/* ------------------------------------------------------------------ *
 * Offline
 *
 * A write that cannot reach the server is kept in an outbox on the device and
 * replayed, in order, once it can. The screen has already moved on
 * optimistically, so from the shop floor a dropped connection looks like
 * nothing at all — the banner is the only sign.
 *
 * The last good ledger is also kept, so a server that cannot be reached at
 * load time still shows the book rather than an error.
 * ------------------------------------------------------------------ */

const OUTBOX_KEY = "asm-outbox-v1";
const LEDGER_KEY = "asm-ledger-v1";

interface Queued {
  path: string;
  method: string;
  body?: string;
  what: string;
  tries?: number;
}

/*
 * Read from storage on every use, never cached: two tabs share this queue, and
 * a private copy in each would overwrite the other's entries on save.
 */
let memory: Queued[] = [];
function box(): Queued[] {
  try {
    memory = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    /* Storage blocked: fall back to what this page holds. */
  }
  return memory;
}

export interface SyncStatus {
  online: boolean;
  pending: number;
}
const SERVER_STATUS: SyncStatus = { online: true, pending: 0 };
let status: SyncStatus = SERVER_STATUS;
const listeners = new Set<() => void>();

function emit() {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const pending = typeof window === "undefined" ? 0 : box().length;
  if (status.online !== online || status.pending !== pending) {
    status = { online, pending };
    listeners.forEach((l) => l());
  }
}

function persist(q: Queued[] = memory) {
  memory = q;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(q));
  } catch {
    /* Storage full or blocked: the queue still works until the page closes. */
  }
  emit();
}

export const syncStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0 && typeof window !== "undefined") {
      status = { online: navigator.onLine, pending: box().length };
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", emit);
      // Changes left over from a closed tab go out as soon as the app opens.
      if (navigator.onLine && box().length > 0) void flushOutbox();
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", emit);
      }
    };
  },
  getSnapshot: () => status,
  getServerSnapshot: () => SERVER_STATUS,
};

function onOnline() {
  emit();
  void flushOutbox();
}

let flushing: Promise<void> | null = null;

/** A server error that may clear up is retried; this many failures and it is given up on. */
const MAX_TRIES = 5;

async function drain() {
  for (;;) {
    const item = box()[0];
    if (!item) return;

    let res: Response;
    try {
      res = await fetch(item.path, {
        method: item.method,
        headers: item.body ? { "Content-Type": "application/json" } : undefined,
        body: item.body,
      });
    } catch {
      return; // still offline; try again on the next reconnect
    }
    if (signedOut(res)) return;

    if (!res.ok && res.status >= 500 && (item.tries ?? 0) + 1 < MAX_TRIES) {
      /* The server hiccuped. Dropping the entry would lose a real sale, and
         skipping past it would let later edits land before it. Keep it at the
         head and stop; the next reconnect or tap tries again. */
      const q = box();
      q[0] = { ...item, tries: (item.tries ?? 0) + 1 };
      persist(q);
      return;
    }

    const q = box().slice(1);
    persist(q);
    if (!res.ok) {
      onError?.(
        `Could not save ${item.what} after reconnecting. The screen has been put back to what is saved.`,
      );
      onDesync?.();
    }
  }
}

/**
 * Sends what is waiting, oldest first, stopping at the first failure. Only one
 * tab drains at a time, or the same entry would go out twice.
 */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  const run = () => drain();
  const attempt: Promise<void> =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("asm-outbox", run).then(() => undefined)
      : run();
  const done: Promise<void> = attempt.finally(() => {
    flushing = null;
    emit();
  });
  flushing = done;
  return done;
}

/** Signing out must not leave one person's book on a shared device. */
export async function clearOfflineData() {
  await flushOutbox();
  try {
    localStorage.removeItem(OUTBOX_KEY);
    localStorage.removeItem(LEDGER_KEY);
  } catch {
    /* Nothing stored. */
  }
  persist([]);
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
  const queued: Queued = {
    path,
    method: init.method ?? "POST",
    body: typeof init.body === "string" ? init.body : undefined,
    what,
  };

  /* Anything already waiting goes first, or a later edit could land before
     the sale it edits. */
  if (box().length > 0) {
    persist([...box(), queued]);
    void flushOutbox();
    return true;
  }

  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    persist([...box(), queued]);
    return true;
  }
  if (signedOut(res)) return false;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    onError?.(
      `${body.error ?? `Could not save ${what}`}. The screen has been put back to what is saved.`,
    );
    onDesync?.();
    return false;
  }
  return true;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/*
 * `background` marks the refreshes that happen on their own — returning to the
 * app, or the periodic check. Those failing costs nothing: the screen carries
 * on showing the last good data, so it says so rather than raising an alarm
 * about work being undone.
 */
export async function loadLedger(background = false): Promise<{
  bills: Bill[];
  expenses: Expense[];
  purchases: Purchase[];
  prices: PriceItem[];
  categories: string[];
} | null> {
  /* Unsent changes would be wiped by a fresh read, so send them first; if they
     cannot go yet, leave the screen exactly as it is. */
  if (box().length > 0) {
    await flushOutbox();
    if (box().length > 0) return null;
  }
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    if (signedOut(res)) return null;
    if (!res.ok) {
      onError?.(
        background
          ? "Could not refresh just now — still showing the data last loaded"
          : "Could not load your data",
      );
      return null;
    }
    const data = await res.json();
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(data));
    } catch {
      /* Too big or blocked: only the offline fallback is lost. */
    }
    return data;
  } catch {
    if (!background) {
      try {
        const cached = localStorage.getItem(LEDGER_KEY);
        if (cached) {
          onError?.("You are offline — showing the data last loaded");
          return JSON.parse(cached);
        }
      } catch {
        /* Fall through to the plain error. */
      }
    }
    onError?.(
      background
        ? "Could not refresh just now — still showing the data last loaded"
        : "Could not reach the server",
    );
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
  settleBill: (p: { id: string; billId: string; date: string; amount: number; mode?: "cash" | "upi" }) =>
    send("/api/bills/settle", json(p), "the payment"),
  updateCreditPayment: (p: { id: string; amount: number }) =>
    send("/api/bills/settle", { ...json(p), method: "PATCH" }, "the correction"),
  deleteCreditPayment: (id: string) =>
    send(`/api/bills/settle?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),
  renameCreditCustomer: (from: string, to: string) =>
    send("/api/bills/customer", { ...json({ from, to }), method: "PATCH" }, "the rename"),
  deleteCreditCustomer: (customer: string) =>
    send(
      `/api/bills/customer?customer=${encodeURIComponent(customer)}`,
      { method: "DELETE" },
      "the deletion",
    ),

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

  updatePurchasePayment: (p: { id: string; amount: number }) =>
    send("/api/purchases/pay", { ...json(p), method: "PATCH" }, "the correction"),
  deletePurchasePayment: (id: string) =>
    send(`/api/purchases/pay?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the deletion"),

  savePrice: (item: PriceItem) => send("/api/prices", json(item), "the price"),
  deletePrice: (id: string) =>
    send(`/api/prices?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "the removal"),
  addCategory: (name: string) => send("/api/prices/category", json({ name }), "the category"),
  renameCategory: (from: string, to: string) =>
    send("/api/prices/category", { ...json({ from, to }), method: "PATCH" }, "the category"),
  clearCategory: (name: string) =>
    send(
      `/api/prices/category?name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
      "the category",
    ),
};
