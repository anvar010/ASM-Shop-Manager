"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Shop } from "@/lib/useShop";
import { formatINR, groupIN, groupTyped } from "@/lib/format";
import { UNITS, costOf, isCount, isUnit, unitsLike, type UnitId } from "@/lib/units";
import Link from "next/link";
import s2 from "./shared.module.css";
import c from "./CalculatorTab.module.css";
import { useConfirm } from "./ConfirmDialog";
import {
  IconBackspace,
  IconDivide,
  IconMinus,
  IconPlus,
  IconSearch,
  IconTimes,
  IconTrash,
} from "./Icons";

type Op = "+" | "-" | "×" | "÷";

const KEYS: (string | Op)[] = [
  "7", "8", "9", "÷",
  "4", "5", "6", "×",
  "1", "2", "3", "-",
  "0", "00", ".", "+",
];

/* Drawn rather than typed. The signs are punctuation, so a font that lacks a
   proper glyph — or substitutes one at the wrong weight and size — leaves the
   keypad looking broken; these render the same everywhere. */
const OP_ICON: Record<Op, typeof IconPlus> = {
  "+": IconPlus,
  "-": IconMinus,
  "×": IconTimes,
  "÷": IconDivide,
};
const OP_NAME: Record<Op, string> = {
  "+": "Plus",
  "-": "Minus",
  "×": "Times",
  "÷": "Divide",
};
/* The tape and the display are text, so they keep the real minus sign. */
const OP_SIGN: Record<Op, string> = { "+": "+", "-": "−", "×": "×", "÷": "÷" };

/** A line of working: a label, optionally what it came to, and how to read it. */
type TapeLine = { text: string; amount?: string; kind?: "result" };

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
  /* The tape is kept as parts rather than finished strings so it can be set
     out like a bill — what was added down the left, what it came to down the
     right — instead of a column of fragments squashed against one edge. */
  const [tape, setTape] = useState<TapeLine[]>([]);
  const tapeRef = useRef<HTMLDivElement | null>(null);
  const { ask, dialog } = useConfirm();
  /* Which item is asking for a quantity, and what has been typed for it. */
  const [qtyFor, setQtyFor] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  /* Which unit the customer is buying in, which need not be the one the price
     was quoted in — priced by the 100 gram, bought by the kilo. */
  const [qtyUnit, setQtyUnit] = useState<UnitId | null>(null);
  /* Narrows the list to one heading. Local rather than shared state: filtering
     while ringing up a customer should not disturb the add form. */
  const [listCategory, setListCategory] = useState("");
  /* Mirrors the column count in CalculatorTab.module.css. The quantity panel is
     full width, and a grid cannot start a wide cell mid-row — placing it inside
     the card left a hole beside every second item — so it is emitted after the
     row that holds the tapped card instead. */
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1280px)");
    const sync = () => setCols(wide.matches ? 3 : 2);
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);

  const value = Number(entry) || 0;

  /* A heading that the search has already emptied stops being an option, so a
     stale chip falls back to showing everything rather than nothing. */
  const visibleGroups = shop.priceGroups.filter(
    (g) => listCategory === "" || g.category === listCategory,
  );
  const shownCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

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
      setTape((t) => [...t.slice(-9), { text: `${groupIN(value)} ${OP_SIGN[next]}` }]);
      setAcc(running);
      setOp(next);
      setEntry(String(Number(running.toFixed(2))));
      setFresh(true);
    },
    [acc, op, value],
  );

  const equals = useCallback(() => {
    if (acc === null || op === null) return;
    const result = apply(acc, value, op);
    setTape((t) => [
      ...t.slice(-9),
      { text: `${groupIN(value)} =` },
      { text: "Total", amount: groupIN(result), kind: "result" },
    ]);
    setEntry(String(Number(result.toFixed(2))));
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

  /* A line from the price list is added to the running total, not swapped in
     for it — a basket is what someone is building when they use these
     together, and 0 + the first line gives the right answer anyway. */
  const addLine = useCallback(
    (amount: number, label: string) => {
      const running = acc !== null && op !== null ? apply(acc, value, op) : value;
      const next = running + amount;
      setTape((t) => [...t.slice(-9), { text: label, amount: `+${groupIN(amount)}` }]);
      setEntry(String(Number(next.toFixed(2))));
      setAcc(null);
      setOp(null);
      setFresh(true);
    },
    [acc, op, value],
  );

  /* New working is written at the bottom, so that is what should be in view. */
  useEffect(() => {
    const el = tapeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [tape]);

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
      // Escape belongs to the quantity panel while one is open.
      else if (e.key === "Escape" && !qtyFor) clear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, chooseOp, equals, back, clear, qtyFor]);

  /* Tapping away puts the panel down. Anything the panel owns — its own card
     included — is marked, so a press inside it is not "outside". */
  useEffect(() => {
    if (!qtyFor) return;

    function onDown(e: PointerEvent) {
      const el = e.target as Element | null;
      if (el?.closest?.("[data-qty]")) return;
      setQtyFor(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setQtyFor(null);
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [qtyFor]);

  /* A plain function, not a component: a component declared here would be a new
     type on every render, remounting the input and losing the caret. */
  function qtyPanel(p: (typeof shop.priceRows)[number]) {
    const options = unitsLike(p.unit);
    const chosen = qtyUnit ?? (isUnit(p.unit) ? p.unit : null);
    const n = parseFloat(qty) || 0;
    const total = chosen ? costOf(n, chosen, p.price, p.perQty ?? 1, p.unit) : n * p.price;
    const shown = chosen ? UNITS[chosen].short : (p.unit ?? "");

    return (
      <div className={c.qtyPanel} data-qty>
        {/* The panel sits below the row rather than inside the card, so it says
            which item it is asking about. */}
        <div className={c.qtyHead}>
          <span className={`${s2.truncate} ${c.qtyHeadName}`}>{p.name}</span>
          <span className={`num ${c.qtyHeadPrice}`}>
            {p.priceLabel}
            <span className={c.priceUnit}> / {p.perLabel}</span>
          </span>
        </div>

        <div className={c.qtyRow}>
          <input
            className={`num ${c.qtyInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            step={isCount(chosen) ? "1" : "0.01"}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="How much"
            autoFocus
          />
          {/* Only the units this item can be measured in: a packet is not a
              number of grams. */}
          {options.length > 1 ? (
            <div className={c.unitPick}>
              {options.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`${c.unitChip} ${chosen === u ? c.unitChipOn : ""}`}
                  onClick={() => setQtyUnit(u)}
                >
                  {UNITS[u].short}
                </button>
              ))}
            </div>
          ) : (
            <span className={c.qtyUnit}>{shown}</span>
          )}
        </div>

        {/* Eggs do not come in quarters. Fractions are offered for anything
            weighed or measured, and withheld from anything counted. */}
        <div className={c.qtyQuick}>
          {(isCount(chosen) ? ["1", "2", "5", "10", "12", "30"] : ["0.25", "0.5", "1", "2", "5", "10"]).map((q) => (
            <button
              key={q}
              type="button"
              className={`${c.qtyChip} ${qty === q ? c.qtyChipOn : ""}`}
              onClick={() => setQty(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <div className={c.qtyTotal}>
          <span className={c.qtySum}>
            {n} {shown} at {p.priceLabel} / {p.perLabel}
          </span>
          <span className={`num ${c.qtyAmount}`}>{formatINR(total)}</span>
        </div>

        <button
          type="button"
          className={c.qtyAdd}
          disabled={!(n > 0)}
          onClick={() => {
            addLine(total, `${n} ${shown} ${p.name}`);
            setQtyFor(null);
          }}
        >
          <IconPlus size={14} color="currentColor" />
          Add to total
        </button>
      </div>
    );
  }

  return (
    <div className={c.layout}>
      {/* ---------------- Calculator ---------------- */}
      <section className={`${s2.card} ${c.calcCard}`}>
        <div className={c.tape} ref={tapeRef}>
          {tape.length === 0 ? (
            <span className={c.tapeEmpty}>Add up a basket, or tap a price to bring it over</span>
          ) : (
            tape.map((line, i) => (
              <div
                key={i}
                className={`${c.tapeLine} ${line.amount ? "" : c.tapeStep} ${
                  line.kind === "result" ? c.tapeResult : ""
                }`}
              >
                <span className={`${s2.truncate} ${c.tapeText}`}>{line.text}</span>
                {line.amount && <span className={`num ${c.tapeAmount}`}>{line.amount}</span>}
              </div>
            ))
          )}
        </div>

        <div className={c.display}>
          <span className={c.displayOp}>{op ? OP_SIGN[op] : ""}</span>
          <span className={`num ${c.displayValue}`}>{groupTyped(entry)}</span>
        </div>

        <div className={c.keys}>
          <button type="button" className={`${c.key} ${c.keyWide}`} onClick={clear}>
            Clear
          </button>
          <button type="button" className={c.key} onClick={back} aria-label="Backspace">
            <IconBackspace size={19} color="var(--text-muted)" />
          </button>

          {KEYS.map((k) =>
            ["+", "-", "×", "÷"].includes(k) ? (
              <button
                key={k}
                type="button"
                className={`${c.key} ${c.keyOp}`}
                onClick={() => chooseOp(k as Op)}
                aria-label={OP_NAME[k as Op]}
              >
                {(() => {
                  const Sign = OP_ICON[k as Op];
                  return <Sign size={22} color="currentColor" />;
                })()}
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
              {shownCount} {shownCount === 1 ? "item" : "items"}
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

          {/* Only headings that actually hold something, so the filter never
              offers a category with nothing behind it. */}
          {shop.priceGroups.length > 1 && (
            <div className={c.filterRow}>
              <button
                type="button"
                className={`${c.filterChip} ${listCategory === "" ? c.filterOn : ""}`}
                onClick={() => setListCategory("")}
              >
                All
              </button>
              {shop.priceGroups.map((g) => (
                <button
                  key={g.category}
                  type="button"
                  className={`${c.filterChip} ${listCategory === g.category ? c.filterOn : ""}`}
                  onClick={() => setListCategory(listCategory === g.category ? "" : g.category)}
                >
                  {g.category}
                </button>
              ))}
            </div>
          )}

          {visibleGroups.length > 0 ? (
            <div className={c.groups}>
              {visibleGroups.map((g) => (
                <div key={g.category}>
                  <div className={c.groupHead}>
                    {g.category}
                    <span className={c.groupCount}>{g.items.length}</span>
                  </div>
                  <div className={c.priceList}>
                    {g.items.map((p, i) => {
                      /* The panel belongs to the row, not to the card: it is
                         emitted after the last card in the row that holds the
                         open item, so nothing beside it is left blank. */
                      const rowStart = i - (i % cols);
                      const endOfRow = i % cols === cols - 1 || i === g.items.length - 1;
                      const openInRow = endOfRow
                        ? g.items.slice(rowStart, i + 1).find((x) => x.id === qtyFor)
                        : undefined;
                      return (
                        <Fragment key={p.id}>
                          <div
                            className={`${c.priceRow} ${
                              qtyFor === p.id ? c.priceRowOpen : ""
                            }`}
                            {...(qtyFor === p.id ? { "data-qty": true } : {})}
                          >
                            <div className={c.priceTop}>
                              <button
                                type="button"
                                className={c.priceMain}
                                onClick={() => {
                                  const opening = qtyFor !== p.id;
                                  setQtyFor(opening ? p.id : null);
                                  setQty("1");
                                  setQtyUnit(isUnit(p.unit) ? p.unit : null);
                                }}
                                title="Add this to the calculator"
                              >
                                <span className={`${s2.truncate} ${c.priceName}`}>{p.name}</span>
                                <span className={`num ${c.priceValue}`}>
                                  {p.priceLabel}
                                  <span className={c.priceUnit}> / {p.perLabel}</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                className={s2.rowAction}
                                onClick={() =>
                                  ask({
                                    title: `Remove ${p.name}?`,
                                    detail: `Listed at ${p.priceLabel}${
                                      p.unit ? ` per ${p.unit}` : ""
                                    }.`,
                                    confirmLabel: "Yes, remove",
                                    onConfirm: () => shop.deletePrice(p.id),
                                  })
                                }
                                aria-label={`Remove ${p.name}`}
                              >
                                <span className={`${s2.rowActionInner} ${s2.rowActionDanger}`}>
                                  <IconTrash size={13} color="var(--danger)" />
                                </span>
                              </button>
                            </div>
                          </div>

                          {openInRow && qtyPanel(openInRow)}
                        </Fragment>
                      );
                    })}
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
      {dialog}
    </div>
  );
}
