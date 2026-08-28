"use client";

import { useCallback, useEffect, useState } from "react";
import c from "./ConfirmDialog.module.css";

export interface ConfirmRequest {
  title: string;
  /** What is being removed, in the shop's own words. */
  detail?: string;
  /** Anything that goes with it and would not be obvious. */
  warning?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

/**
 * One confirmation for every destructive action.
 *
 * Deleting a bill or a load is unrecoverable — there is no undo and no bin —
 * so each one is worth a second's pause. Returns the dialog to render and an
 * `ask` to open it.
 */
export function useConfirm() {
  const [pending, setPending] = useState<ConfirmRequest | null>(null);

  const ask = useCallback((request: ConfirmRequest) => setPending(request), []);
  const close = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const dialog = pending ? (
    <div className={c.backdrop} onClick={close} role="presentation">
      <div
        className={c.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label={pending.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={c.title}>{pending.title}</div>
        {pending.detail && <div className={c.detail}>{pending.detail}</div>}
        {pending.warning && <div className={c.warning}>{pending.warning}</div>}
        <div className={c.actions}>
          <button type="button" className={c.cancel} onClick={close}>
            No, keep it
          </button>
          <button
            type="button"
            className={c.confirm}
            autoFocus
            onClick={() => {
              pending.onConfirm();
              close();
            }}
          >
            {pending.confirmLabel ?? "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}
