"use client";

import type { Shop } from "@/lib/useShop";
import { formatINR } from "@/lib/format";
import s from "./shared.module.css";
import c from "./ReportsTab.module.css";

export default function ReportsTab({ shop }: { shop: Shop }) {
  const { weekReport } = shop;
  const avgPerDay = Math.round(weekReport.total / 7);

  return (
    <div>
      <div className={s.sectionLabel} style={{ marginBottom: 12 }}>
        Reports
      </div>

      <div className={c.tiles}>
        <div className={s.cardSm} style={{ padding: 14 }}>
          <div className={`num ${c.tileValue}`}>{formatINR(weekReport.total)}</div>
          <div className={c.tileLabel}>Week total</div>
        </div>
        <div className={s.cardSm} style={{ padding: 14 }}>
          <div className={`num ${c.tileValue}`}>{formatINR(avgPerDay)}</div>
          <div className={c.tileLabel}>Average per day</div>
        </div>
        <div className={s.cardSm} style={{ padding: 14 }}>
          <div className={`num ${c.tileValue}`}>{weekReport.bills}</div>
          <div className={c.tileLabel}>Bills this week</div>
        </div>
      </div>

      <div className={c.grid}>
        <section className={s.card}>
          <div className={s.rowBetween} style={{ marginBottom: 16 }}>
            <div className={s.cardTitle}>Daily earnings this week</div>
            <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>
              Best day: {shop.reportBestDay}
            </div>
          </div>
          <div className={`${s.chart} ${c.tallChart}`}>
            {shop.reportBars.map((bar) => (
              <div key={bar.key} className={s.chartCol}>
                <div className={s.chartBar} style={{ height: `${bar.heightPct}%` }} />
                <div className={s.chartLabel}>{bar.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 16 }}>
            Top categories
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {shop.categoryBreakdown.map((cat) => (
              <div key={cat.id}>
                <div className={s.rowBetween} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600 }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{cat.pct}%</div>
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
      </div>
    </div>
  );
}
