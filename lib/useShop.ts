"use client";

import { useCallback, useMemo, useState } from "react";
import { CATEGORIES, categoryMeta, expenseMeta, modeMeta, PAYMENT_MODES } from "./constants";
import { daysBetween, formatDateKey, formatINR, formatTime } from "./format";
import { buildPeriod, PERIOD_META } from "./periods";
import {
  DAY_OPTIONS,
  dateKeyOf,
  dayBack,
  SEED_BILLS,
  SEED_EXPENSES,
  SEED_PURCHASES,
  TODAY_KEY,
} from "./seed";
import type {
  Bill,
  CategoryId,
  ExpenseCategoryId,
  PaymentModeId,
  PeriodId,
  Purchase,
  PurchaseRangeId,
  TabId,
} from "./types";

export function useShop() {
  const [activeTab, setActiveTab] = useState<TabId>("bills");
  const [period, setPeriod] = useState<PeriodId>("today");

  const [bills, setBills] = useState<Bill[]>(SEED_BILLS);
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<CategoryId>("groceries");
  const [formMode, setFormMode] = useState<PaymentModeId>("cash");
  const [formCustomer, setFormCustomer] = useState("");

  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategoryId>("supplier");

  const [purchases, setPurchases] = useState<Purchase[]>(SEED_PURCHASES);
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

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  const todaysBills = useMemo(() => bills.filter((b) => b.date === TODAY_KEY), [bills]);
  const viewBills = useMemo(
    () => bills.filter((b) => b.date === selectedDate),
    [bills, selectedDate],
  );
  const isTodayView = selectedDate === TODAY_KEY;

  const todayTotal = useMemo(() => todaysBills.reduce((s, b) => s + b.amount, 0), [todaysBills]);
  const viewTotal = useMemo(() => viewBills.reduce((s, b) => s + b.amount, 0), [viewBills]);
  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const profit = todayTotal - expenseTotal;

  const periodStats = useMemo(
    () => buildPeriod(period, bills, todaysBills),
    [period, bills, todaysBills],
  );

  const periodAvgPerDay = useMemo(
    () => Math.round(periodStats.total / PERIOD_META[period].days),
    [periodStats, period],
  );

  /* Strongest bucket of the current trend: an hour block today, a weekday
     over a week, a week over a month. */
  const periodBest = useMemo(() => {
    let best = 0;
    periodStats.trend.forEach((v, i) => {
      if (v > periodStats.trend[best]) best = i;
    });
    return {
      title: PERIOD_META[period].bestTitle,
      label: periodStats.total > 0 ? periodStats.trendLabels[best] : "—",
    };
  }, [periodStats, period]);

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

  const cashInDrawer = useMemo(
    () => viewBills.reduce((s, b) => (b.mode === "cash" ? s + b.amount : s), 0),
    [viewBills],
  );
  const todayCash = useMemo(
    () => todaysBills.reduce((s, b) => (b.mode === "cash" ? s + b.amount : s), 0),
    [todaysBills],
  );

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
      expenses.map((e) => {
        const cat = expenseMeta(e.category);
        return { ...e, catLabel: cat.label, catColor: cat.color, amountLabel: formatINR(e.amount) };
      }),
    [expenses],
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
    if (ledgerRange === "today") return { from: TODAY_KEY, to: "" };
    if (ledgerRange === "week") return { from: dateKeyOf(dayBack(6)), to: "" };
    if (ledgerRange === "month") return { from: dateKeyOf(dayBack(27)), to: "" };
    return { from: "", to: "" };
  }, [ledgerRange, ledgerFromDate, ledgerToDate]);

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
    if (creditRange === "today") return { from: TODAY_KEY, to: "" };
    if (creditRange === "week") return { from: dateKeyOf(dayBack(6)), to: "" };
    if (creditRange === "month") return { from: dateKeyOf(dayBack(27)), to: "" };
    return { from: "", to: "" };
  }, [creditRange, creditFromDate, creditToDate]);

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
        const age = g.owingSince ? daysBetween(g.owingSince, TODAY_KEY) : 0;
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
                const n = daysBetween(b.date, TODAY_KEY);
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
  }, [creditBills, creditSearch, creditWindow, creditOwingOnly]);

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

  const addBill = useCallback(() => {
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
    const bill: Bill = {
      id: `b${Date.now()}`,
      date: TODAY_KEY,
      desc: formDesc.trim() || "Sale",
      category: formCategory,
      amount: amt,
      time: formatTime(new Date()),
      mode: formMode,
      ...(formMode === "credit" ? { customer: creditCustomerName() } : {}),
    };
    setBills((prev) => [bill, ...prev]);
    setFormAmount("");
    setFormDesc("");
    setFormCustomer("");
  }, [formAmount, formDesc, formCategory, formMode, formCustomer, customerStats]);

  const deleteBill = useCallback((id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const editBill = useCallback(
    (id: string) => {
      const bill = bills.find((b) => b.id === id);
      if (!bill) return;
      setBills((prev) => prev.filter((b) => b.id !== id));
      setFormAmount(String(bill.amount));
      setFormDesc(bill.desc);
      setFormCategory(bill.category);
      setFormMode(bill.mode);
      setFormCustomer(bill.customer ?? "");
    },
    [bills],
  );

  const addExpense = useCallback(() => {
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) return;
    setExpenses((prev) => [
      {
        id: `e${Date.now()}`,
        desc: expDesc.trim() || "Expense",
        category: expCategory,
        amount: amt,
        time: formatTime(new Date()),
      },
      ...prev,
    ]);
    setExpAmount("");
    setExpDesc("");
  }, [expAmount, expDesc, expCategory]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const editExpense = useCallback(
    (id: string) => {
      const exp = expenses.find((e) => e.id === id);
      if (!exp) return;
      setExpenses((prev) => prev.filter((e) => e.id !== id));
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
    setPurchases((prev) => [
      {
        id: `w${Date.now()}`,
        date: TODAY_KEY,
        supplier: known ? known.supplier : typed,
        item: purchaseItem.trim() || "Stock",
        amount: amt,
        // Paying more than the goods are worth would read as a negative balance.
        paidUpfront: Math.min(paid, amt),
        payments: [],
      },
      ...prev,
    ]);
    resetPurchaseForm();
  }, [
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
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === editingPurchaseId
          ? {
              ...p,
              supplier: known ? known.supplier : typed,
              item: editItem.trim() || "Stock",
              amount: amt,
              // Later part-payments stand; the upfront figure absorbs the rest.
              paidUpfront: Math.max(0, Math.min(paid, amt - editingPaidLater)),
            }
          : p,
      ),
    );
    setEditingPurchaseId(null);
  }, [
    editingPurchaseId,
    editingPaidLater,
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

  /** Records money a customer paid back. Never collects more than is owed. */
  const settleCredit = useCallback((id: string, amount: number) => {
    if (!amount || amount <= 0) return;
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const log = b.creditPayments ?? [];
        const owed = Math.max(0, b.amount - log.reduce((sum, p) => sum + p.amount, 0));
        const take = Math.min(amount, owed);
        if (take <= 0) return b;
        return {
          ...b,
          creditPayments: [...log, { id: `cp${Date.now()}`, date: TODAY_KEY, amount: take }],
        };
      }),
    );
    setSettlingId(null);
    setSettleAmount("");
  }, []);

  /** Clears everything one person owes, across all their credit bills. */
  const settleAllFor = useCallback((customer: string) => {
    setBills((prev) =>
      prev.map((b) => {
        if (b.mode !== "credit" || (b.customer || "Unnamed") !== customer) return b;
        const log = b.creditPayments ?? [];
        const owed = Math.max(0, b.amount - log.reduce((sum, p) => sum + p.amount, 0));
        if (owed <= 0) return b;
        return {
          ...b,
          creditPayments: [...log, { id: `cp${Date.now()}_${b.id}`, date: TODAY_KEY, amount: owed }],
        };
      }),
    );
    setSettlingId(null);
    setSettleAmount("");
  }, []);

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
      setPurchases((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const paid = p.paidUpfront + p.payments.reduce((s2, pay) => s2 + pay.amount, 0);
          const owed = Math.max(0, p.amount - paid);
          const pay = Math.min(amount, owed);
          if (pay <= 0) return p;
          return {
            ...p,
            payments: [...p.payments, { id: `wp${Date.now()}`, date: TODAY_KEY, amount: pay }],
          };
        }),
      );
      setPayingId(null);
      setPayAmount("");
    },
    [],
  );

  const goAddBill = useCallback(() => {
    setActiveTab("bills");
    setSelectedDate(TODAY_KEY);
  }, []);

  const goAddExpense = useCallback(() => setActiveTab("expenses"), []);

  const goAddPurchase = useCallback(() => setActiveTab("stock"), []);

  return {
    // navigation
    activeTab,
    setActiveTab,
    period,
    setPeriod,

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
    customerStats,
    customerMatches,
    customerExact,
    creditTotal,
    pressPad,
    addBill,
    deleteBill,
    editBill,

    // expenses
    expenseRows,
    expAmount,
    setExpAmount,
    expDesc,
    setExpDesc,
    expCategory,
    setExpCategory,
    addExpense,
    deleteExpense,
    editExpense,

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
