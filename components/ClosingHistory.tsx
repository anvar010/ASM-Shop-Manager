"use client";

import { useEffect, useState } from "react";
import { formatDateKey, formatINR } from "@/lib/format";
import { differenceColor, differenceLabel, loadClosings, type Closing } from "@/lib/closings";
import s from "./shared.module.css";

/** Every day that has been closed, with what was short or over. */
export default function ClosingHistory() {
  const [rows, setRows] = useState<Closing[] | null>(null);

  useEffect(() => {
    loadClosings().then((r) => setRows(r?.closings ?? []));
  }, []);

  if (rows === null) return null;
  const shown = rows.slice(0, 30);
  const net = shown.reduce((sum, r) => sum + r.difference, 0);

  return (
    <section className={s.card} style={{ marginTop: 12 }}>
      <div className={s.rowBetween} style={{ marginBottom: 12 }}>
        <div className={s.cardTitle}>Daily closings</div>
        {shown.length > 0 && (
          <div className={s.muted} style={{ color: differenceColor(net) }}>
            Last {shown.length}: {differenceLabel(net, formatINR)}
          </div>
        )}
      </div>
      {shown.length === 0 ? (
        <div className={s.muted}>
          No day has been closed yet. Open the summary card on the Bills tab and tap “Close the
          day”.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {shown.map((r) => (
            <div
              key={r.date}
              className={s.rowBetween}
              style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", gap: 12 }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDateKey(r.date)}</div>
                <div className={s.truncate} style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>
                  Counted {formatINR(r.counted)} · expected {formatINR(r.expected)}
                  {r.note ? ` · ${r.note}` : ""}
                </div>
              </div>
              <div
                className="num"
                style={{ fontSize: 13, color: differenceColor(r.difference), flexShrink: 0 }}
              >
                {differenceLabel(r.difference, formatINR)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
