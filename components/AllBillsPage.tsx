"use client";

import { useEffect, useRef, useState } from "react";
import { useShopContext } from "@/lib/shopContext";
import { PURCHASE_RANGES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import AppShell from "./AppShell";
import LoadCard from "./LoadCard";
import s from "./shared.module.css";
import c from "./AllBillsPage.module.css";
import CalendarFilter from "./CalendarFilter";
import { formatDateKey } from "@/lib/format";
import { IconAlert, IconBox, IconCalendar, IconSearch } from "./Icons";

export default function AllBillsPage() {
  const shop = useShopContext();
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement | null>(null);

  /* A click anywhere else closes the calendar, the way a popover should. */
  useEffect(() => {
    if (!calOpen) return;
    function onDown(e: MouseEvent) {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [calOpen]);

  const custom = shop.ledgerRange === "custom";
  const { from, to } = shop.ledgerWindow;
  const calLabel = custom && from
    ? to && to !== from
      ? `${formatDateKey(from)} – ${formatDateKey(to)}`
      : formatDateKey(from)
    : "Pick dates";
  const filtered =
    shop.ledgerSearch.trim() !== "" || shop.ledgerDueOnly || shop.ledgerRange !== "all";

  const total = shop.ledgerRows.reduce((sum, p) => sum + p.amount, 0);
  const due = shop.ledgerRows.reduce((sum, p) => sum + p.balance, 0);

  return (
    <AppShell title="All Purchase Bills" back={{ href: "/", label: "Stock", tab: "stock" }}>
      <div className={s.rowBetween} style={{ marginBottom: 12 }}>
        <div className={s.sectionLabel}>All purchase bills</div>
        <div className={s.muted}>
          {shop.ledgerRows.length} {shop.ledgerRows.length === 1 ? "bill" : "bills"}
        </div>
      </div>

      {/* Totals follow the filters, so they always describe what is on screen. */}
      <div className={c.summary}>
        <div className={`${s.cardSm} ${c.summaryCard}`}>
          <div className={`num ${c.summaryValue}`}>{formatINR(total)}</div>
          <div className={c.summaryLabel}>Bought in this view</div>
        </div>
        <div className={`${s.cardSm} ${c.summaryCard}`}>
          <div
            className={`num ${c.summaryValue}`}
            style={{ color: due > 0 ? "var(--warning)" : "var(--success)" }}
          >
            {formatINR(due)}
          </div>
          <div className={c.summaryLabel}>Still to pay</div>
        </div>
      </div>

      <div className={c.filters}>
        <div className={c.searchRow}>
          <IconSearch size={16} color="var(--text-faint)" />
          <input
            className={c.searchInput}
            type="text"
            placeholder="Search supplier or item"
            value={shop.ledgerSearch}
            onChange={(e) => shop.setLedgerSearch(e.target.value)}
            aria-label="Search bills"
          />
        </div>

        <div className={c.rangeRow}>
          {PURCHASE_RANGES.map((r) => {
            const active = shop.ledgerRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`${c.rangeChip} ${active ? c.rangeChipActive : ""}`}
                onClick={() => shop.chooseLedgerRange(r.id)}
                aria-pressed={active}
              >
                {r.label}
              </button>
            );
          })}

          <div className={c.calWrap} ref={calRef}>
            <button
              type="button"
              className={`${c.rangeChip} ${custom ? c.rangeChipActive : ""}`}
              onClick={() => setCalOpen(!calOpen)}
              aria-expanded={calOpen}
            >
              <IconCalendar size={13} color={custom ? "#fff" : "var(--text-muted)"} />
              {calLabel}
            </button>
            {calOpen && <CalendarFilter shop={shop} onDone={() => setCalOpen(false)} />}
          </div>

          <button
            type="button"
            className={`${c.rangeChip} ${shop.ledgerDueOnly ? c.dueActive : ""}`}
            onClick={() => shop.setLedgerDueOnly(!shop.ledgerDueOnly)}
            aria-pressed={shop.ledgerDueOnly}
          >
            <IconAlert size={12} color={shop.ledgerDueOnly ? "#fff" : "var(--text-muted)"} />
            Unpaid only
          </button>
        </div>
      </div>

      {shop.ledgerRows.length > 0 ? (
        <div className={c.list}>
          {shop.ledgerRows.map((p) => (
            <LoadCard key={p.id} shop={shop} p={p} showSupplier />
          ))}
        </div>
      ) : (
        <section className={s.card}>
          <div className={s.empty}>
            <IconBox size={36} color="var(--text-faint)" />
            <div className={s.emptyTitle}>
              {filtered ? "Nothing matches" : "No purchases yet"}
            </div>
            <div style={{ fontSize: 12 }}>
              {filtered
                ? "Try a wider date range, or clear the search and filter."
                : "Record what you buy from the wholesaler to track what you owe."}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
