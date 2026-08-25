"use client";

import { useState } from "react";
import type { Shop } from "@/lib/useShop";
import { MONTHS_SHORT, formatDateKey } from "@/lib/format";
import { dateKeyOf, TODAY_KEY } from "@/lib/seed";
import k from "./CalendarFilter.module.css";
import { IconChevron } from "./Icons";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** Leading blanks then every day of the month, as a flat cell list. */
function monthCells(year: number, month: number): (string | null)[] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dateKeyOf(new Date(year, month, d)));
  return cells;
}

export default function CalendarFilter({ shop, onDone }: { shop: Shop; onDone: () => void }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const cells = monthCells(cursor.y, cursor.m);
  const { from, to } = shop.ledgerWindow;
  const custom = shop.ledgerRange === "custom";

  function step(by: number) {
    const d = new Date(cursor.y, cursor.m + by, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <>
      {/* Backdrop only shows on phones, where the panel is a centred sheet. */}
      <div className={k.backdrop} onClick={onDone} />
      <div className={k.panel}>
        <div className={k.head}>
          <button
            type="button"
            className={k.navButton}
            onClick={() => step(-1)}
            aria-label="Previous month"
          >
            <span className={k.prevIcon}>
              <IconChevron size={15} color="currentColor" />
            </span>
          </button>
          <div className={k.monthLabel}>
            {MONTHS_SHORT[cursor.m]} {cursor.y}
          </div>
          <button
            type="button"
            className={k.navButton}
            onClick={() => step(1)}
            aria-label="Next month"
          >
            <span className={k.nextIcon}>
              <IconChevron size={15} color="currentColor" />
            </span>
          </button>
        </div>

        <div className={k.weekRow}>
          {WEEKDAY_INITIALS.map((w, i) => (
            <div key={i} className={k.weekCell}>
              {w}
            </div>
          ))}
        </div>

        <div className={k.grid}>
          {cells.map((key, i) => {
            if (!key) return <span key={`b${i}`} />;
            const inRange = custom && from !== "" && key >= from && key <= (to || from);
            const isEdge = custom && (key === from || key === to);
            return (
              <button
                key={key}
                type="button"
                className={[
                  k.day,
                  inRange ? k.dayInRange : "",
                  isEdge ? k.dayEdge : "",
                  key === TODAY_KEY ? k.dayToday : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => shop.pickLedgerDate(key)}
              >
                {Number(key.slice(8))}
                {/* A dot marks a day that actually carries a bill. */}
                {shop.purchaseDates.has(key) && <span className={k.dot} />}
              </button>
            );
          })}
        </div>

        <div className={k.foot}>
          <div className={k.summary}>
            {custom && from
              ? to && to !== from
                ? `${formatDateKey(from)} – ${formatDateKey(to)}`
                : `${formatDateKey(from)} · pick an end date`
              : "Tap a day, then another for a range"}
          </div>
          <div className={k.footActions}>
            <button type="button" className={k.clearButton} onClick={shop.clearLedgerDates}>
              Clear
            </button>
            <button type="button" className={k.doneButton} onClick={onDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
