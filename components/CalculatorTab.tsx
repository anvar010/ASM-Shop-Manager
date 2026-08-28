"use client";

import { useCallback, useEffect, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatINR, groupIN } from "@/lib/format";
import Link from "next/link";
import s2 from "./shared.module.css";
import c from "./CalculatorTab.module.css";
import { IconBackspace, IconPlus, IconSearch, IconTrash } from "./Icons";

type Op = "+" | "-" | "×" | "÷";

const KEYS: (string | Op)[] = [
  "7", "8", "9", "÷",
  "4", "5", "6", "×",
  "1", "2", "3", "-",
  "0", "00", ".", "+",
];

function apply(a: number, b: number, op: Op): number {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "×") return a * b;
  return b === 0 ? a : a / b;
}

export default function CalculatorTab({ shop }: { shop: Shop }) {
  /* `entry` is what is being typed; `acc` is the running total behind it. The
     pair is what lets a shopkeeper chain 20 + 35 + 12 without pressing equals. */
  const [entry, setEntry] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [tape, setTape] = useState<string[]>([]);

  const value = Number(entry) || 0;

  const press = useCallback((key: string) => {
    setFresh(false);
    setEntry((cur) => {
      if (fresh || cur === "0") return key === "." ? "0." : key === "00" ? "0" : key;
      if (key === "." && cur.includes(".")) return cur;
      if (cur.replace(/[^0-9]/g, "").length >= 9) return cur;
      return cur + key;
    });
  }, [fresh]);

  const chooseOp = useCallback(
    (next: Op) => {
      const running = acc === null || op === null ? value : apply(acc, value, op);
      setTape((t) => [...t.slice(-9), `${groupIN(value)} ${next}`]);
      setAcc(running);
      setOp(next);
      setEntry(String(running));
      setFresh(true);
    },
    [acc, op, value],
  );

  const equals = useCallback(() => {
    if (acc === null || op === null) return;
    const result = apply(acc, value, op);
    setTape((t) => [...t.slice(-9), `${groupIN(value)} =`, groupIN(result)]);
    setEntry(String(result));
    setAcc(null);
    setOp(null);
    setFresh(true);
  }, [acc, op, value]);

  const clear = useCallback(() => {
    setEntry("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
    setTape([]);
  }, []);

  const back = useCallback(() => {
    setEntry((cur) => (cur.length <= 1 ? "0" : cur.slice(0, -1)));
  }, []);

  /* A price tapped on the right becomes the next number on the left, which is
     the whole reason the two sit side by side. */
  const useAmount = useCallback((amount: number) => {
    setEntry(String(amount));
    setFresh(false);
  }, []);

  // A tablet has a keyboard often enough that ignoring it would be strange.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (/^[0-9.]$/.test(e.key)) press(e.key);
      else if (e.key === "+") chooseOp("+");
      else if (e.key === "-") chooseOp("-");
      else if (e.key === "*") chooseOp("×");
      else if (e.key === "/") { e.preventDefault(); chooseOp("÷"); }
      else if (e.key === "Enter" || e.key === "=") equals();
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape") clear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, chooseOp, equals, back, clear]);

  return (
    <div className={c.layout}>
      {/* ---------------- Calculator ---------------- */}
      <section className={`${s2.card} ${c.calcCard}`}>
        <div className={c.tape}>
          {tape.length === 0 ? (
            <span className={c.tapeEmpty}>Add up a basket, or tap a price to bring it over</span>
          ) : (
            tape.map((line, i) => (
              <span key={i} className={c.tapeLine}>
                {line}
              </span>
            ))
          )}
        </div>

        <div className={c.display}>
          <span className={c.displayOp}>{op ?? ""}</span>
          <span className={`num ${c.displayValue}`}>{groupIN(value)}</span>
        </div>

        <div className={c.keys}>
          <button type="button" className={`${c.key} ${c.keyWide}`} onClick={clear}>
            Clear
          </button>
          <button type="button" className={c.key} onClick={back} aria-label="Backspace">
            <IconBackspace size={19} color="var(--text-muted)" />
          </button>
          <button type="button" className={`${c.key} ${c.keyOp}`} onClick={() => chooseOp("÷")}>
            ÷
          </button>

          {KEYS.map((k) =>
            ["+", "-", "×", "÷"].includes(k) ? (
              <button
                key={k}
                type="button"
                className={`${c.key} ${c.keyOp}`}
                onClick={() => chooseOp(k as Op)}
              >
                {k}
              </button>
            ) : (
              <button key={k} type="button" className={c.key} onClick={() => press(k)}>
                {k}
              </button>
            ),
          )}

          <button type="button" className={`${c.key} ${c.keyEquals}`} onClick={equals}>
            =
          </button>
        </div>
      </section>

      {/* ---------------- Price list ---------------- */}
      <div className={c.priceCol}>
        <Link href="/prices/new" className={c.addButton}>
          <IconPlus size={18} color="currentColor" />
          Add data
        </Link>

        <section className={s2.card}>
          <div className={s2.rowBetween} style={{ marginBottom: 12 }}>
            <div className={s2.cardTitle}>Prices</div>
            <div className={s2.muted}>
              {shop.priceRows.length} {shop.priceRows.length === 1 ? "item" : "items"}
            </div>
          </div>

          <div className={c.searchRow}>
            <IconSearch size={16} color="var(--text-faint)" />
            <input
              className={c.searchInput}
              type="text"
              placeholder="Search an item"
              value={shop.priceSearch}
              onChange={(e) => shop.setPriceSearch(e.target.value)}
              aria-label="Search prices"
            />
          </div>

          {shop.priceRows.length > 0 ? (
            <div className={c.groups}>
              {shop.priceGroups.map((g) => (
                <div key={g.category}>
                  <div className={c.groupHead}>
                    {g.category}
                    <span className={c.groupCount}>{g.items.length}</span>
                  </div>
                  <div className={c.priceList}>
                    {g.items.map((p) => (
                      <div key={p.id} className={c.priceRow}>
                        <button
                          type="button"
                          className={c.priceMain}
                          onClick={() => useAmount(p.price)}
                          title="Bring this price into the calculator"
                        >
                          <span className={`${s2.truncate} ${c.priceName}`}>{p.name}</span>
                          <span className={`num ${c.priceValue}`}>
                            {p.priceLabel}
                            {p.unit ? <span className={c.priceUnit}> /{p.unit}</span> : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={s2.rowAction}
                          onClick={() => shop.deletePrice(p.id)}
                          aria-label={`Remove ${p.name}`}
                        >
                          <span className={`${s2.rowActionInner} ${s2.rowActionDanger}`}>
                            <IconTrash size={13} color="var(--danger)" />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={s2.empty}>
              <div className={s2.emptyTitle}>
                {shop.priceSearch ? "Nothing matches" : "No prices yet"}
              </div>
              <div style={{ fontSize: 12 }}>
                {shop.priceSearch
                  ? "Try a shorter search."
                  : "Use Add data to record what you charge."}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
