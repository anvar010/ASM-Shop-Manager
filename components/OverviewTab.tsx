"use client";

import type { Shop } from "@/lib/useShop";
import type { PeriodId } from "@/lib/types";
import { formatINR, formatShortDate } from "@/lib/format";
import s from "./shared.module.css";
import c from "./OverviewTab.module.css";
import Link from "next/link";
import { IconBill, IconBox, IconNote, IconTrend, IconUsers } from "./Icons";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export default function OverviewTab({ shop }: { shop: Shop }) {
  const { periodStats } = shop;
  const compareColor = !periodStats.has
    ? "var(--text-faint)"
    : periodStats.up
      ? "var(--success)"
      : "var(--danger)";

  return (
    <div>
      <div className={s.rowBetween} style={{ marginBottom: 12 }}>
        <div className={s.sectionLabel}>Overview</div>
        <div className={s.muted}>{formatShortDate(new Date())}</div>
      </div>

      {/* Quick actions — Overview doubles as a launcher for the entry flows. */}
      <div className={c.quickRow}>
        <button type="button" className={`${c.quickButton} ${c.quickPrimary}`} onClick={shop.goAddBill}>
          <IconBill size={20} color="#fff" />
          <span>Add Bill</span>
        </button>
        <button type="button" className={c.quickButton} onClick={shop.goAddExpense}>
          <IconNote size={20} color="var(--text-muted)" />
          <span>Add Expense</span>
        </button>
        <button type="button" className={c.quickButton} onClick={shop.goAddPurchase}>
          <IconBox size={20} color="var(--text-muted)" />
          <span>Add Purchase</span>
        </button>
        <Link href="/credits" className={`${c.quickButton} ${c.quickCredit}`}>
          <IconUsers size={20} color="var(--accent-gold)" />
          <span>Credits</span>
          {shop.creditorsOwed > 0 && (
            <span className={`num ${c.quickBadge}`}>{formatINR(shop.creditorsOwed)}</span>
          )}
        </Link>
      </div>

      <div className={c.topGrid}>
        {/* Earnings hero */}
        <section className={s.card}>
          <div className={c.heroHead}>
            <div>
              <div className={s.rowBetween} style={{ gap: 12, marginBottom: 4 }}>
                <div className={s.muted}>{periodStats.label} earnings</div>
                <Link href="/overview-report" className={s.linkButton}>
                  View all
                </Link>
              </div>
              <div className={`num ${c.heroValue}`}>{formatINR(periodStats.total)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <div className={c.compareRow} style={{ color: compareColor }}>
                  {periodStats.has && (
                    <IconTrend
                      size={13}
                      style={{ transform: periodStats.up ? "scaleY(1)" : "scaleY(-1)" }}
                    />
                  )}
                  {periodStats.compare}
                </div>
                <div className={s.muted}>{periodStats.bills} bills</div>
              </div>
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
          </div>

          <div className={s.chart}>
            {shop.chartBars.map((bar) => (
              <div key={bar.key} className={s.chartCol}>
                <div className={s.chartBar} style={{ height: `${bar.heightPct}%` }} />
                <div className={s.chartLabel}>{bar.label}</div>
              </div>
            ))}
          </div>

          <div className={c.periodStats}>
            <div>
              <div className={`num ${c.statValue}`}>{formatINR(shop.periodAvgPerDay)}</div>
              <div className={c.statLabel}>Average per day</div>
            </div>
            <div>
              <div className={`num ${c.statValue}`}>{shop.periodBest.label}</div>
              <div className={c.statLabel}>{shop.periodBest.title}</div>
            </div>
          </div>
        </section>

        {/* Profit + stat tiles */}
        <div className={c.sideStack}>
          <section className={s.card} style={{ marginBottom: 0 }}>
            <div className={s.rowBetween} style={{ marginBottom: 14 }}>
              <div className={s.cardTitle}>Profit today</div>
              <div
                className="num"
                style={{
                  fontSize: 26,
                  color: shop.profit >= 0 ? "var(--success)" : "var(--danger)",
                }}
              >
                {formatINR(shop.profit)}
              </div>
            </div>
            <div className={c.profitSplit}>
              <div className={c.profitCol}>
                <div className={c.profitRule} style={{ background: "var(--primary)" }} />
                <div className="num" style={{ fontSize: 15 }}>
                  {formatINR(shop.todayTotal)}
                </div>
                <div className={c.statLabel}>Sales in</div>
              </div>
              <div className={c.profitCol}>
                <div className={c.profitRule} style={{ background: "var(--expense-dark)" }} />
                <div className="num" style={{ fontSize: 15 }}>
                  {formatINR(shop.expenseTotal)}
                </div>
                <div className={c.statLabel}>Spent out</div>
              </div>
            </div>
          </section>

          <div className={c.statGrid}>
            <div className={`${s.cardSm} ${c.statCard}`}>
              <div className={s.iconTile} style={{ background: "var(--warning-bg)" }}>
                <IconBill size={16} color="var(--accent-gold)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={`num ${c.statValue}`}>{shop.todayCount}</div>
                <div className={c.statLabel}>Bills entered</div>
              </div>
            </div>

            <div className={`${s.cardSm} ${c.statCard}`}>
              <div className={s.iconTile} style={{ background: "var(--success-bg)" }}>
                <IconNote size={16} color="var(--success)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={`num ${c.statValue}`}>{formatINR(shop.todayCash)}</div>
                <div className={c.statLabel}>Cash in drawer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={c.grid}>
        {/* Category split */}
        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 14 }}>
            Sales by category
          </div>
          <div className={c.donutWrap}>
            <div className={c.donut} style={{ background: shop.donutGradient }}>
              <div className={c.donutHole} />
            </div>
            <div className={c.legend}>
              {shop.categoryBreakdown.map((cat) => (
                <div key={cat.id} className={s.rowBetween}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <span className={c.dot} style={{ background: cat.color }} />
                    <span className={`${s.muted} ${s.truncate}`}>{cat.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{cat.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent bills */}
        <section className={s.card}>
          <div className={s.rowBetween} style={{ marginBottom: 14 }}>
            <div className={s.cardTitle}>Recent bills</div>
            <button type="button" className={s.linkButton} onClick={() => shop.setActiveTab("bills")}>
              View all
            </button>
          </div>
          <div className={s.stack}>
            {shop.todayRows.slice(0, 4).map((b) => (
              <div key={b.id} className={s.rowBetween}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span className={c.dot} style={{ background: b.catColor }} />
                  <div style={{ minWidth: 0 }}>
                    <div className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                      {b.desc}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>
                      {b.catLabel} · {b.time}
                    </div>
                  </div>
                </div>
                <div className="num" style={{ fontSize: 14 }}>
                  {b.amountLabel}
                </div>
              </div>
            ))}
            {shop.todayRows.length === 0 && (
              <div className={s.muted}>No bills entered yet today.</div>
            )}
          </div>
        </section>

        {/* Supplier dues */}
        <section className={s.card}>
          <div className={s.rowBetween} style={{ marginBottom: 14 }}>
            <div className={s.cardTitle}>You owe suppliers</div>
            <button type="button" className={s.linkButton} onClick={shop.goAddPurchase}>
              Open ledger
            </button>
          </div>
          {shop.supplierDues.length > 0 ? (
            <div className={s.stack}>
              {shop.supplierDues.slice(0, 4).map((d) => (
                <div key={d.supplier} className={s.rowBetween}>
                  <div style={{ minWidth: 0 }}>
                    <div className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                      {d.supplier}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>
                      {d.loads} unpaid {d.loads === 1 ? "load" : "loads"}
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 14, color: "var(--warning)" }}>
                    {d.balanceLabel}
                  </div>
                </div>
              ))}
              <div className={s.rowBetween} style={{ marginTop: 4 }}>
                <div className={s.muted}>Total outstanding</div>
                <div className="num" style={{ fontSize: 15 }}>
                  {formatINR(shop.totalOwed)}
                </div>
              </div>
            </div>
          ) : (
            <div className={s.muted}>Every wholesale load is paid for.</div>
          )}
        </section>
      </div>
    </div>
  );
}
