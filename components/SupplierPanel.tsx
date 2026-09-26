"use client";

import { useState } from "react";
import Link from "next/link";
import type { Shop } from "@/lib/useShop";
import { formatDateKey, formatINR } from "@/lib/format";
import s from "./shared.module.css";
import c from "./SupplierPanel.module.css";

type Group = Shop["supplierGroups"][number];
type Row = Shop["allPurchaseRows"][number];

interface Event {
  key: string;
  kind: "bought" | "paid";
  ms: number;
  when: string;
  label: string;
  amount: number;
}

/** "26 Sep, 11:43 AM" — or just the day for rows saved before times were kept. */
function stamp(iso: string | undefined, dateKey: string): { ms: number; when: string } {
  if (!iso) return { ms: Date.parse(`${dateKey}T00:00:00`), when: formatDateKey(dateKey) };
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return { ms: d.getTime(), when: `${formatDateKey(dateKey)}, ${time.toUpperCase()}` };
}

/** Pay a shop as a whole, taken off its oldest unpaid load first. */
export function SupplierPayBox({
  shop,
  supplier,
  balance,
  balanceLabel,
}: {
  shop: Shop;
  supplier: string;
  balance: number;
  balanceLabel: string;
}) {
  const [amount, setAmount] = useState("");
  const typed = parseFloat(amount);
  const valid = !Number.isNaN(typed) && typed > 0;
  const paying = valid ? Math.min(typed, balance) : 0;
  if (balance <= 0) return null;

  return (
    <div className={c.payBox}>
      <div className={c.payTitle}>
        Pay {supplier} <span className={c.payDue}>· owed {balanceLabel}</span>
      </div>
      <div className={c.payRow}>
        <input
          className={`num ${c.payInput}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={`Amount, up to ${balanceLabel}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={`Amount paid to ${supplier}`}
        />
        <button
          type="button"
          className={c.payButton}
          disabled={!valid}
          onClick={() => {
            if (shop.paySupplier(supplier, typed) > 0) setAmount("");
          }}
        >
          Pay {valid ? formatINR(paying) : ""}
        </button>
      </div>
      <div className={c.hint}>Comes off the oldest unpaid load first.</div>
    </div>
  );
}

/** Every load bought and every payment made, with when and what was owed after. */
export function SupplierHistory({ rows }: { rows: Row[] }) {
  const events: Event[] = [];
  rows.forEach((r) => {
    const bought = stamp(r.addedAt, r.date);
    events.push({ key: `${r.id}-b`, kind: "bought", ...bought, label: r.item, amount: r.amount });
    if (r.paidUpfront > 0) {
      events.push({
        key: `${r.id}-u`,
        kind: "paid",
        ...bought,
        ms: bought.ms + 1,
        label: `Paid at purchase · ${r.item}`,
        amount: r.paidUpfront,
      });
    }
    r.payments.forEach((p) => {
      events.push({
        key: p.id,
        kind: "paid",
        ...stamp(p.at, p.date),
        label: `Payment · ${r.item}`,
        amount: p.amount,
      });
    });
  });
  events.sort((a, b) => a.ms - b.ms);
  let running = 0;
  const newestFirst = events
    .map((e) => {
      running += e.kind === "bought" ? e.amount : -e.amount;
      return { ...e, balance: Math.max(0, Math.round(running * 100) / 100) };
    })
    .reverse();

  return (
    <div className={c.history}>
      {newestFirst.map((e) => (
        <div key={e.key} className={c.event}>
          <span className={`${c.dot} ${e.kind === "paid" ? c.dotPaid : c.dotBought}`} />
          <div className={c.eventBody}>
            <div className={`${s.truncate} ${c.eventLabel}`}>
              {e.kind === "bought" ? "Bought · " : ""}
              {e.label}
            </div>
            <div className={c.eventWhen}>{e.when}</div>
          </div>
          <div className={c.eventFigures}>
            <div className="num" style={{ color: e.kind === "paid" ? "var(--success)" : "var(--text)" }}>
              {e.kind === "paid" ? "−" : "+"}
              {formatINR(e.amount)}
            </div>
            <div className={c.eventBalance}>owed {formatINR(e.balance)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inside a shop's card on the Supplier tab: pay it, or open its own page. */
export default function SupplierPanel({ shop, g }: { shop: Shop; g: Group }) {
  return (
    <div className={c.panel}>
      <SupplierPayBox
        shop={shop}
        supplier={g.supplier}
        balance={g.balance}
        balanceLabel={g.balanceLabel}
      />
      <Link href={`/supplier/${encodeURIComponent(g.supplier)}`} className={c.historyToggle}>
        Show full history →
      </Link>
    </div>
  );
}
