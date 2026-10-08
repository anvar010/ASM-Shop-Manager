"use client";

import { useMemo, useState } from "react";
import { useConfirm } from "./ConfirmDialog";
import BillRowEditor from "./BillRowEditor";
import VoiceButton from "./VoiceButton";
import DayClosing from "./DayClosing";
import ItemPicker from "./ItemPicker";
import type { Shop } from "@/lib/useShop";
import { CATEGORIES, PAD_KEYS, PAYMENT_MODES } from "@/lib/constants";
import { formatDMY, formatINR, groupIN } from "@/lib/format";
import s from "./shared.module.css";
import c from "./BillsTab.module.css";
import { IconBackspace, IconBill, IconChevron, IconMinus, IconPencil, IconPlus, IconTrash } from "./Icons";

/** The keypad amount as a number; empty or unfinished reads as zero. */
function typedAmountRaw(text: string): number {
  return parseFloat(text) || 0;
}

/* Not green or blue: those already mean Cash and UPI on a sale. */
const RECEIVED_BADGE = "#7a4fc4";

export default function BillsTab({ shop }: { shop: Shop }) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const { ask, dialog } = useConfirm();
  const showForm = shop.isTodayView;
  const amountDisplay = shop.formAmount === "" ? "0" : groupIN(Number(shop.formAmount));

  /* The same keypad and name field serve two jobs: writing a sale, and taking
     money back against one already given on credit. */
  const receiving = shop.formKind === "received";
  const paying = shop.formKind === "supplier";
  const sale = shop.formKind === "sale";

  /* Dealing with a wholesaler from the counter: pick the shop, use the same
     keypad, and say whether the amount is goods taken or money paid. */
  const [supplierName, setSupplierName] = useState("");
  const [supplierItem, setSupplierItem] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const supplierQuery = supplierName.trim().toLowerCase();
  const supplierList = shop.supplierStats.filter(
    (d) => supplierQuery === "" || d.supplier.toLowerCase().includes(supplierQuery),
  );
  const supplierKnown = shop.supplierStats.find((r) => r.supplier.toLowerCase() === supplierQuery);
  const supplierOwed = supplierKnown?.balance ?? 0;
  const supplierPay = Math.min(typedAmountRaw(shop.formAmount), supplierOwed);
  const supplierAmount = typedAmountRaw(shop.formAmount);
  const typedAmount = typedAmountRaw(shop.formAmount);
  const target = shop.receiveTarget;
  const owed = target?.owed ?? 0;
  const applied = Math.min(typedAmount, owed);
  const overpaid = typedAmount > owed && owed > 0;
  const canReceive = applied > 0;

  /* Between midnight and the 3 AM rollover the shop is still on last night's
     day. Saying so beats a totals screen that looks mysteriously empty. */
  const pastMidnight = shop.calendarToday !== shop.today;
  const filingUnder = shop.formDate || shop.today;
  const movedOn = filingUnder !== shop.today;

  const form = (
    <section className={s.card}>
      <div className={s.cardTitle} style={{ marginBottom: 12 }}>
        {receiving ? "Money received" : paying ? "Supplier" : "Add a bill"}
      </div>

      <div
        className={c.kindSwitch}
        style={
          {
            "--i": ["sale", "received", "supplier"].indexOf(shop.formKind),
          } as React.CSSProperties
        }
      >
        {([
          { id: "sale", label: "New sale" },
          { id: "received", label: "Received" },
          { id: "supplier", label: "Supplier" },
        ] as const).map((k) => (
          <button
            key={k.id}
            type="button"
            className={`${c.kindButton} ${shop.formKind === k.id ? c.kindOn : ""}`}
            onClick={() => shop.setFormKind(k.id)}
            aria-pressed={shop.formKind === k.id}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className={c.formGrid}>
        <div>
          {/* Keypad path (tablet and desktop) */}
          <div key={shop.padBlocked} className={`${c.amountDisplay} ${shop.padBlocked > 0 ? c.padBlocked : ""}`}>
            <span
              className="num"
              style={{ color: "var(--text-faint)", fontSize: 20 }}
            >
              ₹
            </span>
            <span className={`num ${c.amountValue}`}>{amountDisplay}</span>
            {shop.padParts.length > 0 && (
              <span className={`num ${c.padTape}`}>
                {shop.padParts
                  .map((n, i) => (i === 0 ? groupIN(n) : `${n < 0 ? "−" : "+"} ${groupIN(Math.abs(n))}`))
                  .join(" ")}{" "}
                {shop.padNeg ? "−" : "+"}{" "}
                {shop.padAddend !== "" ? groupIN(Number(shop.padAddend)) : ""}
              </span>
            )}
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
            <div className={c.opRow}>
            <button
              type="button"
              className={`${c.keyButton} ${c.opKey}`}
              onClick={() => shop.pressPad("-")}
              aria-label="Take this amount off and key in another"
            >
              <IconMinus size={18} color="currentColor" />
            </button>
            <button
              type="button"
              className={`${c.keyButton} ${c.opKey}`}
              onClick={() => shop.pressPad("+")}
              aria-label="Add this amount and key in another"
            >
              <IconPlus size={18} color="currentColor" />
            </button>
            </div>
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

        <div key={shop.formKind} className={`${c.formFields} ${c.kindPanel}`}>
          {sale && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input
                className={s.input}
                type="text"
                placeholder="What was sold? (optional)"
                value={shop.formDesc}
                onChange={(e) => shop.setFormDesc(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
                aria-label="Description"
              />
              <VoiceButton
                className={s.micButton}
                onHeard={(h) => {
                  if (h.text) shop.setFormDesc(h.text);
                  if (h.amount) shop.setFormAmount(h.amount);
                }}
              />
            </div>
          )}

          {sale && (
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
          )}

          {sale && <div className={s.fieldLabel}>Paid by</div>}
          {sale && (
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

          )}

          {/* Typing looks up people who already have a tab, so a repeat credit
              sale joins their existing one instead of starting a second. */}
          {sale && shop.formMode === "credit" && (
            <div style={{ marginBottom: 14 }}>
              <div className={c.lookup}>
                <input
                  className={s.input}
                  type="text"
                  placeholder="Who is taking it on credit?"
                  value={shop.formCustomer}
                  onChange={(e) => {
                    shop.setFormCustomer(e.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  onBlur={() => setCustomerOpen(false)}
                  onKeyDown={(e) => e.key === "Escape" && setCustomerOpen(false)}
                  aria-label="Customer name"
                  autoComplete="off"
                />

                {customerOpen && shop.customerMatches.length > 0 && (
                  <div className={c.lookupList} role="listbox">
                    {shop.customerMatches.map((m) => (
                      <button
                        key={m.customer}
                        type="button"
                        className={c.lookupItem}
                        // mousedown fires before the input's blur closes the list
                        onMouseDown={(e) => {
                          e.preventDefault();
                          shop.setFormCustomer(m.customer);
                          setCustomerOpen(false);
                        }}
                      >
                        <span className={`${s.truncate} ${c.lookupName}`}>{m.customer}</span>
                        <span className={c.lookupMeta}>
                          {m.bills} {m.bills === 1 ? "bill" : "bills"} ·{" "}
                          {m.owed > 0 ? `${m.owedLabel} owing` : "all settled"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={s.fieldLabel} style={{ marginTop: 12 }}>
                Date taken
              </div>
              <input
                className={s.input}
                type="date"
                value={shop.formDate}
                max={shop.calendarToday}
                onChange={(e) => shop.setFormDate(e.target.value || shop.dayChips[0].key)}
                aria-label="Date the credit was taken"
              />

              {shop.customerExact ? (
                <div className={c.matchNote}>
                  Adding to <strong>{shop.customerExact.customer}</strong>&apos;s tab —{" "}
                  {shop.customerExact.bills} earlier{" "}
                  {shop.customerExact.bills === 1 ? "bill" : "bills"}
                  {shop.customerExact.owed > 0
                    ? `, ${shop.customerExact.owedLabel} still owing`
                    : ", all settled"}
                  .
                </div>
              ) : shop.formCustomer.trim() !== "" ? (
                <div className={c.newNote}>
                  New customer — <strong>{shop.formCustomer.trim()}</strong> will get their own tab.
                </div>
              ) : null}
            </div>
          )}

          {pastMidnight && (
            <div className={c.nightNote}>
              <span>
                {movedOn ? (
                  <>
                    Filing under <strong>{formatDMY(filingUnder)}</strong> — it will appear on that
                    day&apos;s list, not this one.
                  </>
                ) : (
                  <>
                    Filing under <strong>{formatDMY(shop.today)}</strong> — last night&apos;s
                    takings.
                  </>
                )}
              </span>
              <button
                type="button"
                className={c.nightSwitch}
                onClick={() => shop.setFormDate(movedOn ? shop.today : shop.calendarToday)}
              >
                {movedOn
                  ? `Put back to ${formatDMY(shop.today)}`
                  : `Move to ${formatDMY(shop.calendarToday)}`}
              </button>
            </div>
          )}

          {receiving && <div className={s.fieldLabel}>Received by</div>}
          {receiving && (
            <div className={c.modeGrid} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {PAYMENT_MODES.filter((m) => m.id !== "credit").map((m) => {
                const active = shop.receivedMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={c.modeButton}
                    style={active ? { background: m.color, color: "#fff" } : undefined}
                    onClick={() => shop.setReceivedMode(m.id as "cash" | "upi")}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          {receiving && (
            <div style={{ marginBottom: 14 }}>
              <div className={s.fieldLabel}>Received from</div>
              <div className={c.lookup}>
                <input
                  className={s.input}
                  type="text"
                  placeholder="Who is paying back?"
                  value={shop.formCustomer}
                  onChange={(e) => {
                    shop.setFormCustomer(e.target.value);
                    setCustomerOpen(true);
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  onBlur={() => setCustomerOpen(false)}
                  onKeyDown={(e) => e.key === "Escape" && setCustomerOpen(false)}
                  aria-label="Who the money came from"
                  autoComplete="off"
                />

                {/* Only people with something outstanding: money cannot be
                    taken back from a tab that is already clear. */}
                {customerOpen && shop.owingMatches.length > 0 && (
                  <div className={c.lookupList} role="listbox">
                    {shop.owingMatches.map((m) => (
                      <button
                        key={m.customer}
                        type="button"
                        className={c.lookupItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          shop.setFormCustomer(m.customer);
                          setCustomerOpen(false);
                        }}
                      >
                        <span className={`${s.truncate} ${c.lookupName}`}>{m.customer}</span>
                        <span className={c.lookupMeta}>{m.owedLabel} owing</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={s.fieldLabel} style={{ marginTop: 12 }}>
                Date received
              </div>
              <input
                className={s.input}
                type="date"
                value={shop.formDate}
                max={shop.calendarToday}
                onChange={(e) => shop.setFormDate(e.target.value || shop.dayChips[0].key)}
                aria-label="Date the money was received"
              />

              {target ? (
                <div className={c.receiveNote}>
                  <div className={s.rowBetween}>
                    <span>
                      <strong>{target.customer}</strong> owes
                    </span>
                    <span className="num">{target.owedLabel}</span>
                  </div>
                  <div className={c.receiveRule} />
                  <div className={s.rowBetween}>
                    <span>{overpaid ? "Only this much is owed" : "Receiving"}</span>
                    <span className="num">{formatINR(applied)}</span>
                  </div>
                  <div className={s.rowBetween}>
                    <span>Left on their tab</span>
                    <span className="num">{formatINR(owed - applied)}</span>
                  </div>
                  {shop.receivePlan && (
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600 }}>
                      {shop.receivePlan.cleared > 0 &&
                        `${shop.receivePlan.cleared} ${shop.receivePlan.cleared === 1 ? "bill" : "bills"} cleared`}
                      {shop.receivePlan.partial &&
                        `${shop.receivePlan.cleared > 0 ? " · " : ""}1 part-paid (${formatINR(shop.receivePlan.partial.paid)} paid, ${formatINR(shop.receivePlan.partial.left)} still owed)`}
                      {shop.receivePlan.untouched > 0 &&
                        ` · ${shop.receivePlan.untouched} pending`}
                    </div>
                  )}
                  {/* The common case is clearing the lot, so it is one tap. */}
                  {typedAmount !== owed && (
                    <button
                      type="button"
                      className={c.receiveAll}
                      onClick={() => shop.setFormAmount(String(owed))}
                    >
                      Receive all {target.owedLabel}
                    </button>
                  )}
                </div>
              ) : shop.formCustomer.trim() !== "" ? (
                <div className={c.newNote}>
                  <strong>{shop.formCustomer.trim()}</strong> has nothing owing — money back can
                  only be recorded against credit already given.
                </div>
              ) : null}
            </div>
          )}

          {paying && (
            <div style={{ marginBottom: 14 }}>
              <div className={s.fieldLabel}>Shop</div>
              <div className={c.lookup}>
                <input
                  className={s.input}
                  type="text"
                  placeholder="Pick a shop or type a new one"
                  value={supplierName}
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    setSupplierOpen(true);
                  }}
                  onFocus={() => setSupplierOpen(true)}
                  onBlur={() => setSupplierOpen(false)}
                  onKeyDown={(e) => e.key === "Escape" && setSupplierOpen(false)}
                  aria-label="Shop"
                  autoComplete="off"
                />
                {supplierOpen && supplierList.length > 0 && (
                  <div className={c.lookupList} role="listbox">
                    {supplierList.map((m) => (
                      <button
                        key={m.supplier}
                        type="button"
                        className={c.lookupItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSupplierName(m.supplier);
                          setSupplierOpen(false);
                        }}
                      >
                        <span className={`${s.truncate} ${c.lookupName}`}>{m.supplier}</span>
                        <span className={c.lookupMeta}>
                          {m.balance > 0 ? `${m.balanceLabel} due` : "all settled"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {supplierKnown ? (
                <div className={c.receiveNote}>
                  <div className={s.rowBetween}>
                    <span>
                      <strong>{supplierKnown.supplier}</strong> is owed
                    </span>
                    <span className="num">{supplierKnown.balanceLabel}</span>
                  </div>
                  {supplierOwed > 0 && supplierAmount !== supplierOwed && (
                    <button
                      type="button"
                      className={c.receiveAll}
                      onClick={() => shop.setFormAmount(String(supplierOwed))}
                    >
                      Pay all {supplierKnown.balanceLabel}
                    </button>
                  )}
                </div>
              ) : supplierName.trim() !== "" ? (
                <div className={c.newNote}>
                  New shop — <strong>{supplierName.trim()}</strong> will be added when you tap
                  Bought.
                </div>
              ) : null}

              <div className={s.fieldLabel} style={{ marginTop: 12 }}>
                What was bought (optional)
              </div>
              <input
                className={s.input}
                type="text"
                placeholder="e.g. Milk crates x20"
                value={supplierItem}
                onChange={(e) => setSupplierItem(e.target.value)}
                aria-label="What was bought"
                autoComplete="off"
              />
            </div>
          )}

          {paying ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className={s.primaryButton}
                disabled={supplierName.trim() === "" || supplierAmount <= 0}
                onClick={() => {
                  if (shop.buyFromSupplier(supplierName, supplierItem, supplierAmount)) {
                    shop.setFormAmount("");
                    setSupplierItem("");
                  }
                }}
              >
                Bought {supplierAmount > 0 ? formatINR(supplierAmount) : ""}
              </button>
              <button
                type="button"
                className={s.primaryButton}
                style={{ background: "var(--success)" }}
                disabled={!supplierKnown || supplierOwed <= 0 || supplierAmount <= 0}
                onClick={() => {
                  if (supplierKnown && shop.paySupplier(supplierKnown.supplier, supplierPay) > 0) {
                    shop.setFormAmount("");
                  }
                }}
              >
                Paid {supplierAmount > 0 && supplierOwed > 0 ? formatINR(supplierPay) : ""}
              </button>
            </div>
          ) : receiving ? (
            <button
              type="button"
              className={s.primaryButton}
              disabled={!canReceive}
              onClick={shop.saveReceived}
            >
              <IconPlus size={16} color="#fff" />
              {canReceive ? `Record ${formatINR(applied)} received` : "Record received"}
            </button>
          ) : (
            <button type="button" className={s.primaryButton} onClick={shop.saveBill}>
              <IconPlus size={16} color="#fff" />
              Add Bill
            </button>
          )}
          {sale && !shop.editingBillId && (
            <button type="button" className={c.itemsButton} onClick={() => setPickerOpen(true)}>
              Add from items
            </button>
          )}
        </div>
      </div>
    </section>
  );

  const paymentCard = (
    <section className={s.card}>
      <button
        type="button"
        className={c.paymentHeader}
        onClick={() => setPaymentOpen(!paymentOpen)}
        aria-expanded={paymentOpen}
      >
        <span className={s.cardTitle}>How it was paid</span>
        <span className={`${c.paymentChevron} ${paymentOpen ? c.summaryToggleOpen : ""}`}>
          <IconChevron size={18} color="currentColor" />
        </span>
      </button>
      {paymentOpen && <div className={s.stack} style={{ marginTop: 14 }}>
        {[
          ...shop.paymentSplit.map((m) => ({
            id: m.id as string,
            label: m.label,
            note: m.note,
            color: m.color,
            amountLabel: m.amountLabel,
            amount: Number(m.amountLabel.replace(/[^0-9.]/g, "")),
          })),
          {
            id: "received",
            label: "Received",
            note:
              shop.viewReceived.total > 0
                ? `Old credit paid back · Cash ${formatINR(shop.viewReceived.cash)} · UPI ${formatINR(shop.viewReceived.upi)}`
                : "Old credit paid back",
            color: "#7A4BC7",
            amountLabel: formatINR(shop.viewReceived.total),
            amount: shop.viewReceived.total,
          },
          {
            id: "expense",
            label: "Expense",
            note: "Paid out of the shop",
            color: "var(--danger)",
            amountLabel: formatINR(shop.viewExpensesPaid),
            amount: shop.viewExpensesPaid,
          },
        ].map((m) => ({
          ...m,
          pct: shop.viewCollected > 0 ? Math.min(100, Math.round((m.amount / shop.viewCollected) * 100)) : 0,
        })).map((m) => (
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
      </div>}
    </section>
  );

  /* Rebuilt only when the day's entries change. The keypad moves `shop` on
     every key press, and redrawing a few hundred rows each time is what made
     the keys feel slow. */
  const entries = useMemo(() => (
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

      {shop.viewEntries.length > 0 ? (
        <>
          <div className={c.entriesList} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shop.viewEntries.map((b) =>
              b.kind === "sale" ? (
                shop.editingBillId === b.id ? (
                  <BillRowEditor key={b.id} shop={shop} />
                ) : (
                  <div key={b.id} className={`${s.cardSm} ${c.billRow}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "var(--text-faint)",
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
                        onClick={() =>
                          ask({
                            title: `Delete this ${b.modeLabel.toLowerCase()} bill?`,
                            detail: `${b.desc} · ${b.amountLabel} · ${b.catLabel}, ${b.time}.`,
                            warning:
                              b.mode === "credit" && (b.creditPayments?.length ?? 0) > 0
                                ? "Everything this customer has repaid against it goes with it."
                                : undefined,
                            onConfirm: () => shop.deleteBill(b.id),
                          })
                        }
                        aria-label={`Delete ${b.desc}`}
                      >
                        <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                          <IconTrash size={13} color="var(--danger)" />
                        </span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div key={b.id} className={`${s.cardSm} ${c.billRow}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "var(--text-faint)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div className={s.truncate} style={{ fontSize: 13, fontWeight: 700 }}>
                        Received
                      </div>
                      <div className={c.billMeta}>
                        <span className={c.modeBadge} style={{ background: RECEIVED_BADGE }}>
                          {b.modeLabel}
                        </span>
                        <span
                          className={s.truncate}
                          style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}
                        >
                          {b.customer} · {b.time}
                          {b.summary ? ` · ${b.summary}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {editingPaymentId === b.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <input
                        className="num"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={editPaymentAmount}
                        onChange={(e) => setEditPaymentAmount(e.target.value)}
                        aria-label={`Amount received from ${b.customer}`}
                        autoFocus
                        style={{
                          width: 72,
                          padding: "4px 6px",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      />
                      <button
                        type="button"
                        className={`${s.linkButton} tap`}
                        onClick={() => {
                          const amt = parseFloat(editPaymentAmount);
                          if (amt > 0 && shop.editCreditPayment(b.billId, b.id, amt)) {
                            setEditingPaymentId(null);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={`${s.linkButton} tap`}
                        style={{ color: "var(--text-muted)" }}
                        onClick={() => setEditingPaymentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <div className="num" style={{ fontSize: 14, paddingRight: 6 }}>
                        {b.amountLabel}
                      </div>
{b.parts.length === 1 && (
                      <button
                        type="button"
                        className={s.rowAction}
                        onClick={() => {
                          setEditingPaymentId(b.id);
                          setEditPaymentAmount(String(b.amount));
                        }}
                        aria-label={`Edit payment from ${b.customer}`}
                      >
                        <span className={s.rowActionInner}>
                          <IconPencil size={13} color="var(--text-muted)" />
                        </span>
                      </button>
)}
                      <button
                        type="button"
                        className={s.rowAction}
                        onClick={() =>
                          ask({
                            title: "Delete this repayment?",
                            detail: `${b.amountLabel} from ${b.customer} · ${b.time}.`,
                            warning:
                              b.parts.length > 1
                                ? `This was spread over ${b.parts.length} bills; all of it is removed.`
                                : undefined,
                            onConfirm: () => b.parts.forEach((x) => shop.deleteCreditPayment(x.billId, x.id)),
                          })
                        }
                        aria-label={`Delete payment from ${b.customer}`}
                      >
                        <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                          <IconTrash size={13} color="var(--danger)" />
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          <div className={c.closingRow} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>
              {shop.isTodayView ? "Closing total" : "Day total"}
            </div>
            <div className="num" style={{ fontSize: 24, color: "var(--primary-dark)" }}>
              {formatINR(shop.viewCollected)}
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
  ), [
    shop.viewEntries,
    shop.viewCount,
    shop.viewCollected,
    shop.isTodayView,
    shop.selectedDay,
    shop.editingBillId,
    shop.editBill,
    shop.deleteBill,
    shop.editCreditPayment,
    shop.deleteCreditPayment,
    /* The row being edited reads the live form, so it must follow it. */
    shop.editingBillId ? shop : null,
    editingPaymentId,
    editPaymentAmount,
    ask,
  ]);

  return (
    <div>
      <div className={c.layout}>
      {/* Date filter — each card carries that day's total, so you can often
          read what you need without opening the day at all. On a wide screen
          it sits over the right-hand column, so the form on the left starts at
          the top of the page instead of a strip's height down it. */}
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

        <div className={c.leftCol} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Only the summary and form scroll on a tablet — "Close the day" stays
              outside this wrapper so it can never end up scrolled out of sight
              inside the capped column below. */}
          <div className={c.leftColScroll}>
          {/* Two halves — the day's total, and where that money sits. Stacked on
              a phone; side by side once there is width, which halves the height
              and lets the form below stay on screen. */}
          <section className={`${s.banner} ${s.bannerPrimary} ${summaryOpen ? c.summary : ""} ${c.summaryCard}`}>
            <button
              type="button"
              className={c.summaryHeader}
              onClick={() => setSummaryOpen(!summaryOpen)}
              aria-expanded={summaryOpen}
            >
              <span className={s.bannerLabel} style={{ fontSize: 14, fontWeight: 600 }}>
                {shop.isTodayView
                  ? "Total collected today"
                  : `Total collected ${shop.selectedDay.long}`}
              </span>
              <span className={`${c.summaryChevron} ${summaryOpen ? c.summaryToggleOpen : ""}`}>
                <IconChevron size={18} color="currentColor" />
              </span>
            </button>
            {summaryOpen && (
              <div className={c.summaryTotal}>
                <div className={`num ${s.bannerValue}`}>{formatINR(shop.viewCollected)}</div>
                <div className={s.bannerLabel}>
                  {shop.viewCount} {shop.viewCount === 1 ? "bill" : "bills"}
                  {shop.isTodayView ? " today" : ""}
                </div>
              </div>
            )}
            {summaryOpen && <div className={s.bannerRule} />}
            {summaryOpen && <div className={c.summarySplit}>
            <div className={s.rowBetween}>
              <div className={s.bannerLabel}>Cash in drawer</div>
              <div className="num" style={{ fontSize: 20, color: "#fff" }}>
                {formatINR(shop.cashInDrawer)}
              </div>
            </div>
            {/* Show the working, so a drawer smaller than the day's cash sales
                reads as money spent rather than money missing. */}
            {(shop.viewOpening > 0 || shop.viewExpensesPaid > 0 || shop.viewReceived.cash > 0) && (
              <div className={s.rowBetween} style={{ marginTop: 4 }}>
                <div className={s.bannerLabel}>
                  {shop.viewOpening > 0 ? `${formatINR(shop.viewOpening)} from yesterday + ` : ""}
                  {formatINR(shop.viewCashSales + shop.viewReceived.cash)} cash in,{" "}
                  {formatINR(shop.viewExpensesPaid)} spent
                </div>
              </div>
            )}
            {shop.creditTotal > 0 && (
              <div className={s.rowBetween} style={{ marginTop: 8 }}>
                <div className={s.bannerLabel}>On credit — to collect</div>
                <div className="num" style={{ fontSize: 16, color: "var(--accent-gold-soft)" }}>
                  {formatINR(shop.creditTotal)}
                </div>
              </div>
            )}
            </div>}
          </section>

          {showForm && form}
          </div>

          {/* Below the entry form, so it is at hand without opening the summary. */}
          <DayClosing shop={shop} light />
        </div>

        <div className={c.rightCol} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {paymentCard}
          {entries}
        </div>
      </div>
      {dialog}
      {pickerOpen && <ItemPicker shop={shop} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
