"use client";

import Link from "next/link";
import { useShopContext } from "@/lib/shopContext";
import type { PeriodId } from "@/lib/types";
import { formatINR } from "@/lib/format";
import AppShell from "./AppShell";
import s from "./shared.module.css";
import c from "./OverviewReport.module.css";
import { IconTrend } from "./Icons";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

export default function OverviewReport() {
  const shop = useShopContext();
  const { periodStats } = shop;
  const compareColor = !periodStats.has
    ? "var(--text-faint)"
    : periodStats.up
      ? "var(--success)"
      : "var(--danger)";

  return (
    <AppShell title="Overview Report" back={{ href: "/", label: "Overview", tab: "overview" }}>
      <div className={s.rowBetween} style={{ marginBottom: 12 }}>
        <div className={s.sectionLabel}>{periodStats.label} report</div>
        <div className={s.muted}>{periodStats.bills} bills</div>
      </div>

      <div className={c.periodToggle} role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={shop.period === p.id}
            className={`${c.periodButton} ${shop.period === p.id ? c.periodActive : ""}`}
            onClick={() => shop.setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className={`${s.banner} ${s.bannerPrimary}`} style={{ marginBottom: 12 }}>
        <div className={s.bannerLabel}>{periodStats.label} earnings</div>
        <div className={`num ${s.bannerValue}`}>{formatINR(periodStats.total)}</div>
        <div className={c.compareRow} style={{ color: compareColor }}>
          {periodStats.has && (
            <IconTrend size={13} style={{ transform: periodStats.up ? "scaleY(1)" : "scaleY(-1)" }} />
          )}
          {periodStats.compare}
        </div>
      </section>

      {/* Headline figures for the period. */}
      <div className={c.statGrid}>
        <div className={`${s.cardSm} ${c.stat}`}>
          <div className={`num ${c.statValue}`}>{formatINR(shop.periodAvgPerDay)}</div>
          <div className={c.statLabel}>Average per day</div>
        </div>
        <div className={`${s.cardSm} ${c.stat}`}>
          <div className={`num ${c.statValue}`}>{shop.periodBest.label}</div>
          <div className={c.statLabel}>{shop.periodBest.title}</div>
        </div>
        <div className={`${s.cardSm} ${c.stat}`}>
          <div className={`num ${c.statValue}`}>{formatINR(shop.expenseTotal)}</div>
          <div className={c.statLabel}>Spent today</div>
        </div>
        <div className={`${s.cardSm} ${c.stat}`}>
          <div
            className={`num ${c.statValue}`}
            style={{ color: shop.profit >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {formatINR(shop.profit)}
          </div>
          <div className={c.statLabel}>Profit today</div>
        </div>
      </div>

      <div className={c.grid}>
        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 16 }}>
            Earnings across the {periodStats.label.toLowerCase().replace("this ", "")}
          </div>
          <div className={`${s.chart} ${c.tallChart}`}>
            {shop.chartBars.map((bar) => (
              <div key={bar.key} className={s.chartCol}>
                <div className={s.chartBar} style={{ height: `${bar.heightPct}%` }} />
                <div className={s.chartLabel}>{bar.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 16 }}>
            How customers paid
          </div>
          <div className={s.stack}>
            {shop.periodPaymentSplit.map((m) => (
              <div key={m.id}>
                <div className={s.rowBetween} style={{ marginBottom: 6 }}>
                  <div className={c.legendRow}>
                    <span className={c.dot} style={{ background: m.color }} />
                    <span className={c.legendLabel}>{m.label}</span>
                  </div>
                  <div className={c.legendValue}>
                    <span className="num">{m.amountLabel}</span>
                    <span className={c.legendPct}>{m.pct}%</span>
                  </div>
                </div>
                <div className={s.track}>
                  <div className={s.trackFill} style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 16 }}>
            Sales by category
          </div>
          <div className={s.stack}>
            {shop.categoryBreakdown.map((cat) => (
              <div key={cat.id}>
                <div className={s.rowBetween} style={{ marginBottom: 6 }}>
                  <div className={c.legendRow}>
                    <span className={c.dot} style={{ background: cat.color }} />
                    <span className={c.legendLabel}>{cat.label}</span>
                  </div>
                  <span className={c.legendPct}>{cat.pct}%</span>
                </div>
                <div className={s.track}>
                  <div
                    className={s.trackFill}
                    style={{ width: `${cat.pct}%`, background: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 14 }}>
            Money still moving
          </div>
          <div className={s.stack}>
            <Link href="/credits" className={c.owedRow}>
              <div style={{ minWidth: 0 }}>
                <div className={c.owedName}>Customers owe you</div>
                <div className={c.owedMeta}>
                  {shop.creditorsBillCount} {shop.creditorsBillCount === 1 ? "bill" : "bills"} on
                  credit
                </div>
              </div>
              <div className="num" style={{ fontSize: 15, color: "var(--accent-gold)" }}>
                {formatINR(shop.creditorsOwed)}
              </div>
            </Link>
            <Link href="/purchases" className={c.owedRow}>
              <div style={{ minWidth: 0 }}>
                <div className={c.owedName}>You owe suppliers</div>
                <div className={c.owedMeta}>
                  {shop.supplierDues.length}{" "}
                  {shop.supplierDues.length === 1 ? "supplier" : "suppliers"} waiting
                </div>
              </div>
              <div className="num" style={{ fontSize: 15, color: "var(--warning)" }}>
                {formatINR(shop.totalOwed)}
              </div>
            </Link>
          </div>
        </section>
      </div>

      {/* Day-by-day, so a bad day is traceable to a date. */}
      <section className={s.card} style={{ marginTop: 12 }}>
        <div className={s.rowBetween} style={{ marginBottom: 14 }}>
          <div className={s.cardTitle}>Day by day</div>
          {shop.periodExtremes && (
            <div className={s.muted}>
              Best {shop.periodExtremes.best.dayLabel} · {shop.periodExtremes.best.totalLabel}
            </div>
          )}
        </div>
        {shop.periodDayRows.length > 0 ? (
          <div className={c.dayList}>
            {shop.periodDayRows.map((d) => (
              <div key={d.date} className={c.dayRow}>
                <div style={{ minWidth: 0 }}>
                  <div className={c.dayName}>{d.dayLabel}</div>
                  <div className={c.dayMeta}>
                    {d.bills} {d.bills === 1 ? "bill" : "bills"}
                  </div>
                </div>
                <div className={`num ${c.dayTotal}`}>{d.totalLabel}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.muted}>No sales in this period yet.</div>
        )}
      </section>
    </AppShell>
  );
}
