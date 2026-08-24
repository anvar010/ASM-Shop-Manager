"use client";

import type { Shop } from "@/lib/useShop";
import { CATEGORIES, UNITS } from "@/lib/constants";
import s from "./shared.module.css";
import c from "./StockTab.module.css";
import { IconAlert, IconBox, IconMinus, IconPlus, IconSearch } from "./Icons";

export default function StockTab({ shop }: { shop: Shop }) {
  return (
    <div>
      <div className={s.rowBetween} style={{ marginBottom: 10 }}>
        <div className={s.sectionLabel}>Stock Count</div>
        <div className={s.muted}>
          {shop.stockRows.length} {shop.stockRows.length === 1 ? "product" : "products"}
        </div>
      </div>

      <div className={c.controls}>
        <div className={c.searchRow}>
          <IconSearch size={16} color="var(--text-faint)" />
          <input
            className={c.searchInput}
            type="text"
            placeholder="Search products"
            value={shop.stockSearch}
            onChange={(e) => shop.setStockSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>

        <button
          type="button"
          className={`${c.filterChip} ${shop.stockLowOnly ? c.filterActive : ""}`}
          onClick={() => shop.setStockLowOnly(!shop.stockLowOnly)}
          aria-pressed={shop.stockLowOnly}
        >
          <IconAlert size={13} color={shop.stockLowOnly ? "#fff" : "var(--text-muted)"} />
          Low stock only
        </button>

        <button
          type="button"
          className={c.addButton}
          onClick={() => shop.setShowStockForm(!shop.showStockForm)}
          aria-expanded={shop.showStockForm}
        >
          <IconPlus
            size={15}
            color="#fff"
            style={{ transform: `rotate(${shop.showStockForm ? 45 : 0}deg)` }}
          />
          Add product
        </button>
      </div>

      {shop.showStockForm && (
        <section className={s.card} style={{ marginBottom: 14 }}>
          <div className={s.cardTitle} style={{ marginBottom: 12 }}>
            New product
          </div>

          <div className={c.formGrid} style={{ marginBottom: 12 }}>
            <div>
              <div className={s.fieldLabel}>Product name</div>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Sunflower Oil 1L"
                value={shop.stockName}
                onChange={(e) => shop.setStockName(e.target.value)}
                aria-label="Product name"
              />
            </div>
            <div>
              <div className={s.fieldLabel}>Opening count</div>
              <input
                className={`num ${s.input}`}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={shop.stockQty}
                onChange={(e) => shop.setStockQty(e.target.value)}
                aria-label="Opening count"
              />
            </div>
            <div>
              <div className={s.fieldLabel}>Alert below</div>
              <input
                className={`num ${s.input}`}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="5"
                value={shop.stockThreshold}
                onChange={(e) => shop.setStockThreshold(e.target.value)}
                aria-label="Low stock threshold"
              />
            </div>
          </div>

          <div className={s.fieldLabel}>Category</div>
          <div className={s.chipWrap} style={{ marginBottom: 12 }}>
            {CATEGORIES.map((cat) => {
              const active = shop.stockCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={s.chip}
                  style={active ? { background: cat.color, color: "#fff" } : undefined}
                  onClick={() => shop.setStockCategory(cat.id)}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className={s.fieldLabel}>Unit</div>
          <div className={s.chipWrap} style={{ marginBottom: 14 }}>
            {UNITS.map((u) => {
              const active = shop.stockUnit === u;
              return (
                <button
                  key={u}
                  type="button"
                  className={s.chip}
                  style={active ? { background: "var(--primary)", color: "#fff" } : undefined}
                  onClick={() => shop.setStockUnit(u)}
                >
                  {u}
                </button>
              );
            })}
          </div>

          <button type="button" className={s.primaryButton} onClick={shop.addProduct}>
            <IconPlus size={16} color="#fff" />
            Add Product
          </button>
        </section>
      )}

      {shop.stockRows.length > 0 ? (
        <div className={c.grid}>
          {shop.stockRows.map((p) => (
            <div key={p.id} className={`${s.cardSm} ${c.productCard}`}>
              <div className={c.productTop}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: p.catColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                        {p.name}
                      </span>
                      {p.showBadge && (
                        <span
                          className={s.badge}
                          style={{ background: p.badgeBg, color: p.badgeFg }}
                        >
                          {p.badgeShort}
                        </span>
                      )}
                    </div>
                    <div
                      className={s.truncate}
                      style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}
                    >
                      {p.catLabel} · {p.updated}
                    </div>
                  </div>
                </div>

                <div className={c.stepper}>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => shop.stepStock(p.id, -1)}
                    aria-label={`Reduce ${p.name}`}
                  >
                    <span className={s.rowActionInner}>
                      <IconMinus size={13} color="var(--text-muted)" />
                    </span>
                  </button>
                  <div className={c.qty}>
                    <div className={`num ${c.qtyValue}`}>{p.qty}</div>
                    <div className={c.qtyUnit}>{p.unit}</div>
                  </div>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => shop.stepStock(p.id, 1)}
                    aria-label={`Increase ${p.name}`}
                  >
                    <span className={s.rowActionInner}>
                      <IconPlus size={13} color="var(--text-muted)" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <IconBox size={36} color="var(--text-faint)" />
          <div className={s.emptyTitle}>No products match</div>
        </div>
      )}
    </div>
  );
}
