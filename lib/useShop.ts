"use client";

import { useCallback, useMemo, useState } from "react";
import { CATEGORIES, categoryMeta, expenseMeta, modeMeta, PAYMENT_MODES } from "./constants";
import { formatINR, formatTime } from "./format";
import { buildPeriod } from "./periods";
import { DAY_OPTIONS, SEED_BILLS, SEED_EXPENSES, SEED_PRODUCTS, TODAY_KEY } from "./seed";
import type {
  Bill,
  CategoryId,
  ExpenseCategoryId,
  PaymentModeId,
  PeriodId,
  Product,
  TabId,
} from "./types";

export function useShop() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [period, setPeriod] = useState<PeriodId>("today");

  const [bills, setBills] = useState<Bill[]>(SEED_BILLS);
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<CategoryId>("groceries");
  const [formMode, setFormMode] = useState<PaymentModeId>("cash");

  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCategory, setExpCategory] = useState<ExpenseCategoryId>("supplier");

  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [stockSearch, setStockSearch] = useState("");
  const [stockLowOnly, setStockLowOnly] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockName, setStockName] = useState("");
  const [stockCategory, setStockCategory] = useState<CategoryId>("groceries");
  const [stockQty, setStockQty] = useState("");
  const [stockThreshold, setStockThreshold] = useState("");
  const [stockUnit, setStockUnit] = useState("pkts");

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

  const stockRows = useMemo(
    () =>
      products
        .filter((p) => p.name.toLowerCase().includes(stockSearch.toLowerCase()))
        .filter((p) => !stockLowOnly || p.qty <= p.threshold)
        .map((p) => {
          const cat = categoryMeta(p.category);
          const isOut = p.qty === 0;
          const isLow = !isOut && p.qty <= p.threshold;
          return {
            ...p,
            catLabel: cat.label,
            catColor: cat.color,
            showBadge: isOut || isLow,
            badgeLabel: isOut ? "Out of stock" : "Low stock",
            badgeShort: isOut ? "Out" : "Low",
            badgeBg: isOut ? "var(--danger-bg)" : "var(--warning-bg)",
            badgeFg: isOut ? "var(--danger)" : "var(--warning)",
          };
        }),
    [products, stockSearch, stockLowOnly],
  );

  const lowStockItems = useMemo(
    () => products.filter((p) => p.qty <= p.threshold).sort((a, b) => a.qty - b.qty),
    [products],
  );

  const lowStockList = useMemo(
    () =>
      lowStockItems.slice(0, 4).map((p) => {
        const isOut = p.qty === 0;
        return {
          ...p,
          badgeLabel: isOut ? "Out" : "Low",
          badgeBg: isOut ? "var(--danger-bg)" : "var(--warning-bg)",
          badgeFg: isOut ? "var(--danger)" : "var(--warning)",
        };
      }),
    [lowStockItems],
  );

  const weekReport = useMemo(() => buildPeriod("week", bills, todaysBills), [bills, todaysBills]);

  const reportBars = useMemo(() => {
    const max = Math.max(...weekReport.trend, 1);
    return weekReport.trend.map((v, i) => ({
      key: `report-${i}`,
      heightPct: Math.round((v / max) * 100),
      label: weekReport.trendLabels[i],
    }));
  }, [weekReport]);

  const reportBestDay = useMemo(() => {
    let best = 0;
    weekReport.trend.forEach((v, i) => {
      if (v > weekReport.trend[best]) best = i;
    });
    return weekReport.trendLabels[best];
  }, [weekReport]);

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
    };
    setBills((prev) => [bill, ...prev]);
    setFormAmount("");
    setFormDesc("");
  }, [formAmount, formDesc, formCategory, formMode]);

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

  const stepStock = useCallback((id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p)),
    );
  }, []);

  const addProduct = useCallback(() => {
    const name = stockName.trim();
    if (!name) return;
    const qty = parseInt(stockQty, 10);
    const threshold = parseInt(stockThreshold, 10);
    setProducts((prev) => [
      {
        id: `p${Date.now()}`,
        name,
        category: stockCategory,
        unit: stockUnit,
        qty: Number.isNaN(qty) ? 0 : Math.max(0, qty),
        threshold: Number.isNaN(threshold) ? 5 : Math.max(0, threshold),
        updated: "Just now",
      },
      ...prev,
    ]);
    setStockName("");
    setStockQty("");
    setStockThreshold("");
  }, [stockName, stockQty, stockThreshold, stockCategory, stockUnit]);

  const goAddBill = useCallback(() => {
    setActiveTab("bills");
    setSelectedDate(TODAY_KEY);
  }, []);

  const goAddExpense = useCallback(() => setActiveTab("expenses"), []);

  const goCountStock = useCallback(() => setActiveTab("stock"), []);

  return {
    // navigation
    activeTab,
    setActiveTab,
    period,
    setPeriod,

    // period / home
    periodStats,
    chartBars,
    categoryBreakdown,
    donutGradient,
    todayTotal,
    todayCount: todaysBills.length,
    expenseTotal,
    profit,
    todayCash,
    todayRows,
    lowStockList,
    lowStockMore: Math.max(0, lowStockItems.length - 4),
    goAddBill,
    goAddExpense,
    goCountStock,

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

    // stock
    stockRows,
    stockSearch,
    setStockSearch,
    stockLowOnly,
    setStockLowOnly,
    showStockForm,
    setShowStockForm,
    stockName,
    setStockName,
    stockCategory,
    setStockCategory,
    stockQty,
    setStockQty,
    stockThreshold,
    setStockThreshold,
    stockUnit,
    setStockUnit,
    addProduct,
    stepStock,

    // reports
    weekReport,
    reportBars,
    reportBestDay,
  };
}

export type Shop = ReturnType<typeof useShop>;
