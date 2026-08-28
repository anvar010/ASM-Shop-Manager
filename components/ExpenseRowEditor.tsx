"use client";

import type { Shop } from "@/lib/useShop";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import s from "./shared.module.css";
import c from "./ExpensesTab.module.css";
import { IconPencil } from "./Icons";

/** An expense being changed, edited where it sits rather than up in the form. */
export default function ExpenseRowEditor({ shop }: { shop: Shop }) {
  const amount = parseFloat(shop.expAmount);
  const ready = !Number.isNaN(amount) && amount > 0;

  return (
    <div className={`${s.cardSm} ${c.rowEditor}`}>
      <div className={c.rowEditorHead}>
        <IconPencil size={13} color="var(--primary)" />
        Editing this expense
      </div>

      <div className={c.rowEditorGrid}>
        <div className={s.inputRow}>
          <span className="num" style={{ color: "var(--text-muted)", fontSize: 15 }}>
            ₹
          </span>
          <input
            className={`num ${s.bareInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={shop.expAmount}
            onChange={(e) => shop.setExpAmount(e.target.value)}
            aria-label="Amount"
            autoFocus
          />
        </div>
        <input
          className={s.input}
          type="text"
          placeholder="What was it for?"
          value={shop.expDesc}
          onChange={(e) => shop.setExpDesc(e.target.value)}
          aria-label="Description"
        />
      </div>

      <div className={c.rowEditorChips}>
        {EXPENSE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={s.chip}
            style={
              shop.expCategory === cat.id ? { background: cat.color, color: "#fff" } : undefined
            }
            onClick={() => shop.setExpCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className={c.rowEditorActions}>
        <button
          type="button"
          className={c.rowEditorSave}
          onClick={shop.saveExpense}
          disabled={!ready}
        >
          Save changes
        </button>
        <button type="button" className={c.rowEditorCancel} onClick={shop.resetExpenseForm}>
          Cancel
        </button>
      </div>
    </div>
  );
}
