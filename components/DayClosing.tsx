"use client";

import { useEffect, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatDateKey, formatINR } from "@/lib/format";
import {
  closeDay,
  differenceColor,
  differenceLabel,
  loadClosings,
  reopenDay,
  type Closing,
} from "@/lib/closings";
import { useConfirm } from "./ConfirmDialog";
import s from "./shared.module.css";
import c from "./DayClosing.module.css";

/**
 * The end-of-day count. The owner enters what is actually in the drawer; the
 * app sets it against what the books say should be there and keeps both.
 */
export default function DayClosing({ shop, light = false }: { shop: Shop; light?: boolean }) {
  const date = shop.selectedDate;
  const [closing, setClosing] = useState<Closing | null>(null);
  const [setup, setSetup] = useState(false);
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [takenOut, setTakenOut] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { ask, dialog } = useConfirm();

  useEffect(() => {
    let live = true;
    setOpen(false);
    setError("");
    loadClosings().then((r) => {
      if (!live || !r) return;
      setSetup(r.setup);
      setClosing(r.closings.find((x) => x.date === date) ?? null);
    });
    return () => {
      live = false;
    };
  }, [date]);

  const expected = shop.cashInDrawer;
  const typed = parseFloat(counted);
  const valid = !Number.isNaN(typed) && typed >= 0;
  const preview = valid ? typed - expected : null;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError("");
    const r = await closeDay(date, typed, note, takenOut === "" ? 0 : parseFloat(takenOut));
    setSaving(false);
    if (r.error || !r.closing) {
      setError(r.error ?? "Could not close the day");
      return;
    }
    setClosing(r.closing);
    setOpen(false);
    setCounted("");
    setNote("");
    setTakenOut("");
  }

  async function reopen() {
    const problem = await reopenDay(date);
    if (problem) {
      setError(problem);
      return;
    }
    setClosing(null);
    setError("");
  }

  const form = (
    <div className={c.backdrop} onClick={() => setOpen(false)} role="presentation">
      <div
        className={`${c.modal} ${c.light}`}
        role="dialog"
        aria-modal="true"
        aria-label="Count the drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={c.title}>Count the drawer · {formatDateKey(date)}</div>
        <div className={c.line}>The books say it should hold {formatINR(expected)}.</div>
        <input
          className={`num ${c.input}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Amount counted"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          aria-label="Amount counted in the drawer"
          autoFocus
        />
        {preview !== null && (
          <div className={c.preview} style={{ color: differenceColor(preview) }}>
            {differenceLabel(preview, formatINR)}
          </div>
        )}
        <div className={c.hint}>
          <strong>Short</strong> means the drawer holds less cash than the books say. <strong>Over</strong>{" "}
          means more.
        </div>
        <input
          className={`num ${c.input}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="Cash taken out or banked (optional)"
          value={takenOut}
          onChange={(e) => setTakenOut(e.target.value)}
          aria-label="Cash taken out of the drawer"
        />
        {valid && (
          <div className={c.hint}>
            Left in the drawer for tomorrow:{" "}
            <strong>{formatINR(Math.max(0, typed - (parseFloat(takenOut) || 0)))}</strong>
          </div>
        )}
        <input
          className={c.input}
          type="text"
          placeholder="Note (optional), e.g. gave change to a customer"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Note"
          maxLength={255}
        />
        {error && <div className={c.error}>{error}</div>}
        {setup && (
          <div className={c.error}>
            Daily closing is not set up on the database yet (db/daily-closings.sql).
          </div>
        )}
        <div className={c.actions}>
          <button type="button" className={c.save} disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : "Close the day"}
          </button>
          <button type="button" className={c.cancel} onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${c.box} ${light ? c.light : ""}`}>
      {closing ? (
        <>
          <div className={c.head}>
            <span className={c.title}>Day closed · {formatDateKey(closing.date)}</span>
            <span className={c.diff} style={{ color: differenceColor(closing.difference) }}>
              {differenceLabel(closing.difference, formatINR)}
            </span>
          </div>
          <div className={c.line}>
            Counted {formatINR(closing.counted)} · expected {formatINR(closing.expected)}
          </div>
          <div className={c.line}>
            Left for tomorrow {formatINR(closing.counted - (closing.takenOut ?? 0))}
            {closing.takenOut > 0 ? ` · ${formatINR(closing.takenOut)} taken out` : ""}
          </div>
          {closing.note && <div className={c.line}>“{closing.note}”</div>}
          <div className={c.actions}>
            <button type="button" className={c.link} onClick={() => setOpen(true)}>
              Count again
            </button>
            <button
              type="button"
              className={`${c.link} ${c.undo}`}
              onClick={() =>
                ask({
                  title: "Reopen this day?",
                  detail: `The count for ${formatDateKey(closing.date)} (${formatINR(closing.counted)} counted, ${differenceLabel(closing.difference, formatINR)}) will be removed. Nothing else changes.`,
                  onConfirm: reopen,
                })
              }
            >
              Undo — reopen the day
            </button>
          </div>
          {error && <div className={c.error}>{error}</div>}
        </>
      ) : (
        <button type="button" className={c.closeButton} onClick={() => setOpen(true)}>
          Close the day · count the drawer
        </button>
      )}
      {open && form}
      {dialog}
    </div>
  );
}
