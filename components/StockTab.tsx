"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatINR } from "@/lib/format";
import SupplierPanel from "./SupplierPanel";
import LoadCard from "./LoadCard";
import s from "./shared.module.css";
import c from "./StockTab.module.css";
import k from "./BillsTab.module.css";
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
  /* One card, two jobs: a new load, or money handed to a shop. */
  const [mode, setMode] = useState<"purchase" | "pay">("purchase");
  const [payShop, setPayShop] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [openShops, setOpenShops] = useState<string[]>([]);

  function toggleShop(supplier: string) {
    setOpenShops((prev) =>
      prev.includes(supplier) ? prev.filter((x) => x !== supplier) : [...prev, supplier],
    );
  }

  /* Only shops that are still owed can be paid. */
  const payQuery = payShop.trim().toLowerCase();
  const owingMatches = shop.supplierDues.filter(
    (d) => payQuery === "" || d.supplier.toLowerCase().includes(payQuery),
  );
  const payTarget = (() => {
    const due = shop.supplierDues.find((d) => d.supplier.toLowerCase() === payQuery);
    const stats = shop.supplierStats.find((r) => r.supplier === due?.supplier);
    return due && stats ? { ...due, spent: stats.spent } : null;
  })();
  const payTyped = parseFloat(payAmount);

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
        <div className={s.sectionLabel}>Supplier Purchases</div>
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
            <div
              className={k.kindSwitch}
              style={{ "--n": 2, "--i": mode === "purchase" ? 0 : 1 } as React.CSSProperties}
            >
              {(
                [
                  { id: "purchase", label: "New purchase" },
                  { id: "pay", label: "Paid" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${k.kindButton} ${mode === m.id ? k.kindOn : ""}`}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === "purchase" ? (
              <>

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
              </>
            ) : (
              <>
                <div className={s.fieldLabel}>Shop paid</div>
                <div className={`${c.lookup} ${c.fieldGap}`}>
                  <input
                    className={s.input}
                    type="text"
                    placeholder="Pick or type the shop"
                    value={payShop}
                    onChange={(e) => {
                      setPayShop(e.target.value);
                      setPayOpen(true);
                    }}
                    onFocus={() => setPayOpen(true)}
                    onBlur={() => setPayOpen(false)}
                    onKeyDown={(e) => e.key === "Escape" && setPayOpen(false)}
                    aria-label="Shop paid"
                    autoComplete="off"
                  />
                  {payOpen && owingMatches.length > 0 && (
                    <div className={c.lookupList} role="listbox">
                      {owingMatches.map((m) => (
                        <button
                          key={m.supplier}
                          type="button"
                          className={c.lookupItem}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPayShop(m.supplier);
                            setPayOpen(false);
                          }}
                        >
                          <span className={`${s.truncate} ${c.lookupName}`}>{m.supplier}</span>
                          <span className={c.lookupMeta}>{m.balanceLabel} due</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {payTarget ? (
                  <div className={c.matchNote}>
                    <div className={c.payFigures}>
                      <div>
                        <div className={`num ${c.payFigure}`}>{formatINR(payTarget.spent)}</div>
                        <div className={c.payFigureLabel}>Total</div>
                      </div>
                      <div>
                        <div className={`num ${c.payFigure}`} style={{ color: "var(--success)" }}>
                          {formatINR(payTarget.spent - payTarget.balance)}
                        </div>
                        <div className={c.payFigureLabel}>Already paid</div>
                      </div>
                      <div>
                        <div className={`num ${c.payFigure}`} style={{ color: "var(--warning)" }}>
                          {payTarget.balanceLabel}
                        </div>
                        <div className={c.payFigureLabel}>Balance</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {payTarget.loads} unpaid {payTarget.loads === 1 ? "load" : "loads"}. The
                      payment comes off the oldest load first.
                    </div>
                  </div>
                ) : payShop.trim() !== "" ? (
                  <div className={c.newNote}>No unpaid balance for a shop with that name.</div>
                ) : null}

                <div className={s.fieldLabel} style={{ marginTop: 12 }}>
                  Amount paid
                </div>
                <input
                  className={`num ${s.input}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={{ marginBottom: 14 }}
                  aria-label="Amount paid"
                />

                <button
                  type="button"
                  className={s.primaryButton}
                  disabled={!payTarget || !(payTyped > 0)}
                  style={!payTarget || !(payTyped > 0) ? { opacity: 0.5 } : undefined}
                  onClick={() => {
                    if (payTarget && shop.paySupplier(payTarget.supplier, payTyped) > 0) {
                      setPayAmount("");
                    }
                  }}
                >
                  <IconPlus size={16} color="#fff" />
                  Record payment{payTarget && payTyped > 0 ? ` · ${formatINR(Math.min(payTyped, payTarget.balance))}` : ""}
                </button>
              </>
            )}
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
                          <SupplierPanel shop={shop} g={g} />
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
