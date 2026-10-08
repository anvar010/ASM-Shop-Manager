"use client";

import { useEffect, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatINR, groupIN } from "@/lib/format";
import { UNITS, costOf, isCount, isUnit, unitsLike, type UnitId } from "@/lib/units";
import s from "./shared.module.css";
import c from "./ItemPicker.module.css";
import { IconMinus, IconPlus, IconSearch } from "./Icons";

type PriceRow = Shop["priceRows"][number];

/**
 * The price list as a pop-up over the bill form. Choosing an item and how
 * much of it adds that cost to the amount already keyed in, so 100 on the
 * keypad plus a ₹40 item reads ₹140.
 */
export default function ItemPicker({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<UnitId | null>(null);
  const [wholesale, setWholesale] = useState(false);
  const [addedNote, setAddedNote] = useState("");

  const hasWholesale = shop.priceRows.some((p) => p.wholesalePrice != null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = search.trim().toLowerCase();
  const rows = shop.priceRows.filter(
    (p) =>
      q === "" ||
      p.name.toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q),
  );

  /* Under their shelf headings, the way the price list keeps them. */
  const groups = (() => {
    const byCat = new Map<string, PriceRow[]>();
    rows.forEach((p) => {
      const key = p.category?.trim() || "Other items";
      byCat.set(key, [...(byCat.get(key) ?? []), p]);
    });
    return [...byCat.entries()]
      .sort((a, b) => (a[0] === "Other items" ? 1 : b[0] === "Other items" ? -1 : a[0].localeCompare(b[0])))
      .map(([category, items]) => ({ category, items }));
  })();

  /* The price that applies: wholesale where it was set, else the retail one. */
  function unitPrice(p: PriceRow) {
    return wholesale && p.wholesalePrice != null ? p.wholesalePrice : p.price;
  }

  function open(p: PriceRow) {
    if (openId === p.id) {
      setOpenId(null);
      return;
    }
    setOpenId(p.id);
    setQty(String(p.perQty ?? 1));
    setUnit(isUnit(p.unit) ? p.unit : null);
  }

  function totalFor(p: PriceRow) {
    const n = parseFloat(qty) || 0;
    return unit ? costOf(n, unit, unitPrice(p), p.perQty ?? 1, p.unit) : Number((n * unitPrice(p)).toFixed(2));
  }

  return (
    <div className={c.backdrop} onClick={onClose} role="presentation">
      <div
        className={c.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Add items"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={c.head}>
          <div className={c.title}>Add items</div>
        </div>

        {/* What has been keyed in and added so far, so the sum is in view
            while items are chosen. */}
        <div className={c.sum}>
          <div className={c.sumLabel}>Added so far</div>
          <div className={`num ${c.sumValue}`}>{formatINR(parseFloat(shop.formAmount) || 0)}</div>
          {shop.padParts.length > 0 && (
            <div className={`num ${c.sumTape}`}>
              {shop.padParts
                .map((n, k) => (k === 0 ? groupIN(n) : `${n < 0 ? "−" : "+"} ${groupIN(Math.abs(n))}`))
                .join(" ")}
            </div>
          )}
        </div>

        <div className={c.searchWrap}>
          <IconSearch size={15} color="var(--text-faint)" />
          <input
            className={c.search}
            type="text"
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search items"
          />
        </div>

        {hasWholesale && (
          <div className={c.modeSwitch}>
            {[false, true].map((w) => (
              <button
                key={String(w)}
                type="button"
                className={`${c.modeButton} ${wholesale === w ? c.modeOn : ""}`}
                onClick={() => setWholesale(w)}
              >
                {w ? "Wholesale" : "Retail"}
              </button>
            ))}
          </div>
        )}

        <div className={c.list}>
          {rows.length === 0 && (
            <div className={`${s.muted} ${c.empty}`}>
              {shop.priceRows.length === 0 ? "No items listed yet." : "Nothing matches that."}
            </div>
          )}
          {groups.map((g) => (
            <section key={g.category} className={c.group}>
              <div className={c.groupHead}>
                {g.category}
                <span className={c.groupCount}>{g.items.length}</span>
              </div>
              <div className={c.grid}>
          {g.items.map((p) => {
            const isOpen = openId === p.id;
            const price = unitPrice(p);
            const options = unitsLike(p.unit);
            return (
              <div key={p.id} className={`${c.item} ${isOpen ? c.itemOpen : ""}`}>
                <button type="button" className={c.itemHead} onClick={() => open(p)}>
                  <span className={`${s.truncate} ${c.itemName}`}>{p.name}</span>
                  <span className={`num ${c.itemPrice}`}>
                    {formatINR(price)}
                    <span className={c.itemPer}> / {p.perLabel}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className={c.qtyPanel}>
                    <input
                      className={`num ${c.qtyInput}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={isCount(unit) ? "1" : "0.01"}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      aria-label="Quantity"
                      autoFocus
                    />
                    <div className={c.units}>
                      {options.length > 0 ? (
                        options.map((u) => (
                          <button
                            key={u}
                            type="button"
                            className={`${c.unitChip} ${unit === u ? c.unitOn : ""}`}
                            onClick={() => setUnit(u)}
                          >
                            {UNITS[u].short}
                          </button>
                        ))
                      ) : (
                        <span className={c.unitPlain}>{p.unit ?? ""}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={c.takeButton}
                      disabled={!(totalFor(p) > 0)}
                      onClick={() => {
                        shop.addToAmount(-totalFor(p));
                        setAddedNote(`${p.name} · ${formatINR(totalFor(p))} taken off`);
                        setOpenId(null);
                      }}
                    >
                      <IconMinus size={14} color="currentColor" />
                      Take off
                    </button>
                    <button
                      type="button"
                      className={c.addButton}
                      disabled={!(totalFor(p) > 0)}
                      onClick={() => {
                        shop.addToAmount(totalFor(p));
                        setAddedNote(`${p.name} · ${formatINR(totalFor(p))} added`);
                        setOpenId(null);
                      }}
                    >
                      <IconPlus size={14} color="currentColor" />
                      Add {formatINR(totalFor(p))}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </section>
          ))}
        </div>

        <div className={c.foot}>
          <div className={c.note}>{addedNote}</div>
          <button type="button" className={c.done} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
