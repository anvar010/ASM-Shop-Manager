"use client";

import { useEffect, useRef, useState } from "react";
import { useShopContext } from "@/lib/shopContext";
import { PURCHASE_RANGES } from "@/lib/constants";
import { formatDateKey, formatINR } from "@/lib/format";
import AppShell from "./AppShell";
import CalendarFilter from "./CalendarFilter";
import s from "./shared.module.css";
import c from "./CreditorsPage.module.css";
import { IconAlert, IconBill, IconCalendar, IconChevron, IconSearch } from "./Icons";

export default function CreditorsPage() {
  const shop = useShopContext();
  const [calOpen, setCalOpen] = useState(false);
  const [openNames, setOpenNames] = useState<string[]>([]);
  const calRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!calOpen) return;
    function onDown(e: MouseEvent) {
      if (!calRef.current?.contains(e.target as Node)) setCalOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [calOpen]);

  const custom = shop.creditRange === "custom";
  const { from, to } = shop.creditWindow;
  const calLabel =
    custom && from
      ? to && to !== from
        ? `${formatDateKey(from)} – ${formatDateKey(to)}`
        : formatDateKey(from)
      : "Pick dates";

  /* Searching is a request to see the matching bills, not just the names. */
  const forceOpen = shop.creditSearch.trim() !== "";

  function toggle(name: string) {
    setOpenNames((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  }

  return (
    <AppShell title="Credit Customers" back={{ href: "/", label: "Overview", tab: "overview" }}>
      <div className={s.rowBetween} style={{ marginBottom: 12 }}>
        <div className={s.sectionLabel}>Credit customers</div>
        <div className={s.muted}>
          {shop.creditorGroups.length} {shop.creditorGroups.length === 1 ? "person" : "people"}
        </div>
      </div>

      <section className={`${s.banner} ${s.bannerPrimary}`} style={{ marginBottom: 12 }}>
        <div className={s.bannerLabel}>Owed to you</div>
        <div className={`num ${s.bannerValue}`}>{formatINR(shop.creditorsOwed)}</div>
        <div className={s.bannerLabel}>
          {shop.creditorsBillCount} {shop.creditorsBillCount === 1 ? "bill" : "bills"} on credit
          {shop.creditorGroups.length > 0 && ` · ${shop.creditorGroups.length} owing`}
        </div>
      </section>

      <div className={c.filters}>
        <div className={c.searchRow}>
          <IconSearch size={16} color="var(--text-faint)" />
          <input
            className={c.searchInput}
            type="text"
            placeholder="Search person or item"
            value={shop.creditSearch}
            onChange={(e) => shop.setCreditSearch(e.target.value)}
            aria-label="Search credit customers"
          />
        </div>

        <div className={c.rangeRow}>
          {PURCHASE_RANGES.map((r) => {
            const active = shop.creditRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`${c.rangeChip} ${active ? c.rangeChipActive : ""}`}
                onClick={() => shop.chooseCreditRange(r.id)}
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
            {calOpen && (
              <CalendarFilter
                window={shop.creditWindow}
                custom={custom}
                marked={shop.creditDates}
                onPick={shop.pickCreditDate}
                onClear={shop.clearCreditDates}
                onDone={() => setCalOpen(false)}
              />
            )}
          </div>

          <button
            type="button"
            className={`${c.rangeChip} ${shop.creditOwingOnly ? c.owingActive : ""}`}
            onClick={() => shop.setCreditOwingOnly(!shop.creditOwingOnly)}
            aria-pressed={shop.creditOwingOnly}
          >
            <IconAlert size={12} color={shop.creditOwingOnly ? "#fff" : "var(--text-muted)"} />
            Still owing
          </button>
        </div>
      </div>

      {shop.creditorGroups.length > 0 ? (
        <div className={c.list}>
          {shop.creditorGroups.map((g) => {
            const open = forceOpen || openNames.includes(g.customer);
            return (
              <div key={g.customer} className={`${s.cardSm} ${c.personCard}`}>
                <button
                  type="button"
                  className={c.personHead}
                  onClick={() => toggle(g.customer)}
                  aria-expanded={open}
                >
                  <span className={c.avatar}>{g.customer.slice(0, 1).toUpperCase()}</span>
                  <span className={c.personText}>
                    <span className={`${s.truncate} ${c.personName}`}>{g.customer}</span>
                    <span className={c.personMeta}>
                      {g.rows.length} {g.rows.length === 1 ? "bill" : "bills"}
                      {g.settled ? ` · last ${g.lastLabel}` : ` · owing since ${g.owingSinceLabel}`}
                    </span>
                    {!g.settled && (
                      <span className={c.personAge}>Outstanding {g.owingAgeLabel}</span>
                    )}
                  </span>
                  <span className={c.personRight}>
                    <span className={`num ${g.settled ? c.owedClear : c.owed}`}>
                      {g.settled ? "Settled" : g.owedLabel}
                    </span>
                    <span className={`${c.chevron} ${open ? c.chevronOpen : ""}`}>
                      <IconChevron size={15} color="var(--text-muted)" />
                    </span>
                  </span>
                </button>

                {open && (
                  <div className={c.bills}>
                    {g.rows.map((b) => {
                      const settling = shop.settlingId === b.id;
                      const typed = parseFloat(shop.settleAmount);
                      const take = Number.isNaN(typed) ? b.balance : Math.min(typed, b.balance);
                      return (
                        <div key={b.id} className={c.billRow}>
                          <div className={c.billTop}>
                            <span className={c.dot} style={{ background: b.catColor }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className={`${s.truncate} ${c.billDesc}`}>{b.desc}</div>
                              <div className={c.billMeta}>
                                Taken {b.dayLabel} · {b.time}
                              </div>
                              <div className={c.billMeta}>
                                {b.catLabel} · {b.ageLabel}
                              </div>
                            </div>
                            <div className={c.billFigures}>
                              <div className={`num ${c.billAmount}`}>{b.amountLabel}</div>
                              {b.repaid > 0 && !b.settled && (
                                <div className={c.billBalance}>{b.balanceLabel} left</div>
                              )}
                            </div>
                          </div>

                          {/* What they have paid back so far, oldest first. */}
                          {b.payLog.length > 0 && (
                            <div className={c.payLog}>
                              {b.payLog.map((p) => (
                                <div key={p.id} className={c.payLogRow}>
                                  <span>Paid {p.dayLabel}</span>
                                  <span className="num">−{p.amountLabel}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {b.settled ? (
                            <div className={c.settledTag}>
                              Settled{b.settledOn ? ` on ${b.settledOn}` : ""}
                            </div>
                          ) : settling ? (
                            <div className={c.settleRow}>
                              <input
                                className={`num ${c.settleInput}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                placeholder={String(b.balance)}
                                value={shop.settleAmount}
                                onChange={(e) => shop.setSettleAmount(e.target.value)}
                                aria-label={`Amount ${g.customer} paid`}
                                autoFocus
                              />
                              <button
                                type="button"
                                className={c.settleConfirm}
                                onClick={() => shop.settleCredit(b.id, take)}
                              >
                                Take {formatINR(take)}
                              </button>
                              <button
                                type="button"
                                className={c.settleCancel}
                                onClick={() => shop.startSettling(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className={c.settleRow}>
                              <button
                                type="button"
                                className={c.settleFull}
                                onClick={() => shop.settleCredit(b.id, b.balance)}
                              >
                                Settle full {b.balanceLabel}
                              </button>
                              <button
                                type="button"
                                className={c.settlePart}
                                onClick={() => shop.startSettling(b.id)}
                              >
                                Received
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!g.settled && g.rows.length > 1 && (
                      <button
                        type="button"
                        className={c.settleAll}
                        onClick={() => shop.settleAllFor(g.customer)}
                      >
                        Clear everything {g.customer} owes · {g.owedLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <section className={s.card}>
          <div className={s.empty}>
            <IconBill size={36} color="var(--text-faint)" />
            <div className={s.emptyTitle}>Nobody owes you</div>
            <div style={{ fontSize: 12 }}>
              Bills marked Credit on the Bills tab show up here, grouped by person.
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
