"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatINR } from "@/lib/format";
import LoadCard from "./LoadCard";
import s from "./shared.module.css";
import c from "./StockTab.module.css";
import { IconAlert, IconBox, IconChevron, IconPlus, IconSearch } from "./Icons";

function EmptyHistory({ shop }: { shop: Shop }) {
  const filtered = shop.purchaseDueOnly || shop.purchaseSearch.trim() !== "";
  return (
    <div className={s.empty}>
      <IconBox size={36} color="var(--text-faint)" />
      <div className={s.emptyTitle}>{filtered ? "Nothing matches" : "No purchases yet"}</div>
      <div style={{ fontSize: 12 }}>
        {filtered
          ? "Clear the search or the unpaid filter to see every shop."
          : "Record what you buy from the wholesaler to track what you owe."}
      </div>
    </div>
  );
}

export default function StockTab({ shop }: { shop: Shop }) {
  const formRef = useRef<HTMLElement | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [openShops, setOpenShops] = useState<string[]>([]);

  function toggleShop(supplier: string) {
    setOpenShops((prev) =>
      prev.includes(supplier) ? prev.filter((x) => x !== supplier) : [...prev, supplier],
    );
  }

  /* Searching or filtering is asking to see the matching loads, so those
     results open regardless of which shops were expanded by hand. */
  const forceOpen = shop.purchaseSearch.trim() !== "" || shop.purchaseDueOnly;

  /* Edit and Buy-again are pressed down in the history, while the form sits
     above it on a phone. Bring the form to the user rather than the reverse. */
  useEffect(() => {
    if (shop.purchaseFormNonce === 0) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [shop.purchaseFormNonce]);

  return (
    <div>
      <div className={s.rowBetween} style={{ marginBottom: 10 }}>
        <div className={s.sectionLabel}>Stock Purchases</div>
        <div className={s.muted}>
          {shop.purchaseRows.length} {shop.purchaseRows.length === 1 ? "load" : "loads"}
        </div>
      </div>

      <div className={c.layout}>
        <div className={c.leftCol}>
          {/* What is still owed, across every wholesaler. */}
          <section className={`${s.banner} ${s.bannerDark}`}>
            <div className={s.bannerLabel}>Still to pay suppliers</div>
            <div className={`num ${s.bannerValue}`}>{formatINR(shop.totalOwed)}</div>
            <div className={s.bannerLabel}>
              {shop.supplierDues.length === 0
                ? "Everything is settled"
                : `${shop.supplierDues.length} ${
                    shop.supplierDues.length === 1 ? "supplier" : "suppliers"
                  } waiting`}
            </div>

            {shop.supplierDues.length > 0 && (
              <>
                <div className={s.bannerRule} />
                <div className={s.stack}>
                  {shop.supplierDues.map((d) => (
                    <div key={d.supplier} className={s.rowBetween}>
                      <div style={{ minWidth: 0 }}>
                        <div className={`${s.truncate} ${c.dueName}`}>{d.supplier}</div>
                        <div className={s.bannerLabel}>
                          {d.loads} unpaid {d.loads === 1 ? "load" : "loads"}
                        </div>
                      </div>
                      <div
                        className="num"
                        style={{
                          fontSize: 16,
                          color: "var(--accent-gold-soft)",
                        }}
                      >
                        {d.balanceLabel}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className={s.card} ref={formRef}>
            <div className={s.cardTitle} style={{ marginBottom: 12 }}>
              New purchase
            </div>

            <div className={s.fieldLabel}>Bought from</div>
            {/* Typing looks up shops already bought from, so a repeat load is
                filed against the existing one instead of creating a twin. */}
            <div className={`${c.lookup} ${shop.purchaseSupplier.trim() === "" ? c.fieldGap : ""}`}>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Ramesh Dairy"
                value={shop.purchaseSupplier}
                onChange={(e) => {
                  shop.setPurchaseSupplier(e.target.value);
                  setSupplierOpen(true);
                }}
                onFocus={() => setSupplierOpen(true)}
                onBlur={() => setSupplierOpen(false)}
                onKeyDown={(e) => e.key === "Escape" && setSupplierOpen(false)}
                aria-label="Supplier"
                autoComplete="off"
              />

              {supplierOpen && shop.supplierMatches.length > 0 && (
                <div className={c.lookupList} role="listbox">
                  {shop.supplierMatches.map((m) => (
                    <button
                      key={m.supplier}
                      type="button"
                      className={c.lookupItem}
                      // mousedown fires before the input's blur closes the list
                      onMouseDown={(e) => {
                        e.preventDefault();
                        shop.setPurchaseSupplier(m.supplier);
                        setSupplierOpen(false);
                      }}
                    >
                      <span className={`${s.truncate} ${c.lookupName}`}>{m.supplier}</span>
                      <span className={c.lookupMeta}>
                        {m.loads} {m.loads === 1 ? "load" : "loads"} ·{" "}
                        {m.balance > 0 ? `${m.balanceLabel} due` : "all settled"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {shop.supplierExact ? (
              <div className={c.matchNote}>
                Saving to <strong>{shop.supplierExact.supplier}</strong> —{" "}
                {shop.supplierExact.loads} earlier{" "}
                {shop.supplierExact.loads === 1 ? "load" : "loads"}, {shop.supplierExact.spentLabel}{" "}
                bought
                {shop.supplierExact.balance > 0
                  ? `, ${shop.supplierExact.balanceLabel} still due`
                  : ", all settled"}
                .
              </div>
            ) : shop.purchaseSupplier.trim() !== "" ? (
              <div className={c.newNote}>
                New shop — <strong>{shop.purchaseSupplier.trim()}</strong> will be added to your
                supplier list.
              </div>
            ) : null}

            <div className={s.fieldLabel} style={{ marginTop: 12 }}>
              What was bought
            </div>
            <input
              className={s.input}
              type="text"
              placeholder="e.g. Milk crates x20"
              value={shop.purchaseItem}
              onChange={(e) => shop.setPurchaseItem(e.target.value)}
              style={{ marginBottom: 12 }}
              aria-label="Item"
              autoComplete="off"
            />

            <div className={c.amountGrid} style={{ marginBottom: 14 }}>
              <div>
                <div className={s.fieldLabel}>Total value</div>
                <input
                  className={`num ${s.input}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={shop.purchaseAmount}
                  onChange={(e) => shop.setPurchaseAmount(e.target.value)}
                  aria-label="Total value"
                />
              </div>
              <div>
                <div className={s.fieldLabel}>Paid now</div>
                <input
                  className={`num ${s.input}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={shop.purchasePaid}
                  onChange={(e) => shop.setPurchasePaid(e.target.value)}
                  aria-label="Paid now"
                />
              </div>
            </div>

            <button type="button" className={s.primaryButton} onClick={shop.addPurchase}>
              <IconPlus size={16} color="#fff" />
              Add Purchase
            </button>
          </section>
        </div>

        <div className={c.rightCol}>
          <div className={c.controls}>
            <div className={c.searchRow}>
              <IconSearch size={16} color="var(--text-faint)" />
              <input
                className={c.searchInput}
                type="text"
                placeholder="Search supplier or item"
                value={shop.purchaseSearch}
                onChange={(e) => shop.setPurchaseSearch(e.target.value)}
                aria-label="Search purchases"
              />
            </div>

            <button
              type="button"
              className={`${c.filterChip} ${shop.purchaseDueOnly ? c.filterActive : ""}`}
              onClick={() => shop.setPurchaseDueOnly(!shop.purchaseDueOnly)}
              aria-pressed={shop.purchaseDueOnly}
            >
              <IconAlert size={13} color={shop.purchaseDueOnly ? "#fff" : "var(--text-muted)"} />
              Unpaid only
            </button>
          </div>

          <section className={s.card}>
            <div className={s.rowBetween} style={{ marginBottom: 14 }}>
              <div className={s.cardTitle}>Purchase history</div>
              <Link href="/purchases" className={s.linkButton}>
                View all bills
              </Link>
            </div>

            {shop.supplierGroups.length > 0 ? (
              <div className={c.shopList}>
                {shop.supplierGroups.map((g) => {
                  const open = forceOpen || openShops.includes(g.supplier);
                  return (
                    <div key={g.supplier} className={`${s.cardSm} ${c.shopCard}`}>
                      {/* Collapsed, a shop shows only its running totals. */}
                      <button
                        type="button"
                        className={c.shopHead}
                        onClick={() => toggleShop(g.supplier)}
                        aria-expanded={open}
                      >
                        <div className={c.shopHeadTop}>
                          <div style={{ minWidth: 0 }}>
                            <div className={`${s.truncate} ${c.shopName}`}>{g.supplier}</div>
                            <div className={c.shopMeta}>
                              {g.rows.length} {g.rows.length === 1 ? "load" : "loads"} · last{" "}
                              {g.lastLabel}
                            </div>
                          </div>
                          <span className={`${c.shopChevron} ${open ? c.shopChevronOpen : ""}`}>
                            <IconChevron size={16} color="var(--text-muted)" />
                          </span>
                        </div>

                        <div className={c.moneyRow}>
                          <div>
                            <div className={`num ${c.moneyValue}`}>{g.totalLabel}</div>
                            <div className={c.moneyLabel}>Total</div>
                          </div>
                          <div>
                            <div className={`num ${c.moneyValue}`}>{g.paidLabel}</div>
                            <div className={c.moneyLabel}>Paid</div>
                          </div>
                          <div>
                            <div
                              className={`num ${c.moneyValue}`}
                              style={{ color: g.settled ? "var(--success)" : "var(--warning)" }}
                            >
                              {g.settled ? "Settled" : g.balanceLabel}
                            </div>
                            <div className={c.moneyLabel}>
                              {g.settled ? "Nothing due" : "Balance"}
                            </div>
                          </div>
                        </div>
                      </button>

                      {open && (
                        <div className={c.shopLoads}>
                          {g.rows.map((p) => (
                            <LoadCard key={p.id} shop={shop} p={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyHistory shop={shop} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
