"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, categoryMeta, expenseMeta, modeMeta, PAYMENT_MODES } from "./constants";
import { daysBetween, formatDateKey, formatINR, formatTime } from "./format";
import { buildDay, buildPeriod, PERIOD_META } from "./periods";
import {
  api,
  ledgerVersion,
  loadLedger,
  setApiErrorHandler,
  setDesyncHandler,
} from "./api";
import { dateKeyOf, dayBack, dayOptions, todayKey } from "./seed";
import type {
  Bill,
  CategoryId,
  ExpenseCategoryId,
  PaymentModeId,
  PeriodId,
  Expense,
  PriceItem,
  Purchase,
  PurchaseRangeId,
  TabId,
} from "./types";

/** CHAR(36) keys, generated here so a new row can render before it is saved. */
function newId(_prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`.padEnd(36, "0").slice(0, 36);
}

/**
 * `signedIn` gates the initial load. The provider wraps every route including
 * the login screen, where fetching the ledger can only ever answer 401 — and
 * answering 401 sends the browser to /login, which mounts the provider, which
 * fetches again. That was a reload loop, not a slow page.
 */
export function useShop(signedIn: boolean) {
  const [activeTab, setActiveTab] = useState<TabId>("bills");
  /* The ledger lives in the database; this mirrors it so every derived figure
     stays synchronous. Writes update the mirror first and persist after. */
  /* Re-read at midnight so an app left open overnight starts filing sales
     under the new day instead of yesterday's. */
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const id = setInterval(() => {
      const now = todayKey();
      setToday((prev) => (prev === now ? prev : now));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const DAY_OPTIONS = useMemo(() => dayOptions(), [today]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodId>("today");
  /* A specific day chosen on the report's calendar. While set it overrides the
     Today/Week/Month toggle, and picking a preset clears it. */
  const [reportDate, setReportDate] = useState<string | null>(null);

  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<CategoryId>("groceries");
  const [formMode, setFormMode] = useState<PaymentModeId>("cash");
  const [formCustomer, setFormCustomer] = useState("");
  /** Set while the bill form is changing an existing sale rather than adding one. */
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  /* Credit is often written up after the fact, so the date is editable. It
     starts on today and returns there once the bill is saved. */
  const [formDate, setFormDate] = useState(todayKey);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategoryId>("supplier");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  /* Which day the Expenses tab is showing. Entering always writes to today;
     this only decides what is listed. */
  const [expenseDate, setExpenseDate] = useState(todayKey);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [priceSearch, setPriceSearch] = useState("");
  const [priceName, setPriceName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceUnit, setPriceUnit] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseDueOnly, setPurchaseDueOnly] = useState(false);
  /* The all-bills page filters independently of the Stock tab, so switching
     between them never leaves one quietly narrowed by the other. */
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDueOnly, setLedgerDueOnly] = useState(false);
  const [ledgerRange, setLedgerRange] = useState<PurchaseRangeId>("all");
  /** Custom window picked on the calendar, as YYYY-MM-DD keys. */
  const [ledgerFromDate, setLedgerFromDate] = useState("");
  const [ledgerToDate, setLedgerToDate] = useState("");

  /* Filters for the credit-customers page, kept apart from every other view. */
  const [creditSearch, setCreditSearch] = useState("");
  const [creditRange, setCreditRange] = useState<PurchaseRangeId>("all");
  const [creditFromDate, setCreditFromDate] = useState("");
  const [creditToDate, setCreditToDate] = useState("");
  const [creditOwingOnly, setCreditOwingOnly] = useState(true);
  /** Which credit bill has its settle field open, and what is typed in it. */
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchaseItem, setPurchaseItem] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchasePaid, setPurchasePaid] = useState("");
  /* Editing happens on the purchase's own card and keeps its own fields, so
     it never disturbs a half-typed new purchase in the form above. */
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState("");
  const [editItem, setEditItem] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaid, setEditPaid] = useState("");
  /** Bumped whenever a row sends details to the form, so the view can scroll to it. */
  const [purchaseFormNonce, setPurchaseFormNonce] = useState(0);
  /** Which purchase row has its pay-off field open, and what is typed in it. */
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const applyLedger = useCallback((data: Awaited<ReturnType<typeof loadLedger>>) => {
    if (!data) return false;
    setBills(data.bills);
    setExpenses(data.expenses);
    setPurchases(data.purchases);
    setPrices(data.prices ?? []);
    return true;
  }, []);

  /** Re-read the ledger in the background, leaving the screen up meanwhile. */
  const refresh = useCallback(() => loadLedger().then(applyLedger), [applyLedger]);

  /*
   * Two people work this book at once, so a screen left open goes stale. It is
   * re-read whenever the app is actually being looked at again — returning
   * from another app, or unlocking the phone.
   *
   * Deliberately not a timer: polling spends a request every interval on every
   * device whether or not anyone is watching, and the moment that matters is
   * the moment someone looks. This costs nothing while idle, and less than the
   * full reload that reopening the app performs today.
   */
  /*
   * While the screen is open and being watched, ask only whether anything has
   * changed — a fingerprint of a few bytes — and read the ledger itself only
   * when the answer differs. A screen someone is staring at therefore costs
   * almost nothing, and a screen nobody is looking at costs literally nothing:
   * the timer is cleared the moment the app is hidden.
   */
  useEffect(() => {
    if (!signedIn) return;
    let version: string | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      const next = await ledgerVersion();
      if (next === null) return;
      if (version !== null && next !== version) await refresh();
      version = next;
    };

    const start = () => {
      if (timer) return;
      void check();
      timer = setInterval(check, 30_000);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [signedIn, refresh]);

  useEffect(() => {
    if (!signedIn) return;

    let last = Date.now();
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      // Returning to an app fires focus and visibilitychange together, and a
      // glance away and back should not re-read anything.
      const now = Date.now();
      if (now - last < 5000) return;
      last = now;
      refresh();
    };

    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [signedIn, refresh]);

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }

    setApiErrorHandler(setSaveError);
    /* A failed write leaves the screen ahead of the database. Re-reading is
       the only reliable way back: it cannot get an inverse operation wrong. */
    setDesyncHandler(() => {
      loadLedger().then(applyLedger);
    });

    let cancelled = false;
    loadLedger().then((data) => {
      if (cancelled) return;
      if (!applyLedger(data)) {
        setLoadError("Could not load your data. Check the connection and reload.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, applyLedger]);

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  const todaysBills = useMemo(() => bills.filter((b) => b.date === today), [bills, today]);
  const viewBills = useMemo(
    () => bills.filter((b) => b.date === selectedDate),
    [bills, selectedDate],
  );
  const isTodayView = selectedDate === today;

  const todayTotal = useMemo(() => todaysBills.reduce((s, b) => s + b.amount, 0), [todaysBills]);
  const viewTotal = useMemo(() => viewBills.reduce((s, b) => s + b.amount, 0), [viewBills]);
  /* Expenses carry a date now, so the profit figure must scope to today
     rather than summing every expense ever recorded. */
  const todaysExpenses = useMemo(
    () => expenses.filter((e) => e.date === today),
    [expenses, today],
  );

  /* The day on screen, which is today unless another was picked. */
  const viewExpenses = useMemo(
    () => expenses.filter((e) => e.date === expenseDate),
    [expenses, expenseDate],
  );
  const isExpenseToday = expenseDate === today;
  const viewExpenseTotal = useMemo(
    () => viewExpenses.reduce((s, e) => s + e.amount, 0),
    [viewExpenses],
  );
  const expenseDay = DAY_OPTIONS.find((d) => d.key === expenseDate) ?? {
    key: expenseDate,
    short: formatDateKey(expenseDate),
    sub: formatDateKey(expenseDate),
    long: formatDateKey(expenseDate),
  };

  /** The last seven days, each carrying its own spend. */
  const expenseDayChips = useMemo(
    () =>
      DAY_OPTIONS.map((d) => ({
        ...d,
        active: expenseDate === d.key,
        totalLabel: formatINR(
          expenses.reduce((s, e) => (e.date === d.key ? s + e.amount : s), 0),
        ),
      })),
    [expenses, expenseDate, DAY_OPTIONS],
  );

  /** Days that carry an expense, for the calendar's markers. */
  const expenseDates = useMemo(() => new Set(expenses.map((e) => e.date)), [expenses]);
  const expenseTotal = useMemo(
    () => todaysExpenses.reduce((s, e) => s + e.amount, 0),
    [todaysExpenses],
  );
  const profit = todayTotal - expenseTotal;

  const periodStats = useMemo(
    () =>
      reportDate
        ? buildDay(reportDate, bills, formatDateKey(reportDate))
        : buildPeriod(period, bills, todaysBills),
    [reportDate, period, bills, todaysBills],
  );

  const periodAvgPerDay = useMemo(
    // A single chosen day spans one day, whatever the toggle last said.
    () => Math.round(periodStats.total / (reportDate ? 1 : PERIOD_META[period].days)),
    [periodStats, period, reportDate],
  );

  /* Strongest bucket of the current trend: an hour block today, a weekday
     over a week, a week over a month. */
  const periodBest = useMemo(() => {
    let best = 0;
    periodStats.trend.forEach((v, i) => {
      if (v > periodStats.trend[best]) best = i;
    });
    return {
      title: reportDate ? "Busiest hours" : PERIOD_META[period].bestTitle,
      label: periodStats.total > 0 ? periodStats.trendLabels[best] : "—",
    };
  }, [periodStats, period, reportDate]);

  /** How the period's takings split across cash, UPI and credit. */
  const periodPaymentSplit = useMemo(
    () =>
      PAYMENT_MODES.map((m) => {
        const amount = periodStats.list.reduce((sum, b) => (b.mode === m.id ? sum + b.amount : sum), 0);
        return {
          ...m,
          amount,
          amountLabel: formatINR(amount),
          pct: periodStats.total > 0 ? Math.round((amount / periodStats.total) * 100) : 0,
        };
      }),
    [periodStats],
  );

  /** Day-by-day takings across the period, newest first. */
  const periodDayRows = useMemo(() => {
    const byDate = new Map<string, { date: string; total: number; bills: number }>();
    periodStats.list.forEach((b) => {
      const row = byDate.get(b.date) ?? { date: b.date, total: 0, bills: 0 };
      row.total += b.amount;
      row.bills += 1;
      byDate.set(b.date, row);
    });
    return [...byDate.values()]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((r) => {
        const day = DAY_OPTIONS.find((d) => d.key === r.date);
        return {
          ...r,
          totalLabel: formatINR(r.total),
          dayLabel: day ? `${day.short}, ${day.sub}` : formatDateKey(r.date),
        };
      });
  }, [periodStats]);

  /** The period's best and worst selling day, for the report's highlights. */
  const periodExtremes = useMemo(() => {
    if (periodDayRows.length === 0) return null;
    const sorted = [...periodDayRows].sort((a, b) => b.total - a.total);
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [periodDayRows]);

  const chartBars = useMemo(() => {
    const max = Math.max(...periodStats.trend, 1);
    return periodStats.trend.map((v, i) => ({
      key: `bar-${i}`,
      heightPct: Math.round((v / max) * 100),
      label: periodStats.trendLabels[i],
    }));
  }, [periodStats]);

  const categoryBreakdown = useMemo(() => {
    const denominator = periodStats.total || 1;
    return CATEGORIES.map((c) => {
      const amt = periodStats.list.reduce(
        (sum, b) => (b.category === c.id ? sum + b.amount : sum),
        0,
      );
      return {
        id: c.id,
        label: c.label,
        color: c.color,
        raw: (amt / denominator) * 100,
        pct: Math.round((amt / denominator) * 100),
      };
    });
  }, [periodStats]);

  const donutGradient = useMemo(() => {
    let cum = 0;
    const stops = categoryBreakdown.map((c) => {
      const start = cum;
      cum += c.raw;
      return `${c.color} ${start}% ${cum}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [categoryBreakdown]);

  const paymentSplit = useMemo(
    () =>
      PAYMENT_MODES.map((m) => {
        const amount = viewBills.reduce((s, b) => (b.mode === m.id ? s + b.amount : s), 0);
        return {
          ...m,
          amountLabel: formatINR(amount),
          pct: viewTotal > 0 ? Math.round((amount / viewTotal) * 100) : 0,
        };
      }),
    [viewBills, viewTotal],
  );

  /* Expenses are paid out of the till, so they come off the cash actually in
     hand — not off the day's takings, which are what was sold. */
  const viewCashSales = useMemo(
    () => viewBills.reduce((s, b) => (b.mode === "cash" ? s + b.amount : s), 0),
    [viewBills],
  );
  const viewExpensesPaid = useMemo(
    () => expenses.reduce((s, e) => (e.date === selectedDate ? s + e.amount : s), 0),
    [expenses, selectedDate],
  );
  const cashInDrawer = viewCashSales - viewExpensesPaid;
  const todayCashSales = useMemo(
    () => todaysBills.reduce((s, b) => (b.mode === "cash" ? s + b.amount : s), 0),
    [todaysBills],
  );
  const todayCash = todayCashSales - expenseTotal;

  /* Credit is billed but not collected, so it is tracked apart from the drawer. */
  const creditTotal = useMemo(
    () => viewBills.reduce((s, b) => (b.mode === "credit" ? s + b.amount : s), 0),
    [viewBills],
  );

  const billRows = useMemo(
    () =>
      viewBills.map((b) => {
        const cat = categoryMeta(b.category);
        const mode = modeMeta(b.mode);
        return {
          ...b,
          catLabel: cat.label,
          catColor: cat.color,
          modeLabel: mode.label,
          modeColor: mode.color,
          amountLabel: formatINR(b.amount),
        };
      }),
    [viewBills],
  );

  const todayRows = useMemo(
    () =>
      todaysBills.map((b) => {
        const cat = categoryMeta(b.category);
        return { ...b, catLabel: cat.label, catColor: cat.color, amountLabel: formatINR(b.amount) };
      }),
    [todaysBills],
  );

  const expenseRows = useMemo(
    () =>
      viewExpenses.map((e) => {
        const cat = expenseMeta(e.category);
        return { ...e, catLabel: cat.label, catColor: cat.color, amountLabel: formatINR(e.amount) };
      }),
    [viewExpenses],
  );

  /* A purchase is settled once the upfront payment plus every later
     part-payment covers the value of the goods. Decorated once here, then
     filtered separately by the Stock tab and the all-bills page. */
  const allRows = useMemo(
    () =>
      purchases
        .map((p) => {
          const paidLater = p.payments.reduce((sum, pay) => sum + pay.amount, 0);
          const paid = p.paidUpfront + paidLater;
          const balance = Math.max(0, p.amount - paid);
          const day = DAY_OPTIONS.find((d) => d.key === p.date);
          return {
            ...p,
            paid,
            paidLater,
            balance,
            settled: balance === 0,
            dayLabel: day ? `${day.short}, ${day.sub}` : formatDateKey(p.date),
            amountLabel: formatINR(p.amount),
            paidLabel: formatINR(paid),
            balanceLabel: formatINR(balance),
            payLog: p.payments.map((pay) => {
              const payDay = DAY_OPTIONS.find((d) => d.key === pay.date);
              return {
                ...pay,
                amountLabel: formatINR(pay.amount),
                dayLabel: payDay ? payDay.sub : formatDateKey(pay.date),
              };
            }),
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [purchases],
  );

  const purchaseRows = useMemo(() => {
    const q = purchaseSearch.trim().toLowerCase();
    return allRows
      .filter(
        (p) =>
          q === "" || p.supplier.toLowerCase().includes(q) || p.item.toLowerCase().includes(q),
      )
      .filter((p) => !purchaseDueOnly || !p.settled);
  }, [allRows, purchaseSearch, purchaseDueOnly]);

  /** The window the ledger admits. Empty strings mean "no bound". */
  const ledgerWindow = useMemo(() => {
    if (ledgerRange === "custom") {
      return { from: ledgerFromDate, to: ledgerToDate || ledgerFromDate };
    }
    if (ledgerRange === "today") return { from: today, to: "" };
    if (ledgerRange === "week") return { from: dateKeyOf(dayBack(6)), to: "" };
    if (ledgerRange === "month") return { from: dateKeyOf(dayBack(27)), to: "" };
    return { from: "", to: "" };
  }, [today, ledgerRange, ledgerFromDate, ledgerToDate]);

  /** Days that carry at least one bill, for the calendar's markers. */
  const purchaseDates = useMemo(() => new Set(purchases.map((p) => p.date)), [purchases]);

  /** Every bill, flat and newest first, for the all-bills page. */
  const ledgerRows = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return allRows
      .filter(
        (p) =>
          q === "" || p.supplier.toLowerCase().includes(q) || p.item.toLowerCase().includes(q),
      )
      .filter((p) => !ledgerDueOnly || !p.settled)
      .filter((p) => ledgerWindow.from === "" || p.date >= ledgerWindow.from)
      .filter((p) => ledgerWindow.to === "" || p.date <= ledgerWindow.to);
  }, [allRows, ledgerSearch, ledgerDueOnly, ledgerWindow]);

  const creditWindow = useMemo(() => {
    if (creditRange === "custom") {
      return { from: creditFromDate, to: creditToDate || creditFromDate };
    }
    if (creditRange === "today") return { from: today, to: "" };
    if (creditRange === "week") return { from: dateKeyOf(dayBack(6)), to: "" };
    if (creditRange === "month") return { from: dateKeyOf(dayBack(27)), to: "" };
    return { from: "", to: "" };
  }, [today, creditRange, creditFromDate, creditToDate]);

  /** Every bill taken on credit, newest first, with what is left to collect. */
  const creditBills = useMemo(
    () =>
      bills
        .filter((b) => b.mode === "credit")
        .map((b) => {
          const repaid = (b.creditPayments ?? []).reduce((sum, p) => sum + p.amount, 0);
          const balance = Math.max(0, b.amount - repaid);
          return { ...b, repaid, balance, settled: balance === 0 };
        })
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [bills],
  );

  /** The price list, filtered by what has been typed, cheapest name first. */
  const priceRows = useMemo(() => {
    const q = priceSearch.trim().toLowerCase();
    return prices
      .filter((p) => q === "" || p.name.toLowerCase().includes(q))
      .map((p) => ({ ...p, priceLabel: formatINR(p.price) }));
  }, [prices, priceSearch]);

  /** Days that carry a sale, for the report calendar's markers. */
  const billDates = useMemo(() => new Set(bills.map((b) => b.date)), [bills]);

  const creditDates = useMemo(() => new Set(creditBills.map((b) => b.date)), [creditBills]);

  /** One group per person who owes the shop, largest debt first. */
  const creditorGroups = useMemo(() => {
    const q = creditSearch.trim().toLowerCase();
    const inWindow = creditBills
      .filter((b) => creditWindow.from === "" || b.date >= creditWindow.from)
      .filter((b) => creditWindow.to === "" || b.date <= creditWindow.to);

    const byName = new Map<
      string,
      {
        customer: string;
        rows: typeof inWindow;
        owed: number;
        taken: number;
        lastDate: string;
        owingSince: string;
      }
    >();
    inWindow.forEach((b) => {
      const name = b.customer || "Unnamed";
      const g =
        byName.get(name) ??
        { customer: name, rows: [], owed: 0, taken: 0, lastDate: "", owingSince: "" };
      g.rows.push(b);
      g.owed += b.balance;
      g.taken += b.amount;
      if (b.date > g.lastDate) g.lastDate = b.date;
      // The oldest bill still carrying a balance is what "owing since" means.
      if (b.balance > 0 && (g.owingSince === "" || b.date < g.owingSince)) {
        g.owingSince = b.date;
      }
      byName.set(name, g);
    });

    return [...byName.values()]
      .filter((g) => !creditOwingOnly || g.owed > 0)
      .filter(
        (g) =>
          q === "" ||
          g.customer.toLowerCase().includes(q) ||
          g.rows.some((b) => b.desc.toLowerCase().includes(q)),
      )
      .sort((a, b) => (b.owed !== a.owed ? b.owed - a.owed : b.lastDate < a.lastDate ? -1 : 1))
      .map((g) => {
        const lastDay = DAY_OPTIONS.find((d) => d.key === g.lastDate);
        const sinceDay = DAY_OPTIONS.find((d) => d.key === g.owingSince);
        const age = g.owingSince ? daysBetween(g.owingSince, today) : 0;
        return {
          ...g,
          settled: g.owed === 0,
          owingSinceLabel: g.owingSince
            ? sinceDay
              ? sinceDay.sub
              : formatDateKey(g.owingSince)
            : "",
          owingAgeLabel: age === 0 ? "today" : age === 1 ? "1 day" : `${age} days`,
          owedLabel: formatINR(g.owed),
          takenLabel: formatINR(g.taken),
          lastLabel: lastDay ? `${lastDay.short}, ${lastDay.sub}` : formatDateKey(g.lastDate),
          rows: g.rows.map((b) => {
            const day = DAY_OPTIONS.find((d) => d.key === b.date);
            const cat = categoryMeta(b.category);
            return {
              ...b,
              amountLabel: formatINR(b.amount),
              repaidLabel: formatINR(b.repaid),
              balanceLabel: formatINR(b.balance),
              catLabel: cat.label,
              catColor: cat.color,
              dayLabel: day ? `${day.short}, ${day.sub}` : formatDateKey(b.date),
              ageLabel: (() => {
                const n = daysBetween(b.date, today);
                return n === 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`;
              })(),
              // When the last repayment cleared it, for the settled stamp.
              settledOn: (() => {
                const log = b.creditPayments ?? [];
                if (log.length === 0 || b.balance > 0) return "";
                const key = log[log.length - 1].date;
                const d = DAY_OPTIONS.find((x) => x.key === key);
                return d ? `${d.short}, ${d.sub}` : formatDateKey(key);
              })(),
              payLog: (b.creditPayments ?? []).map((p) => {
                const payDay = DAY_OPTIONS.find((d) => d.key === p.date);
                return {
                  ...p,
                  amountLabel: formatINR(p.amount),
                  dayLabel: payDay ? payDay.sub : formatDateKey(p.date),
                };
              }),
            };
          }),
        };
      });
  }, [today, creditBills, creditSearch, creditWindow, creditOwingOnly]);

  /** Everyone who has ever taken credit, for the bill form's name lookup. */
  const customerStats = useMemo(() => {
    const byName = new Map<string, { customer: string; bills: number; owed: number; lastDate: string }>();
    creditBills.forEach((b) => {
      const name = b.customer || "Unnamed";
      const r = byName.get(name) ?? { customer: name, bills: 0, owed: 0, lastDate: "" };
      r.bills += 1;
      r.owed += b.balance;
      if (b.date > r.lastDate) r.lastDate = b.date;
      byName.set(name, r);
    });
    return [...byName.values()]
      .sort((a, b) => (b.lastDate < a.lastDate ? -1 : 1))
      .map((r) => ({ ...r, owedLabel: formatINR(r.owed) }));
  }, [creditBills]);

  /** Known customers matching what has been typed. Empty query lists all. */
  const customerMatches = useMemo(() => {
    const q = formCustomer.trim().toLowerCase();
    if (q === "") return customerStats;
    return customerStats.filter((r) => r.customer.toLowerCase().includes(q));
  }, [customerStats, formCustomer]);

  /** The person this credit bill would be filed under, if the name exists. */
  const customerExact = useMemo(() => {
    const q = formCustomer.trim().toLowerCase();
    if (q === "") return null;
    return customerStats.find((r) => r.customer.toLowerCase() === q) ?? null;
  }, [customerStats, formCustomer]);

  const creditorsOwed = useMemo(
    () => creditorGroups.reduce((sum, g) => sum + g.owed, 0),
    [creditorGroups],
  );

  const creditorsBillCount = useMemo(
    () => creditorGroups.reduce((sum, g) => sum + g.rows.length, 0),
    [creditorGroups],
  );

  /** Purchases folded into one group per shop, for the collapsed history. */
  const supplierGroups = useMemo(() => {
    const byName = new Map<
      string,
      {
        supplier: string;
        rows: typeof purchaseRows;
        total: number;
        paid: number;
        balance: number;
        lastDate: string;
        lastLabel: string;
      }
    >();
    purchaseRows.forEach((r) => {
      const g =
        byName.get(r.supplier) ??
        {
          supplier: r.supplier,
          rows: [] as typeof purchaseRows,
          total: 0,
          paid: 0,
          balance: 0,
          lastDate: "",
          lastLabel: "",
        };
      g.rows.push(r);
      g.total += r.amount;
      g.paid += r.paid;
      g.balance += r.balance;
      if (r.date > g.lastDate) {
        g.lastDate = r.date;
        g.lastLabel = r.dayLabel;
      }
      byName.set(r.supplier, g);
    });
    // Most recently bought from first; a bigger balance breaks a same-day tie.
    return [...byName.values()]
      .sort((a, b) =>
        a.lastDate === b.lastDate ? b.balance - a.balance : a.lastDate < b.lastDate ? 1 : -1,
      )
      .map((g) => ({
        ...g,
        settled: g.balance === 0,
        totalLabel: formatINR(g.total),
        paidLabel: formatINR(g.paid),
        balanceLabel: formatINR(g.balance),
      }));
  }, [purchaseRows]);

  /** What is still owed, one row per supplier, largest first. */
  const supplierDues = useMemo(() => {
    const byName = new Map<string, { supplier: string; balance: number; loads: number }>();
    purchases.forEach((p) => {
      const paid = p.paidUpfront + p.payments.reduce((sum, pay) => sum + pay.amount, 0);
      const balance = Math.max(0, p.amount - paid);
      if (balance === 0) return;
      const row = byName.get(p.supplier) ?? { supplier: p.supplier, balance: 0, loads: 0 };
      row.balance += balance;
      row.loads += 1;
      byName.set(p.supplier, row);
    });
    return [...byName.values()]
      .sort((a, b) => b.balance - a.balance)
      .map((r) => ({ ...r, balanceLabel: formatINR(r.balance) }));
  }, [purchases]);

  /** Every shop bought from, with its load count and what is still owed. */
  const supplierStats = useMemo(() => {
    const byName = new Map<
      string,
      { supplier: string; loads: number; spent: number; balance: number; lastDate: string }
    >();
    purchases.forEach((p) => {
      const paid = p.paidUpfront + p.payments.reduce((sum, pay) => sum + pay.amount, 0);
      const row =
        byName.get(p.supplier) ??
        { supplier: p.supplier, loads: 0, spent: 0, balance: 0, lastDate: "" };
      row.loads += 1;
      row.spent += p.amount;
      row.balance += Math.max(0, p.amount - paid);
      if (p.date > row.lastDate) row.lastDate = p.date;
      byName.set(p.supplier, row);
    });
    return [...byName.values()]
      .sort((a, b) => (b.lastDate === a.lastDate ? b.loads - a.loads : b.lastDate < a.lastDate ? -1 : 1))
      .map((r) => ({
        ...r,
        balanceLabel: formatINR(r.balance),
        spentLabel: formatINR(r.spent),
        lastLabel: formatDateKey(r.lastDate),
      }));
  }, [purchases]);

  /** Known shops matching what has been typed so far. Empty query lists all. */
  const supplierMatches = useMemo(() => {
    const q = purchaseSupplier.trim().toLowerCase();
    if (q === "") return supplierStats;
    return supplierStats.filter((r) => r.supplier.toLowerCase().includes(q));
  }, [supplierStats, purchaseSupplier]);

  /** The shop this purchase would be filed under, if the name already exists. */
  const supplierExact = useMemo(() => {
    const q = purchaseSupplier.trim().toLowerCase();
    if (q === "") return null;
    return supplierStats.find((r) => r.supplier.toLowerCase() === q) ?? null;
  }, [supplierStats, purchaseSupplier]);

  /** Part-payments already logged against the row being edited, if any. */
  const editingPaidLater = useMemo(() => {
    if (!editingPurchaseId) return 0;
    const p = purchases.find((x) => x.id === editingPurchaseId);
    return p ? p.payments.reduce((sum, pay) => sum + pay.amount, 0) : 0;
  }, [editingPurchaseId, purchases]);

  const totalOwed = useMemo(
    () => supplierDues.reduce((sum, r) => sum + r.balance, 0),
    [supplierDues],
  );

  const selectedDay = DAY_OPTIONS.find((d) => d.key === selectedDate) ?? DAY_OPTIONS[0];

  const dayChips = useMemo(
    () =>
      DAY_OPTIONS.map((d) => ({
        ...d,
        active: selectedDate === d.key,
        totalLabel: formatINR(bills.reduce((s, b) => (b.date === d.key ? s + b.amount : s), 0)),
      })),
    [bills, selectedDate],
  );

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  const pressPad = useCallback((k: string) => {
    setFormAmount((cur) => {
      if (k === "back") return cur.slice(0, -1);
      if (cur.length >= 7) return cur;
      if (cur === "" && (k === "0" || k === "00")) return cur;
      return cur + k;
    });
  }, []);

  const resetBillForm = useCallback(() => {
    setEditingBillId(null);
    setFormAmount("");
    setFormDesc("");
    setFormCustomer("");
    setFormDate(today);
  }, [today]);

  /** Adds a sale, or saves the one being edited. */
  const saveBill = useCallback(() => {
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) return;
    /* Reuse a known customer's own spelling, so "ravi" joins "Ravi" rather
       than opening a second tab under the same person. */
    const creditCustomerName = () => {
      const typed = formCustomer.trim();
      if (!typed) return "Unnamed";
      const known = customerStats.find(
        (r) => r.customer.toLowerCase() === typed.toLowerCase(),
      );
      return known ? known.customer : typed;
    };

    if (editingBillId) {
      const current = bills.find((b) => b.id === editingBillId);
      if (!current) return;
      const next: Bill = {
        ...current,
        date: formDate || current.date,
        desc: formDesc.trim() || "Sale",
        category: formCategory,
        amount: amt,
        mode: formMode,
        ...(formMode === "credit"
          ? { customer: creditCustomerName() }
          : { customer: undefined, creditPayments: undefined }),
      };
      setBills((prev) => prev.map((b) => (b.id === editingBillId ? next : b)));
      api.updateBill(next);
      resetBillForm();
      return;
    }

    const bill: Bill = {
      id: newId("b"),
      date: formDate || today,
      desc: formDesc.trim() || "Sale",
      category: formCategory,
      amount: amt,
      time: formatTime(new Date()),
      mode: formMode,
      ...(formMode === "credit" ? { customer: creditCustomerName() } : {}),
    };
    setBills((prev) => [bill, ...prev]);
    api.addBill(bill);
    resetBillForm();
  }, [
    today,
    formDate,
    editingBillId,
    bills,
    formAmount,
    formDesc,
    formCategory,
    formMode,
    formCustomer,
    customerStats,
    resetBillForm,
  ]);

  const deleteBill = useCallback(
    (id: string) => {
      setBills((prev) => prev.filter((b) => b.id !== id));
      api.deleteBill(id);
      if (editingBillId === id) resetBillForm();
    },
    [editingBillId, resetBillForm],
  );

  /* Loads a sale into the form for editing. Nothing is removed until the
     change is saved, so abandoning an edit cannot lose the bill. */
  const editBill = useCallback(
    (id: string) => {
      const bill = bills.find((b) => b.id === id);
      if (!bill) return;
      setEditingBillId(id);
      setFormDate(bill.date);
      setFormAmount(String(bill.amount));
      setFormDesc(bill.desc);
      setFormCategory(bill.category);
      setFormMode(bill.mode);
      setFormCustomer(bill.customer ?? "");
    },
    [bills],
  );

  const resetExpenseForm = useCallback(() => {
    setEditingExpenseId(null);
    setExpAmount("");
    setExpDesc("");
  }, []);

  /** Adds an expense, or saves the one being edited. */
  const saveExpense = useCallback(() => {
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) return;

    if (editingExpenseId) {
      const current = expenses.find((e) => e.id === editingExpenseId);
      if (!current) return;
      const next: Expense = {
        ...current,
        desc: expDesc.trim() || "Expense",
        category: expCategory,
        amount: amt,
      };
      setExpenses((prev) => prev.map((e) => (e.id === editingExpenseId ? next : e)));
      api.updateExpense(next);
      resetExpenseForm();
      return;
    }

    const expense: Expense = {
      id: newId("e"),
      date: today,
      desc: expDesc.trim() || "Expense",
      category: expCategory,
      amount: amt,
      time: formatTime(new Date()),
    };
    setExpenses((prev) => [expense, ...prev]);
    api.addExpense(expense);
    resetExpenseForm();
  }, [today, editingExpenseId, expenses, expAmount, expDesc, expCategory, resetExpenseForm]);

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      api.deleteExpense(id);
      if (editingExpenseId === id) resetExpenseForm();
    },
    [editingExpenseId, resetExpenseForm],
  );

  /* Loads an expense into the form. Nothing is removed until it is saved. */
  const editExpense = useCallback(
    (id: string) => {
      const exp = expenses.find((e) => e.id === id);
      if (!exp) return;
      setEditingExpenseId(id);
      setExpAmount(String(exp.amount));
      setExpDesc(exp.desc);
      setExpCategory(exp.category);
    },
    [expenses],
  );

  const resetPurchaseForm = useCallback(() => {
    setEditingPurchaseId(null);
    setPurchaseSupplier("");
    setPurchaseItem("");
    setPurchaseAmount("");
    setPurchasePaid("");
  }, []);

  const addPurchase = useCallback(() => {
    const typed = purchaseSupplier.trim();
    const amt = parseFloat(purchaseAmount);
    if (!typed || !amt || amt <= 0) return;
    // Reuse a known shop's own spelling, so "ramesh dairy" joins "Ramesh Dairy"
    // instead of opening a second account under the same name.
    const known = supplierStats.find((r) => r.supplier.toLowerCase() === typed.toLowerCase());
    const typedPaid = parseFloat(purchasePaid);
    const paid = Number.isNaN(typedPaid) ? 0 : Math.max(0, typedPaid);
    const purchase: Purchase = {
      id: newId("w"),
      date: today,
      supplier: known ? known.supplier : typed,
      item: purchaseItem.trim() || "Stock",
      amount: amt,
      // Paying more than the goods are worth would read as a negative balance.
      paidUpfront: Math.min(paid, amt),
      payments: [],
    };
    setPurchases((prev) => [purchase, ...prev]);
    api.addPurchase(purchase);
    resetPurchaseForm();
  }, [
    today,
    supplierStats,
    purchaseSupplier,
    purchaseItem,
    purchaseAmount,
    purchasePaid,
    resetPurchaseForm,
  ]);

  const editPurchase = useCallback(
    (id: string) => {
      const p = purchases.find((x) => x.id === id);
      if (!p) return;
      setEditingPurchaseId(id);
      setEditSupplier(p.supplier);
      setEditItem(p.item);
      setEditAmount(String(p.amount));
      setEditPaid(String(p.paidUpfront));
      setPayingId(null);
    },
    [purchases],
  );

  const cancelEdit = useCallback(() => setEditingPurchaseId(null), []);

  /** Saves the card currently open for editing. */
  const saveEdit = useCallback(() => {
    const typed = editSupplier.trim();
    const amt = parseFloat(editAmount);
    if (!editingPurchaseId || !typed || !amt || amt <= 0) return;
    // A load cannot be worth less than the instalments already paid against it.
    if (amt < editingPaidLater) return;
    const known = supplierStats.find((r) => r.supplier.toLowerCase() === typed.toLowerCase());
    const typedPaid = parseFloat(editPaid);
    const paid = Number.isNaN(typedPaid) ? 0 : Math.max(0, typedPaid);
    const current = purchases.find((p) => p.id === editingPurchaseId);
    if (!current) return;
    const next = {
      ...current,
      supplier: known ? known.supplier : typed,
      item: editItem.trim() || "Stock",
      amount: amt,
      // Later part-payments stand; the upfront figure absorbs the rest.
      paidUpfront: Math.max(0, Math.min(paid, amt - editingPaidLater)),
    };
    setPurchases((prev) => prev.map((p) => (p.id === editingPurchaseId ? next : p)));
    api.updatePurchase(next);
    setEditingPurchaseId(null);
  }, [
    editingPurchaseId,
    editingPaidLater,
    purchases,
    supplierStats,
    editSupplier,
    editItem,
    editAmount,
    editPaid,
  ]);

  /** Same shop, same goods, fresh load — carries the details, not the money. */
  const repeatPurchase = useCallback(
    (id: string) => {
      const p = purchases.find((x) => x.id === id);
      if (!p) return;
      setEditingPurchaseId(null);
      setPurchaseSupplier(p.supplier);
      setPurchaseItem(p.item);
      setPurchaseAmount(String(p.amount));
      setPurchasePaid("");
      setPayingId(null);
      setPurchaseFormNonce((n) => n + 1);
    },
    [purchases],
  );

  const deletePurchase = useCallback(
    (id: string) => {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      api.deletePurchase(id);
      if (editingPurchaseId === id) setEditingPurchaseId(null);
    },
    [editingPurchaseId],
  );

  /** Open, close, or move the pay-off field on a purchase row. */
  /* Tapping a day starts a window; tapping a second day closes it. A third
     tap starts over, which is what "pick different dates" always means. */
  const pickLedgerDate = useCallback(
    (key: string) => {
      setLedgerRange("custom");
      if (ledgerFromDate === "" || ledgerToDate !== "") {
        setLedgerFromDate(key);
        setLedgerToDate("");
      } else if (key < ledgerFromDate) {
        setLedgerToDate(ledgerFromDate);
        setLedgerFromDate(key);
      } else {
        setLedgerToDate(key);
      }
    },
    [ledgerFromDate, ledgerToDate],
  );

  /** Open, close, or move the settle field on a credit bill. */
  const startSettling = useCallback((id: string | null) => {
    setSettlingId(id);
    setSettleAmount("");
  }, []);

  /*
   * Records money a customer paid back. Never collects more than is owed.
   *
   * The row is worked out before state is touched: a side effect inside a
   * setState updater runs again whenever React re-invokes it, which under
   * StrictMode meant one ₹200 repayment was written to the database twice.
   */
  const settleCredit = useCallback(
    (id: string, amount: number) => {
      if (!amount || amount <= 0) return;
      const bill = bills.find((b) => b.id === id);
      if (!bill) return;
      const log = bill.creditPayments ?? [];
      const owed = Math.max(0, bill.amount - log.reduce((sum, p) => sum + p.amount, 0));
      const take = Math.min(amount, owed);
      if (take <= 0) return;

      const payment = { id: newId("cp"), date: today, amount: take };
      setBills((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, creditPayments: [...(b.creditPayments ?? []), payment] } : b,
        ),
      );
      api.settleBill({ ...payment, billId: id });
      setSettlingId(null);
      setSettleAmount("");
    },
    [bills, today],
  );

  /** Clears everything one person owes, across all their credit bills. */
  const settleAllFor = useCallback(
    (customer: string) => {
      const owing = bills
        .filter((b) => b.mode === "credit" && (b.customer || "Unnamed") === customer)
        .map((b) => {
          const log = b.creditPayments ?? [];
          const owed = Math.max(0, b.amount - log.reduce((sum, p) => sum + p.amount, 0));
          return { billId: b.id, owed };
        })
        .filter((x) => x.owed > 0)
        .map((x) => ({ billId: x.billId, id: newId("cp"), date: today, amount: x.owed }));
      if (owing.length === 0) return;

      setBills((prev) =>
        prev.map((b) => {
          const pay = owing.find((o) => o.billId === b.id);
          if (!pay) return b;
          const { billId: _billId, ...payment } = pay;
          return { ...b, creditPayments: [...(b.creditPayments ?? []), payment] };
        }),
      );
      owing.forEach(({ billId, ...payment }) => api.settleBill({ ...payment, billId }));
      setSettlingId(null);
      setSettleAmount("");
    },
    [bills, today],
  );

  const pickCreditDate = useCallback(
    (key: string) => {
      setCreditRange("custom");
      if (creditFromDate === "" || creditToDate !== "") {
        setCreditFromDate(key);
        setCreditToDate("");
      } else if (key < creditFromDate) {
        setCreditToDate(creditFromDate);
        setCreditFromDate(key);
      } else {
        setCreditToDate(key);
      }
    },
    [creditFromDate, creditToDate],
  );

  const clearCreditDates = useCallback(() => {
    setCreditRange("all");
    setCreditFromDate("");
    setCreditToDate("");
  }, []);

  const chooseCreditRange = useCallback((id: PurchaseRangeId) => {
    setCreditRange(id);
    setCreditFromDate("");
    setCreditToDate("");
  }, []);

  const clearLedgerDates = useCallback(() => {
    setLedgerRange("all");
    setLedgerFromDate("");
    setLedgerToDate("");
  }, []);

  /** Choosing a preset drops whatever the calendar had selected. */
  const chooseLedgerRange = useCallback((id: PurchaseRangeId) => {
    setLedgerRange(id);
    setLedgerFromDate("");
    setLedgerToDate("");
  }, []);

  const startPaying = useCallback((id: string | null) => {
    setPayingId(id);
    setPayAmount("");
  }, []);

  /** Record money handed over against one purchase. Never overpays it. */
  const payPurchase = useCallback(
    (id: string, amount: number) => {
      if (!amount || amount <= 0) return;
      const purchase = purchases.find((p) => p.id === id);
      if (!purchase) return;
      const paid = purchase.paidUpfront + purchase.payments.reduce((s2, p) => s2 + p.amount, 0);
      const owed = Math.max(0, purchase.amount - paid);
      const take = Math.min(amount, owed);
      if (take <= 0) return;

      const payment = { id: newId("wp"), date: today, amount: take };
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, payments: [...p.payments, payment] } : p)),
      );
      api.payPurchase({ ...payment, purchaseId: id });
      setPayingId(null);
      setPayAmount("");
    },
    [purchases, today],
  );

  /** Adds an item, or corrects the price of one already listed. */
  const savePrice = useCallback(() => {
    const name = priceName.trim();
    const amount = parseFloat(priceAmount);
    if (!name || Number.isNaN(amount) || amount < 0) return;
    const existing = prices.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const item: PriceItem = {
      // Reusing the id keeps a correction an update rather than a second row.
      id: existing?.id ?? newId("pi"),
      name: existing?.name ?? name,
      price: amount,
      unit: priceUnit.trim() || null,
    };
    setPrices((prev) =>
      existing ? prev.map((p) => (p.id === item.id ? item : p)) : [...prev, item],
    );
    api.savePrice(item);
    setPriceName("");
    setPriceAmount("");
    setPriceUnit("");
  }, [prices, priceName, priceAmount, priceUnit]);

  const deletePrice = useCallback((id: string) => {
    setPrices((prev) => prev.filter((p) => p.id !== id));
    api.deletePrice(id);
  }, []);

  const goAddBill = useCallback(() => {
    setActiveTab("bills");
    setSelectedDate(today);
  }, [today]);

  const goAddExpense = useCallback(() => setActiveTab("expenses"), []);

  const goAddPurchase = useCallback(() => setActiveTab("stock"), []);

  return {
    // loading
    loading,
    loadError,
    saveError,
    dismissSaveError: () => setSaveError(null),
    refresh,

    // navigation
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    reportDate,
    setReportDate,
    /* Choosing a preset must drop the chosen day, or the toggle would appear
       to do nothing. */
    choosePeriod: (id: PeriodId) => {
      setReportDate(null);
      setPeriod(id);
    },
    billDates,

    // period / overview
    periodStats,
    periodAvgPerDay,
    periodBest,
    periodPaymentSplit,
    periodDayRows,
    periodExtremes,
    chartBars,
    categoryBreakdown,
    donutGradient,
    todayTotal,
    todayCount: todaysBills.length,
    expenseTotal,
    profit,
    todayCash,
    todayCashSales,
    todayRows,
    goAddBill,
    goAddExpense,
    goAddPurchase,

    // bills
    dayChips,
    selectedDate,
    setSelectedDate,
    selectedDay,
    isTodayView,
    viewTotal,
    viewCount: viewBills.length,
    billRows,
    paymentSplit,
    cashInDrawer,
    viewCashSales,
    viewExpensesPaid,
    formAmount,
    setFormAmount,
    formDesc,
    setFormDesc,
    formCategory,
    setFormCategory,
    formMode,
    setFormMode,
    formCustomer,
    setFormCustomer,
    formDate,
    setFormDate,
    customerStats,
    customerMatches,
    customerExact,
    creditTotal,
    pressPad,
    editingBillId,
    saveBill,
    resetBillForm,
    deleteBill,
    editBill,

    // expenses
    expenseRows,
    expenseDate,
    setExpenseDate,
    expenseDayChips,
    expenseDates,
    expenseDay,
    isExpenseToday,
    viewExpenseTotal,
    expAmount,
    setExpAmount,
    expDesc,
    setExpDesc,
    expCategory,
    setExpCategory,
    editingExpenseId,
    saveExpense,
    resetExpenseForm,
    deleteExpense,
    editExpense,

    // price list
    priceRows,
    priceSearch,
    setPriceSearch,
    priceName,
    setPriceName,
    priceAmount,
    setPriceAmount,
    priceUnit,
    setPriceUnit,
    savePrice,
    deletePrice,

    // stock purchases
    purchaseRows,
    supplierGroups,
    supplierDues,
    supplierStats,
    supplierMatches,
    supplierExact,
    totalOwed,
    purchaseSearch,
    setPurchaseSearch,
    purchaseDueOnly,
    setPurchaseDueOnly,
    ledgerRows,
    ledgerSearch,
    setLedgerSearch,
    ledgerDueOnly,
    setLedgerDueOnly,
    ledgerRange,
    chooseLedgerRange,
    ledgerFromDate,
    ledgerToDate,
    ledgerWindow,
    pickLedgerDate,
    clearLedgerDates,
    purchaseDates,

    // credit customers
    creditorGroups,
    creditorsOwed,
    creditorsBillCount,
    creditSearch,
    setCreditSearch,
    creditRange,
    chooseCreditRange,
    creditWindow,
    creditDates,
    pickCreditDate,
    clearCreditDates,
    creditOwingOnly,
    setCreditOwingOnly,
    settlingId,
    startSettling,
    settleAmount,
    setSettleAmount,
    settleCredit,
    settleAllFor,
    purchaseSupplier,
    setPurchaseSupplier,
    purchaseItem,
    setPurchaseItem,
    purchaseAmount,
    setPurchaseAmount,
    purchasePaid,
    setPurchasePaid,
    payingId,
    startPaying,
    payAmount,
    setPayAmount,
    editingPurchaseId,
    editingPaidLater,
    editSupplier,
    setEditSupplier,
    editItem,
    setEditItem,
    editAmount,
    setEditAmount,
    editPaid,
    setEditPaid,
    purchaseFormNonce,
    addPurchase,
    editPurchase,
    saveEdit,
    cancelEdit,
    repeatPurchase,
    resetPurchaseForm,
    deletePurchase,
    payPurchase,
  };
}

export type Shop = ReturnType<typeof useShop>;
