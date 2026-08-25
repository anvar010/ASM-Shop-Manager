"use client";

import { useCallback, useMemo, useState } from "react";
import { CATEGORIES, categoryMeta, expenseMeta, modeMeta, PAYMENT_MODES } from "./constants";
import { formatDateKey, formatINR, formatTime } from "./format";
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
    const bill: Bill = {
      id: `b${Date.now()}`,
      date: TODAY_KEY,
      desc: formDesc.trim() || "Sale",
      category: formCategory,
      amount: amt,
      time: formatTime(new Date()),
      mode: formMode,
      ...(formMode === "credit"
        ? { customer: formCustomer.trim() || "Unnamed" }
        : {}),
    };
    setBills((prev) => [bill, ...prev]);
    setFormAmount("");
    setFormDesc("");
    setFormCustomer("");
  }, [formAmount, formDesc, formCategory, formMode, formCustomer]);

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
