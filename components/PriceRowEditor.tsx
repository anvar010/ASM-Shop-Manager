"use client";

import { useState } from "react";
import type { PriceItem } from "@/lib/types";
import { UNIT_GROUPS, UNITS, isUnit } from "@/lib/units";
import Select from "./Select";
import s from "./shared.module.css";
import c from "./AddPricePage.module.css";
import { IconPencil } from "./Icons";

/**
 * A listed item being corrected, edited on its own row.
 *
 * Keeps its own draft rather than filling the add form: the two are often in
 * use at once, and half-typed new item would be lost to a correction.
 */
export default function PriceRowEditor({
  item,
  categories,
  takenNames,
  onSave,
  onCancel,
}: {
  item: PriceItem & { priceLabel: string; perLabel: string };
  categories: string[];
  /** Every other item's name, so a rename cannot collide with one. */
  takenNames: string[];
  onSave: (next: PriceItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [price, setPrice] = useState(String(item.price));
  const [perQty, setPerQty] = useState(String(item.perQty ?? 1));
  const [unit, setUnit] = useState(item.unit ?? "kg");

  const amount = parseFloat(price);
  const qty = parseFloat(perQty);
  /* Two items cannot share a name: the list is keyed by it, so a clash would
     leave one of them unreachable. */
  const clash =
    name.trim() !== "" &&
    takenNames.some((n) => n.toLowerCase() === name.trim().toLowerCase());
  const ready = name.trim() !== "" && amount >= 0 && qty > 0 && !clash;

  return (
    <div className={c.rowEditor}>
      <div className={c.rowEditorHead}>
        <IconPencil size={12} color="var(--primary)" />
        Editing
      </div>

      <input
        className={s.input}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Item name"
        autoFocus
      />

      <div className={c.rowSelectWrap}>
        <Select
          label="Category"
          placeholder="No category"
          value={category}
          onChange={setCategory}
          groups={[
            {
              label: "",
              options: [
                { value: "", label: "No category" },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ],
            },
          ]}
        />
      </div>

      <div className={c.rowEditorQuote}>
        <div className={c.rowMini}>
          <span className={c.rowMiniPrefix}>₹</span>
          <input
            className={`num ${c.rowMiniInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Price"
          />
        </div>
        <span className={c.rowFor}>for</span>
        <div className={c.rowMini}>
          <input
            className={`num ${c.rowMiniInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.001"
            value={perQty}
            onChange={(e) => setPerQty(e.target.value)}
            aria-label="Amount that price covers"
          />
          <Select
            label="Unit"
            variant="inline"
            value={unit}
            onChange={setUnit}
            groups={UNIT_GROUPS.map((g) => ({
              label: g.label,
              options: g.units.map((u) => ({
                value: u,
                label: UNITS[u].short,
                hint: UNITS[u].label,
              })),
            }))}
          />
        </div>
      </div>

      {clash && (
        <div className={c.rowClash}>Another item is already called “{name.trim()}”.</div>
      )}

      <div className={c.rowEditorActions}>
        <button
          type="button"
          className={c.rowSave}
          disabled={!ready}
          onClick={() =>
            onSave({
              id: item.id,
              name: name.trim(),
              category: category.trim() || null,
              price: amount,
              perQty: qty,
              unit: isUnit(unit) ? unit : null,
            })
          }
        >
          Save
        </button>
        <button type="button" className={c.rowCancel} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
