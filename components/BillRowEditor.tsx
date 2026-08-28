"use client";

import type { Shop } from "@/lib/useShop";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import s from "./shared.module.css";
import c from "./BillsTab.module.css";
import { IconPencil } from "./Icons";

/**
 * A bill being changed, edited where it sits.
 *
 * The form at the top of the tab is only ever for adding now: sending someone
 * up there to change a row they are looking at loses their place in a list
 * that can run to hundreds of entries.
 */
export default function BillRowEditor({ shop }: { shop: Shop }) {
  const amount = parseFloat(shop.formAmount);
  const ready = !Number.isNaN(amount) && amount > 0;

  return (
    <div className={`${s.cardSm} ${c.rowEditor}`}>
      <div className={c.rowEditorHead}>
        <IconPencil size={13} color="var(--primary)" />
        Editing this bill
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
            value={shop.formAmount}
            onChange={(e) => shop.setFormAmount(e.target.value)}
            aria-label="Amount"
            autoFocus
          />
        </div>
        <input
          className={s.input}
          type="text"
          placeholder="What was sold?"
          value={shop.formDesc}
          onChange={(e) => shop.setFormDesc(e.target.value)}
          aria-label="Description"
        />
      </div>

      <div className={c.rowEditorChips}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={s.chip}
            style={
              shop.formCategory === cat.id ? { background: cat.color, color: "#fff" } : undefined
            }
            onClick={() => shop.setFormCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className={c.rowEditorChips}>
        {PAYMENT_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={s.chip}
            style={shop.formMode === m.id ? { background: m.color, color: "#fff" } : undefined}
            onClick={() => shop.setFormMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {shop.formMode === "credit" && (
        <div className={c.rowEditorGrid}>
          <input
            className={s.input}
            type="text"
            placeholder="Who is taking it on credit?"
            value={shop.formCustomer}
            onChange={(e) => shop.setFormCustomer(e.target.value)}
            aria-label="Customer name"
            autoComplete="off"
          />
          <input
            className={s.input}
            type="date"
            value={shop.formDate}
            max={shop.dayChips[0].key}
            onChange={(e) => shop.setFormDate(e.target.value || shop.dayChips[0].key)}
            aria-label="Date the credit was taken"
          />
        </div>
      )}

      <div className={c.rowEditorActions}>
        <button
          type="button"
          className={c.rowEditorSave}
          onClick={shop.saveBill}
          disabled={!ready}
        >
          Save changes
        </button>
        <button type="button" className={c.rowEditorCancel} onClick={shop.resetBillForm}>
          Cancel
        </button>
      </div>
    </div>
  );
}
