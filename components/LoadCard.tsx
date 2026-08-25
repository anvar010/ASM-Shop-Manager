"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Shop } from "@/lib/useShop";
import { formatINR } from "@/lib/format";
import s from "./shared.module.css";
import l from "./LoadCard.module.css";
import { IconPencil, IconPlus, IconTrash } from "./Icons";

export type LoadRow = Shop["purchaseRows"][number];

/**
 * One wholesale bill. Status leads as a badge rather than a third figure
 * column, and the actions sit on one row pinned to the foot of the card, so
 * cards in a grid line up instead of running to ragged heights.
 */
export default function LoadCard({
  shop,
  p,
  showSupplier = false,
}: {
  shop: Shop;
  p: LoadRow;
  showSupplier?: boolean;
}) {
  const paying = shop.payingId === p.id;
  const typed = parseFloat(shop.payAmount);
  const underEdit = shop.editingPurchaseId === p.id;
  const router = useRouter();
  const pathname = usePathname();

  /* Buy-again fills the new-purchase form, which lives on the Stock tab, so
     from anywhere else it loads the form and then takes you to it. Editing
     stays here on the card. */
  function buyAgain() {
    shop.repeatPurchase(p.id);
    if (pathname !== "/") {
      shop.setActiveTab("stock");
      router.push("/");
    }
  }

  const typedTotal = parseFloat(shop.editAmount);
  const blockedByPayments =
    !Number.isNaN(typedTotal) && typedTotal < shop.editingPaidLater;

  if (underEdit) {
    return (
      <article className={`${l.card} ${l.editing}`}>
        <div className={l.editHead}>Edit purchase</div>

        <label className={l.field}>
          <span className={l.fieldLabel}>Bought from</span>
          <input
            className={l.input}
            type="text"
            value={shop.editSupplier}
            onChange={(e) => shop.setEditSupplier(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className={l.field}>
          <span className={l.fieldLabel}>What was bought</span>
          <input
            className={l.input}
            type="text"
            value={shop.editItem}
            onChange={(e) => shop.setEditItem(e.target.value)}
            autoComplete="off"
          />
        </label>

        <div className={l.editPair}>
          <label className={l.field}>
            <span className={l.fieldLabel}>Total value</span>
            <input
              className={`num ${l.input}`}
              type="number"
              inputMode="decimal"
              min="0"
              value={shop.editAmount}
              onChange={(e) => shop.setEditAmount(e.target.value)}
            />
          </label>
          <label className={l.field}>
            <span className={l.fieldLabel}>Paid upfront</span>
            <input
              className={`num ${l.input}`}
              type="number"
              inputMode="decimal"
              min="0"
              value={shop.editPaid}
              onChange={(e) => shop.setEditPaid(e.target.value)}
            />
          </label>
        </div>

        {blockedByPayments && (
          <div className={l.warning}>
            {formatINR(shop.editingPaidLater)} is already paid against this load in
            instalments, so its total cannot go below that.
          </div>
        )}

        <div className={l.actions}>
          <button type="button" className={l.saveButton} onClick={shop.saveEdit}>
            Save changes
          </button>
          <button type="button" className={l.ghostButton} onClick={shop.cancelEdit}>
            Cancel
          </button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`${l.card} ${p.settled ? l.settled : l.due}`}
    >
      <div className={l.head}>
        <div style={{ minWidth: 0 }}>
          <div className={`${s.truncate} ${l.item}`}>{p.item}</div>
          <div className={`${s.truncate} ${l.meta}`}>
            {showSupplier ? `${p.supplier} · ${p.dayLabel}` : p.dayLabel}
          </div>
        </div>
        <span className={`${l.status} ${p.settled ? l.statusSettled : l.statusDue}`}>
          {p.settled ? "Settled" : `${p.balanceLabel} due`}
        </span>
      </div>

      <div className={l.figures}>
        <div className={l.figure}>
          <span className={`num ${l.figureValue}`}>{p.amountLabel}</span>
          <span className={l.figureLabel}>Total</span>
        </div>
        <span className={l.figureRule} />
        <div className={l.figure}>
          <span className={`num ${l.figureValue}`}>{p.paidLabel}</span>
          <span className={l.figureLabel}>Paid</span>
        </div>
      </div>

      {/* Every later part-payment, so the trail is readable. */}
      {p.payLog.length > 0 && (
        <div className={l.payLog}>
          {p.payLog.map((pay) => (
            <div key={pay.id} className={l.payLogRow}>
              <span>Paid {pay.dayLabel}</span>
              <span className="num">−{pay.amountLabel}</span>
            </div>
          ))}
        </div>
      )}

      {paying ? (
        <div className={l.payRow}>
          <input
            className={`num ${l.payInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder={String(p.balance)}
            value={shop.payAmount}
            onChange={(e) => shop.setPayAmount(e.target.value)}
            aria-label={`Amount paid to ${p.supplier}`}
            autoFocus
          />
          <button
            type="button"
            className={l.payConfirm}
            onClick={() => shop.payPurchase(p.id, Number.isNaN(typed) ? p.balance : typed)}
          >
            Pay {formatINR(Number.isNaN(typed) ? p.balance : Math.min(typed, p.balance))}
          </button>
          <button type="button" className={l.payCancel} onClick={() => shop.startPaying(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className={l.actions}>
          {!p.settled && (
            <button type="button" className={l.payButton} onClick={() => shop.startPaying(p.id)}>
              Pay {p.balanceLabel}
            </button>
          )}
          <button
            type="button"
            className={l.ghostButton}
            onClick={buyAgain}
          >
            <IconPlus size={12} color="currentColor" />
            Buy again
          </button>
          <button
            type="button"
            className={l.iconButton}
            onClick={() => shop.editPurchase(p.id)}
            aria-label={`Edit ${p.item}`}
          >
            <IconPencil size={13} color="currentColor" />
          </button>
          <button
            type="button"
            className={`${l.iconButton} ${l.iconDanger}`}
            onClick={() => shop.deletePurchase(p.id)}
            aria-label={`Delete ${p.item}`}
          >
            <IconTrash size={13} color="currentColor" />
          </button>
        </div>
      )}
    </article>
  );
}
