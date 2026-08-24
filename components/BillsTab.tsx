"use client";

import type { Shop } from "@/lib/useShop";
import { CATEGORIES, PAD_KEYS, PAYMENT_MODES } from "@/lib/constants";
import { formatINR, groupIN } from "@/lib/format";
import s from "./shared.module.css";
import c from "./BillsTab.module.css";
import { IconBackspace, IconBill, IconPencil, IconPlus, IconTrash } from "./Icons";

export default function BillsTab({ shop }: { shop: Shop }) {
  const showForm = shop.isTodayView;
  const amountDisplay = shop.formAmount === "" ? "0" : groupIN(Number(shop.formAmount));

  const form = (
    <section className={s.card}>
      <div className={s.cardTitle} style={{ marginBottom: 14 }}>
        Add a bill
      </div>

      <div className={c.formGrid}>
        <div>
          {/* Keypad path (tablet and desktop) */}
          <div className={c.amountDisplay}>
            <span
              className="num"
              style={{ color: "var(--text-faint)", fontSize: 20 }}
            >
              ₹
            </span>
            <span className={`num ${c.amountValue}`}>{amountDisplay}</span>
          </div>
          <div className={c.keypad}>
            {PAD_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={c.keyButton}
                onClick={() => shop.pressPad(k)}
                aria-label={k === "back" ? "Backspace" : k}
              >
                {k === "back" ? <IconBackspace size={20} color="var(--text-muted)" /> : k}
              </button>
            ))}
          </div>

          {/* Native numeric input path (mobile) */}
          <div className={`${s.inputRow} ${c.amountField}`} style={{ marginBottom: 10 }}>
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
              value={shop.formAmount}
              onChange={(e) => shop.setFormAmount(e.target.value)}
              aria-label="Bill amount"
            />
          </div>
        </div>

        <div className={c.formFields}>
          <input
            className={s.input}
            type="text"
            placeholder="What was sold? (optional)"
            value={shop.formDesc}
            onChange={(e) => shop.setFormDesc(e.target.value)}
            style={{ marginBottom: 12 }}
            aria-label="Description"
          />

          <div className={c.catChips}>
            {CATEGORIES.map((cat) => {
              const active = shop.formCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={s.chip}
                  style={
                    active ? { background: cat.color, color: "#fff" } : undefined
                  }
                  onClick={() => shop.setFormCategory(cat.id)}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className={s.fieldLabel}>Paid by</div>
          <div className={c.modeGrid}>
            {PAYMENT_MODES.map((m) => {
              const active = shop.formMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={c.modeButton}
                  style={active ? { background: m.color, color: "#fff" } : undefined}
                  onClick={() => shop.setFormMode(m.id)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {shop.formMode === "credit" && (
            <input
              className={s.input}
              type="text"
              placeholder="Who is taking it on credit?"
              value={shop.formCustomer}
              onChange={(e) => shop.setFormCustomer(e.target.value)}
              style={{ marginBottom: 14 }}
              aria-label="Customer name"
              autoComplete="off"
            />
          )}

          <button type="button" className={s.primaryButton} onClick={shop.addBill}>
            <IconPlus size={16} color="#fff" />
            Add Bill
          </button>
        </div>
      </div>
    </section>
  );

  const paymentCard = (
    <section className={s.card}>
      <div className={s.cardTitle} style={{ marginBottom: 14 }}>
        How it was paid
      </div>
      <div className={s.stack}>
        {shop.paymentSplit.map((m) => (
          <div key={m.id}>
            <div className={s.rowBetween} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: m.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 600 }}>
                    {m.note}
                  </div>
                </div>
              </div>
              <div className="num" style={{ fontSize: 13 }}>
                {m.amountLabel}
              </div>
            </div>
            <div className={s.track}>
              <div
                className={s.trackFill}
                style={{ width: `${m.pct}%`, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const entries = (
    <section className={s.card}>
      <div className={s.rowBetween} style={{ marginBottom: 14 }}>
        <div className={s.cardTitle}>
          {shop.isTodayView ? "Today's entries" : `Entries on ${shop.selectedDay.sub}`}
        </div>
        <div className={s.muted}>
          {shop.viewCount} {shop.viewCount === 1 ? "bill" : "bills"}
          {shop.isTodayView ? " today" : ""}
        </div>
      </div>

      {shop.billRows.length > 0 ? (
        <>
          <div className={c.entriesList} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shop.billRows.map((b) => (
              <div key={b.id} className={`${s.cardSm} ${c.billRow}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: b.catColor,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                      {b.desc}
                    </div>
                    <div className={c.billMeta}>
                      <span className={c.modeBadge} style={{ background: b.modeColor }}>
                        {b.modeLabel}
                      </span>
                      <span
                        className={s.truncate}
                        style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}
                      >
                        {b.customer ? `${b.customer} · ` : ""}
                        {b.catLabel} · {b.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 14, paddingRight: 6 }}>
                    {b.amountLabel}
                  </div>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => shop.editBill(b.id)}
                    aria-label={`Edit ${b.desc}`}
                  >
                    <span className={s.rowActionInner}>
                      <IconPencil size={13} color="var(--text-muted)" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={s.rowAction}
                    onClick={() => shop.deleteBill(b.id)}
                    aria-label={`Delete ${b.desc}`}
                  >
                    <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                      <IconTrash size={13} color="var(--danger)" />
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={c.closingRow} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>
              {shop.isTodayView ? "Closing total" : "Day total"}
            </div>
            <div className="num" style={{ fontSize: 24, color: "var(--primary-dark)" }}>
              {formatINR(shop.viewTotal)}
            </div>
          </div>
        </>
      ) : (
        <div className={s.empty}>
          <IconBill size={36} color="var(--text-faint)" />
          <div className={s.emptyTitle}>
            {shop.isTodayView ? "No bills yet today" : "No bills on this day"}
          </div>
          <div style={{ fontSize: 12 }}>
            {shop.isTodayView
              ? "Add your first sale to get started."
              : "Pick another date above to keep looking."}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div>
      {/* Date filter — each card carries that day's total, so you can often
          read what you need without opening the day at all. */}
      <div className={`${c.dayStrip} scrollX`}>
        {shop.dayChips.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`${c.dayChip} ${d.active ? c.dayChipActive : ""}`}
            onClick={() => shop.setSelectedDate(d.key)}
            aria-pressed={d.active}
          >
            <div className={c.dayShort}>{d.short}</div>
            <div className={c.daySub}>{d.sub}</div>
            <div className={`num ${c.dayTotal}`}>{d.totalLabel}</div>
          </button>
        ))}
      </div>

      {!shop.isTodayView && (
        <div className={c.pastBar}>
          <div className={`${c.pastText} ${s.truncate}`}>
            Viewing {shop.selectedDay.short}, {shop.selectedDay.sub} — read-only
          </div>
          <button
            type="button"
            className={`${s.linkButton} tap`}
            onClick={() => shop.setSelectedDate(shop.dayChips[0].key)}
          >
            Back to today
          </button>
        </div>
      )}

      <div className={c.layout}>
        <div className={c.leftCol} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section className={`${s.banner} ${s.bannerPrimary}`}>
            <div className={s.bannerLabel}>
              {shop.isTodayView
                ? "Total collected today"
                : `Total collected ${shop.selectedDay.long}`}
            </div>
            <div className={`num ${s.bannerValue}`}>{formatINR(shop.viewTotal)}</div>
            <div className={s.bannerLabel}>
              {shop.viewCount} {shop.viewCount === 1 ? "bill" : "bills"}
              {shop.isTodayView ? " today" : ""}
            </div>
            <div className={s.bannerRule} />
            <div className={s.rowBetween}>
              <div className={s.bannerLabel}>Cash in drawer</div>
              <div className="num" style={{ fontSize: 20, color: "#fff" }}>
                {formatINR(shop.cashInDrawer)}
              </div>
            </div>
            {shop.creditTotal > 0 && (
              <div className={s.rowBetween} style={{ marginTop: 8 }}>
                <div className={s.bannerLabel}>On credit — to collect</div>
                <div className="num" style={{ fontSize: 16, color: "var(--accent-gold-soft)" }}>
                  {formatINR(shop.creditTotal)}
                </div>
              </div>
            )}
          </section>

          {showForm && form}
        </div>

        <div className={c.rightCol} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {paymentCard}
          {entries}
        </div>
      </div>
    </div>
  );
}
