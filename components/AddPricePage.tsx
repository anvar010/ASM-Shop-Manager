"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShopContext } from "@/lib/shopContext";
import { PRICE_UNITS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import AppShell from "./AppShell";
import s from "./shared.module.css";
import c from "./AddPricePage.module.css";
import { IconPlus } from "./Icons";

export default function AddPricePage() {
  const shop = useShopContext();
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const amount = parseFloat(shop.priceAmount);
  const ready = shop.priceName.trim() !== "" && !Number.isNaN(amount) && amount >= 0;

  /* Saving an item whose name already exists corrects its price, so the same
     screen serves adding and fixing without a separate edit flow. */
  const existing = shop.priceRows.find(
    (p) => p.name.toLowerCase() === shop.priceName.trim().toLowerCase(),
  );

  function save(andAnother: boolean) {
    if (!shop.savePrice()) return;
    if (andAnother) {
      setNewCategory("");
      setAddingCategory(false);
      return;
    }
    router.push("/");
  }

  function useCategory(name: string) {
    shop.setPriceCategory(name);
    setAddingCategory(false);
  }

  return (
    <AppShell title="Add an Item" back={{ href: "/", label: "Calculator", tab: "calculator" }}>
      <div className={c.wrap}>
        <section className={s.card}>
          <div className={s.fieldLabel}>Item name</div>
          <input
            className={s.input}
            type="text"
            placeholder="e.g. Basmati Rice 5kg"
            value={shop.priceName}
            onChange={(e) => shop.setPriceName(e.target.value)}
            style={{ marginBottom: 6 }}
            autoComplete="off"
            autoFocus={false}
          />
          {existing && (
            <div className={c.note}>
              Already listed at {existing.priceLabel}
              {existing.unit ? ` per ${existing.unit}` : ""} — saving will change that price.
            </div>
          )}

          <div className={s.fieldLabel} style={{ marginTop: 16 }}>
            Category
          </div>
          <div className={s.chipWrap}>
            {shop.priceCategories.map((cat) => {
              const active = shop.priceCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${s.chip} ${active ? c.chipActive : ""}`}
                  onClick={() => useCategory(cat)}
                >
                  {cat}
                </button>
              );
            })}
            <button
              type="button"
              className={`${s.chip} ${c.chipAdd}`}
              onClick={() => setAddingCategory(!addingCategory)}
            >
              <IconPlus size={12} color="currentColor" />
              New
            </button>
          </div>

          {addingCategory && (
            <div className={c.newCategory}>
              <input
                className={s.input}
                type="text"
                placeholder="Category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                aria-label="New category name"
              />
              <button
                type="button"
                className={c.useButton}
                onClick={() => newCategory.trim() && useCategory(newCategory.trim())}
              >
                Use
              </button>
            </div>
          )}

          <div className={s.fieldLabel} style={{ marginTop: 16 }}>
            Price
          </div>
          <div className={c.priceRow}>
            <div className={s.inputRow}>
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
                value={shop.priceAmount}
                onChange={(e) => shop.setPriceAmount(e.target.value)}
                aria-label="Price"
              />
            </div>
          </div>

          <div className={s.fieldLabel} style={{ marginTop: 14 }}>
            Price is per
          </div>
          <div className={s.chipWrap}>
            {PRICE_UNITS.map((u) => {
              const active = shop.priceUnit === u;
              return (
                <button
                  key={u}
                  type="button"
                  className={`${s.chip} ${active ? c.chipActive : ""}`}
                  onClick={() => shop.setPriceUnit(u)}
                >
                  {u}
                </button>
              );
            })}
          </div>

          {ready && (
            <div className={c.preview}>
              <strong>{shop.priceName.trim()}</strong>
              {shop.priceCategory ? ` · ${shop.priceCategory}` : ""} — {formatINR(amount)} per{" "}
              {shop.priceUnit || "unit"}
            </div>
          )}

          <button
            type="button"
            className={s.primaryButton}
            onClick={() => save(false)}
            disabled={!ready}
            style={{ marginTop: 16 }}
          >
            <IconPlus size={16} color="#fff" />
            {existing ? "Update Price" : "Save Item"}
          </button>
          {/* A shop enters a run of prices at once, so staying put is the
              common case rather than returning after each one. */}
          <button
            type="button"
            className={c.againButton}
            onClick={() => save(true)}
            disabled={!ready}
          >
            Save and add another
          </button>
        </section>
      </div>
    </AppShell>
  );
}
