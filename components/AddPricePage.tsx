"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShopContext } from "@/lib/shopContext";
import { formatINR } from "@/lib/format";
import { UNIT_GROUPS, UNITS, isUnit } from "@/lib/units";
import AppShell from "./AppShell";
import s from "./shared.module.css";
import c from "./AddPricePage.module.css";
import { useConfirm } from "./ConfirmDialog";
import PriceRowEditor from "./PriceRowEditor";
import Select from "./Select";
import { IconPencil, IconPlus, IconTrash } from "./Icons";

export default function AddPricePage() {
  const shop = useShopContext();
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  /* What this sitting has added, so a run of entries can be checked without
     leaving the page. */
  const [justAdded, setJustAdded] = useState<{ id: string; label: string }[]>([]);
  const { ask, dialog } = useConfirm();
  /* Filters for the listed items, kept local: the calculator has its own
     search and the two should not move together. */
  const [listSearch, setListSearch] = useState("");
  const [listCategory, setListCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  /* Which heading is being renamed, and what it is being renamed to. */
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState("");

  const name = shop.priceName.trim();
  const amount = parseFloat(shop.priceAmount);
  const perQty = parseFloat(shop.pricePerQty);
  const hasName = name !== "";
  const hasPrice = !Number.isNaN(amount) && amount >= 0;
  const hasQty = !Number.isNaN(perQty) && perQty > 0;
  const ready = hasName && hasPrice && hasQty;
  const unitShort = isUnit(shop.priceUnit) ? UNITS[shop.priceUnit].short : shop.priceUnit;

  const existing = shop.priceRows.find((p) => p.name.toLowerCase() === name.toLowerCase());

  const usedCategories = [
    ...new Set(shop.priceRows.map((p) => p.category?.trim()).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b));

  const listQuery = listSearch.trim().toLowerCase();
  const visible = shop.priceRows.filter(
    (p) =>
      (listCategory === "" || (p.category ?? "") === listCategory) &&
      (listQuery === "" || p.name.toLowerCase().includes(listQuery)),
  );

  function save(andAnother: boolean) {
    const label = `${name} · ${formatINR(amount)} for ${perQty} ${unitShort}`;
    if (!shop.savePrice()) return;
    setJustAdded((prev) => [{ id: `${Date.now()}`, label }, ...prev].slice(0, 8));
    if (andAnother) {
      setNewCategory("");
      setAddingCategory(false);
      return;
    }
    router.push("/");
  }

  /* A new heading is saved as soon as it is named, not when the first item
     lands under it — otherwise it disappears the moment the page is left. */
  function useCategory(value: string) {
    shop.addCategory(value);
    shop.setPriceCategory(value);
    setNewCategory("");
    setAddingCategory(false);
  }

  return (
    <AppShell title="Add an Item" back={{ href: "/", label: "Calculator", tab: "calculator" }}>
      <div className={c.layout}>
        {/* ---------------- The form ---------------- */}
        <div className={c.formCol}>
          <section className={s.card}>
            <div className={c.step}>
              <span className={c.stepNo}>1</span>
              <span className={c.stepLabel}>What is it?</span>
            </div>
            <input
              className={`${s.input} ${c.nameInput}`}
              type="text"
              placeholder="e.g. Basmati Rice 5kg"
              value={shop.priceName}
              onChange={(e) => shop.setPriceName(e.target.value)}
              autoComplete="off"
            />
            {existing && (
              <div className={c.note}>
                Already listed at {existing.priceLabel} for {existing.perLabel} — saving will
                change that price.
              </div>
            )}

            <div className={c.step} style={{ marginTop: 22 }}>
              <span className={c.stepNo}>2</span>
              <span className={c.stepLabel}>Which shelf?</span>
              <span className={c.stepHint}>optional</span>
            </div>
            <div className={c.categoryRow}>
              <Select
                label="Category"
                placeholder="No category"
                value={shop.priceCategory}
                onChange={shop.setPriceCategory}
                groups={[
                  {
                    label: "",
                    options: [
                      { value: "", label: "No category" },
                      ...shop.priceCategories.map((cat) => ({ value: cat, label: cat })),
                    ],
                  },
                ]}
              />
              <button
                type="button"
                className={`${c.chip} ${c.chipAdd}`}
                onClick={() => setAddingCategory(!addingCategory)}
              >
                <IconPlus size={12} color="currentColor" />
                New
              </button>
            </div>

            {addingCategory && (
              <div className={c.newCategory}>
                <input
                  className={s.input}
                  type="text"
                  placeholder="Category name"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategory.trim()) useCategory(newCategory.trim());
                  }}
                  aria-label="New category name"
                  autoFocus
                />
                <button
                  type="button"
                  className={c.useButton}
                  onClick={() => newCategory.trim() && useCategory(newCategory.trim())}
                >
                  Add
                </button>
              </div>
            )}

            <div className={c.step} style={{ marginTop: 22 }}>
              <span className={c.stepNo}>3</span>
              <span className={c.stepLabel}>What does it cost, and for how much?</span>
            </div>

            {/* Quoted the way a shop quotes it — "₹30 for 100 gram" — rather
                than forcing everything to a price for one of something. */}
            <div className={c.quoteRow}>
              <div className={c.amountBox}>
                <span className={c.currency}>₹</span>
                <input
                  className={`num ${c.amountInput}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={shop.priceAmount}
                  onChange={(e) => shop.setPriceAmount(e.target.value)}
                  aria-label="Price"
                />
              </div>
              <span className={c.forWord}>for</span>
              <div className={c.qtyBox}>
                <input
                  className={`num ${c.qtyInput}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  placeholder="1"
                  value={shop.pricePerQty}
                  onChange={(e) => shop.setPricePerQty(e.target.value)}
                  aria-label="Amount that price covers"
                />
                <span className={c.qtyUnit}>
                  {isUnit(shop.priceUnit) ? UNITS[shop.priceUnit].short : shop.priceUnit}
                </span>
              </div>
            </div>

            <div className={c.unitGroups}>
              {UNIT_GROUPS.map((g) => (
                <div key={g.label} className={c.unitGroup}>
                  <div className={c.unitLabel}>{g.label}</div>
                  <div className={c.chipWrap}>
                    {g.units.map((u) => (
                      <button
                        key={u}
                        type="button"
                        className={`${c.chip} ${shop.priceUnit === u ? c.chipActive : ""}`}
                        onClick={() => shop.setPriceUnit(u)}
                      >
                        {UNITS[u].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Both actions sit where the typing finishes. Nothing states
                what is about to be saved, because the fields above already
                do — a panel repeating them is one more thing to read. */}
            {/* One action only: prices are entered in runs, and leaving is
                what the back link is for. */}
            <div className={c.actions}>
              <button
                type="button"
                className={c.saveButton}
                onClick={() => save(true)}
                disabled={!ready}
              >
                <IconPlus size={16} color="currentColor" />
                {existing ? "Update and add another" : "Save and add another"}
              </button>
            </div>
            {ready ? (
              <div className={c.summary}>
                <strong>{name}</strong>
                {shop.priceCategory ? ` · ${shop.priceCategory}` : ""} — {formatINR(amount)} for{" "}
                {perQty} {unitShort}
              </div>
            ) : (
              <div className={c.missing}>
                {!hasName ? "Give the item a name" : !hasPrice ? "Set a price" : "Say how much that covers"}{" "}
                before saving.
              </div>
            )}
          </section>
        </div>

        {/* ---------------- Preview and what has been added ---------------- */}
        <div className={c.sideCol}>
          {justAdded.length > 0 && (
            <section className={s.card}>
              <div className={s.rowBetween} style={{ marginBottom: 10 }}>
                <div className={s.cardTitle}>Added just now</div>
                <div className={s.muted}>{justAdded.length}</div>
              </div>
              <div className={c.addedList}>
                {justAdded.map((a) => (
                  <div key={a.id} className={c.addedRow}>
                    {a.label}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------------- Categories ---------------- */}
          {shop.categoryUse.length > 0 && (
            <section className={s.card}>
              <div className={s.rowBetween} style={{ marginBottom: 10 }}>
                <div className={s.cardTitle}>Categories</div>
                <div className={s.muted}>{shop.categoryUse.length}</div>
              </div>

              <div className={c.catList}>
                {shop.categoryUse.map((cat) => {
                  const draft = catDraft.trim();
                  const merges =
                    draft !== "" &&
                    draft.toLowerCase() !== cat.name.toLowerCase() &&
                    shop.categoryUse.some((o) => o.name.toLowerCase() === draft.toLowerCase());

                  return editingCat === cat.name ? (
                    <div key={cat.name} className={c.catEditor}>
                      <input
                        className={s.input}
                        type="text"
                        value={catDraft}
                        onChange={(e) => setCatDraft(e.target.value)}
                        aria-label={`Rename ${cat.name}`}
                        autoFocus
                      />
                      {/* Renaming onto a heading that exists is a merge, which
                          is useful — "Tea" and "Tea powder" — but it should be
                          said out loud before it happens. */}
                      {merges && (
                        <div className={c.catNote}>
                          Everything in {cat.name} joins {draft}.
                        </div>
                      )}
                      <div className={c.catEditorActions}>
                        <button
                          type="button"
                          className={c.catCancel}
                          onClick={() => setEditingCat(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className={c.catSave}
                          disabled={draft === "" || draft === cat.name}
                          onClick={() => {
                            shop.renameCategory(cat.name, draft);
                            if (listCategory === cat.name) setListCategory(draft);
                            setEditingCat(null);
                          }}
                        >
                          {merges ? "Merge" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={cat.name} className={c.catRow}>
                      <div className={c.catMain}>
                        <span className={`${s.truncate} ${c.catName}`}>{cat.name}</span>
                        <span className={c.catCount}>
                          {cat.count} {cat.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={s.rowAction}
                        onClick={() => {
                          setEditingCat(cat.name);
                          setCatDraft(cat.name);
                        }}
                        aria-label={`Rename ${cat.name}`}
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
                            title: `Remove the ${cat.name} category?`,
                            detail: `Its ${cat.count} ${
                              cat.count === 1 ? "item stays" : "items stay"
                            } on the price list and move under Uncategorised.`,
                            confirmLabel: "Yes, remove",
                            onConfirm: () => {
                              shop.clearCategory(cat.name);
                              if (listCategory === cat.name) setListCategory("");
                            },
                          })
                        }
                        aria-label={`Remove ${cat.name}`}
                      >
                        <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                          <IconTrash size={13} color="var(--danger)" />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className={s.card}>
            <div className={s.rowBetween} style={{ marginBottom: 12 }}>
              <div className={s.cardTitle}>Already listed</div>
              <div className={s.muted}>
                {visible.length === shop.priceRows.length
                  ? shop.priceRows.length
                  : `${visible.length} of ${shop.priceRows.length}`}
              </div>
            </div>

            {shop.priceRows.length > 0 && (
              <>
                <input
                  className={`${s.input} ${c.listSearch}`}
                  type="text"
                  placeholder="Search listed items"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label="Search listed items"
                />
                {/* Only the categories actually in use, so the filter never
                    offers a heading with nothing behind it. */}
                <div className={c.filterRow}>
                  <button
                    type="button"
                    className={`${c.filterChip} ${listCategory === "" ? c.filterOn : ""}`}
                    onClick={() => setListCategory("")}
                  >
                    All
                  </button>
                  {usedCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${c.filterChip} ${listCategory === cat ? c.filterOn : ""}`}
                      onClick={() => setListCategory(listCategory === cat ? "" : cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}

            {visible.length > 0 ? (
              <div className={c.existingList}>
                {visible.map((p) =>
                  editingId === p.id ? (
                    <PriceRowEditor
                      key={p.id}
                      item={p}
                      categories={shop.priceCategories}
                      takenNames={shop.priceRows
                        .filter((o) => o.id !== p.id)
                        .map((o) => o.name)}
                      onSave={(next) => {
                        shop.updatePrice(next);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                  <div key={p.id} className={c.existingRow}>
                    <div className={c.existingText}>
                      <span className={`${s.truncate} ${c.existingName}`}>{p.name}</span>
                      <span className={c.existingMeta}>
                        {p.priceLabel} for {p.perLabel}
                        {p.category ? ` · ${p.category}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => setEditingId(p.id)}
                      aria-label={`Edit ${p.name}`}
                    >
                      <span className={s.rowActionInner}>
                        <IconPencil size={12} color="var(--text-muted)" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() =>
                        ask({
                          title: `Remove ${p.name}?`,
                          detail: `Listed at ${p.priceLabel} for ${p.perLabel}.`,
                          confirmLabel: "Yes, remove",
                          onConfirm: () => shop.deletePrice(p.id),
                        })
                      }
                      aria-label={`Remove ${p.name}`}
                    >
                      <span className={`${s.rowActionInner} ${s.rowActionDanger}`}>
                        <IconTrash size={12} color="var(--danger)" />
                      </span>
                    </button>
                  </div>
                  ),
                )}
              </div>
            ) : (
              <div className={s.muted}>
                {shop.priceRows.length === 0
                  ? "Nothing yet — this is the first."
                  : "Nothing matches that."}
              </div>
            )}
          </section>
        </div>
      </div>
      {dialog}
    </AppShell>
  );
}
