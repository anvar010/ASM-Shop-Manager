"use client";

import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import s from "./shared.module.css";
import c from "./ExpensesTab.module.css";
import CalendarFilter from "./CalendarFilter";
import { IconCalendar, IconNote, IconPencil, IconPlus, IconTrash } from "./Icons";

export default function ExpensesTab({ shop }: { shop: Shop }) {
  const editing = shop.editingExpenseId !== null;
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!calOpen) return;
    function onDown(e: MouseEvent) {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [calOpen]);

  return (
    <div>
      {/* The last week at a glance, each day carrying its own spend, with the
          calendar for anything older. */}
      <div className={c.dayBar}>
        <div className={`${c.dayStrip} scrollX`}>
          {shop.expenseDayChips.map((d) => (
            <button
              key={d.key}
              type="button"
              className={`${c.dayChip} ${d.active ? c.dayChipActive : ""}`}
              onClick={() => shop.setExpenseDate(d.key)}
              aria-pressed={d.active}
            >
              <div className={c.dayShort}>{d.short}</div>
              <div className={c.daySub}>{d.sub}</div>
              <div className={`num ${c.dayTotal}`}>{d.totalLabel}</div>
            </button>
          ))}
        </div>

        <div className={c.calWrap} ref={calRef}>
          <button
            type="button"
            className={`${c.calChip} ${
              shop.expenseDayChips.every((d) => !d.active) ? c.calChipActive : ""
            }`}
            onClick={() => setCalOpen(!calOpen)}
            aria-expanded={calOpen}
          >
            <IconCalendar size={14} color="currentColor" />
            {shop.expenseDayChips.every((d) => !d.active) ? shop.expenseDay.sub : "Older"}
          </button>
          {calOpen && (
            <CalendarFilter
              window={{ from: shop.expenseDate, to: shop.expenseDate }}
              custom
              marked={shop.expenseDates}
              onPick={(key) => shop.setExpenseDate(key)}
              onClear={() => shop.setExpenseDate(shop.expenseDayChips[0].key)}
              onDone={() => setCalOpen(false)}
            />
          )}
        </div>
      </div>

      {!shop.isExpenseToday && (
        <div className={c.pastBar}>
          <div className={`${c.pastText} ${s.truncate}`}>
            Viewing {shop.expenseDay.short}, {shop.expenseDay.sub} — new entries still go to today
          </div>
          <button
            type="button"
            className={`${s.linkButton} tap`}
            onClick={() => shop.setExpenseDate(shop.expenseDayChips[0].key)}
          >
            Back to today
          </button>
        </div>
      )}

    <div className={c.layout}>
      <div className={c.col} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <section className={`${s.banner} ${s.bannerDark}`}>
          <div className={s.bannerLabel}>
            {shop.isExpenseToday ? "Total spent today" : `Spent ${shop.expenseDay.long}`}
          </div>
          <div className={`num ${s.bannerValue}`}>{formatINR(shop.viewExpenseTotal)}</div>
          <div className={s.bannerLabel}>
            {shop.expenseRows.length} {shop.expenseRows.length === 1 ? "entry" : "entries"}
            {shop.isExpenseToday ? " today" : ""}
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
          <button type="button" className={s.darkButton} onClick={shop.saveExpense}>
            {editing ? <IconPencil size={14} color="#fff" /> : <IconPlus size={16} color="#fff" />}
            {editing ? "Save Changes" : "Add Expense"}
          </button>
          {editing && (
            <button type="button" className={c.formCancel} onClick={shop.resetExpenseForm}>
              Cancel edit
            </button>
          )}
        </section>
      </div>

      <section className={s.card}>
        <div className={s.rowBetween} style={{ marginBottom: 14 }}>
          <div className={s.cardTitle}>
            {shop.isExpenseToday ? "Today's spending" : `Spending on ${shop.expenseDay.sub}`}
          </div>
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
      </div>
  );
}
