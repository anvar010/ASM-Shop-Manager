"use client";

import { useEffect, useRef, useState } from "react";
import c from "./Select.module.css";
import { IconChevron } from "./Icons";

export interface Option {
  value: string;
  label: string;
  /** A second line, where the label alone would need decoding. */
  hint?: string;
}

export interface OptionGroup {
  label: string;
  options: Option[];
}

/**
 * A dropdown that can actually be styled.
 *
 * A native <select> draws its list through the operating system, so no CSS
 * reaches inside it — grey rows on a dark sheet in a light app. This renders
 * the list itself, which is the only way to make it match.
 */
export default function Select({
  value,
  onChange,
  groups,
  placeholder = "Select",
  label,
  variant = "field",
}: {
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  placeholder?: string;
  label: string;
  /** "field" fills the row like an input; "inline" sits inside one. */
  variant?: "field" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const all = groups.flatMap((g) => g.options);
  /* A value the caller has not listed is still shown as itself rather than
     falling back to the placeholder, which would read as nothing happening. */
  const chosen = all.find((o) => o.value === value) ?? (value ? { value, label: value } : undefined);

  return (
    <div className={`${c.wrap} ${variant === "field" ? c.wrapField : ""}`} ref={box}>
      <button
        type="button"
        className={`${variant === "field" ? c.field : c.inline} ${open ? c.open : ""} ${
          chosen ? "" : c.placeholder
        }`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={c.value}>{chosen?.label ?? placeholder}</span>
        <span className={`${c.chevron} ${open ? c.chevronOpen : ""}`}>
          <IconChevron size={14} color="currentColor" />
        </span>
      </button>

      {open && (
        <div className={`${c.menu} ${variant === "inline" ? c.menuRight : ""}`} role="listbox" aria-label={label}>
          {groups.map((g, i) => (
            <div key={g.label || i} className={c.group}>
              {g.label && <div className={c.groupLabel}>{g.label}</div>}
              {g.options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${c.option} ${active ? c.optionOn : ""}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className={c.optionLabel}>{o.label}</span>
                    {o.hint && <span className={c.optionHint}>{o.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
