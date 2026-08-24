"use client";

import type { Shop } from "@/lib/useShop";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import s from "./shared.module.css";
import c from "./ExpensesTab.module.css";
import { IconNote, IconPencil, IconPlus, IconTrash } from "./Icons";

export default function ExpensesTab({ shop }: { shop: Shop }) {
  return (
    <div className={c.layout}>
      <div className={c.col} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <section className={`${s.banner} ${s.bannerDark}`}>
          <div className={s.bannerLabel}>Total spent today</div>
          <div className={`num ${s.bannerValue}`}>{formatINR(shop.expenseTotal)}</div>
          <div className={s.bannerLabel}>
            {shop.expenseRows.length} {shop.expenseRows.length === 1 ? "entry" : "entries"} today
          </div>
          <div className={s.bannerRule} />
          <div className={s.rowBetween}>
            <div className={s.bannerLabel}>Profit today</div>
            <div
              className="num"
              style={{
                fontSize: 22,
                color: shop.profit >= 0 ? "var(--success)" : "var(--danger)",
              }}
            >
              {formatINR(shop.profit)}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginTop: 4 }}>
            {formatINR(shop.todayTotal)} sales − {formatINR(shop.expenseTotal)} spent
          </div>
        </section>

        <section className={s.card}>
          <div className={s.cardTitle} style={{ marginBottom: 12 }}>
            Add an expense
          </div>
          <div className={s.inputRow} style={{ marginBottom: 10 }}>
            <span className="num" style={{ color: "var(--text-muted)", fontSize: 16 }}>
              ₹
            </span>
            <input
              className={`num ${s.bareInput}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={shop.expAmount}
              onChange={(e) => shop.setExpAmount(e.target.value)}
              aria-label="Expense amount"
            />
          </div>
          <input
            className={s.input}
            type="text"
            placeholder="What was it for? (optional)"
            value={shop.expDesc}
            onChange={(e) => shop.setExpDesc(e.target.value)}
            style={{ marginBottom: 12 }}
            aria-label="Expense description"
          />
          <div className={`${s.chipRow} scrollX`} style={{ marginBottom: 14 }}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = shop.expCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={s.chip}
                  style={active ? { background: cat.color, color: "#fff" } : undefined}
                  onClick={() => shop.setExpCategory(cat.id)}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <button type="button" className={s.darkButton} onClick={shop.addExpense}>
            <IconPlus size={16} color="#fff" />
            Add Expense
          </button>
        </section>
      </div>

      <section className={s.card}>
        <div className={s.rowBetween} style={{ marginBottom: 14 }}>
          <div className={s.cardTitle}>Today&apos;s spending</div>
          <div className={s.muted}>
            {shop.expenseRows.length} {shop.expenseRows.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        {shop.expenseRows.length > 0 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shop.expenseRows.map((e) => (
                <div key={e.id} className={`${s.cardSm} ${c.expenseRow}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: e.catColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                        {e.desc}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 1 }}>
                        {e.catLabel} · {e.time}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                    <div className="num" style={{ fontSize: 14, paddingRight: 6 }}>
                      −{e.amountLabel}
                    </div>
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => shop.editExpense(e.id)}
                      aria-label={`Edit ${e.desc}`}
                    >
                      <span className={s.rowActionInner}>
                        <IconPencil size={13} color="var(--text-muted)" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => shop.deleteExpense(e.id)}
                      aria-label={`Delete ${e.desc}`}
                    >
                      <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                        <IconTrash size={13} color="var(--danger)" />
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={c.totalRow} style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>
                Total spent
              </div>
              <div className="num" style={{ fontSize: 24, color: "var(--expense-dark)" }}>
                {formatINR(shop.expenseTotal)}
              </div>
            </div>
          </>
        ) : (
          <div className={s.empty}>
            <IconNote size={36} color="var(--text-faint)" />
            <div className={s.emptyTitle}>Nothing spent yet today</div>
            <div style={{ fontSize: 12 }}>Record supplier payments, rent and wages here.</div>
          </div>
        )}
      </section>
    </div>
  );
}
