import { CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_MODES } from "./constants";
import { formatDateKey, formatINR } from "./format";
import { sendToAdmin } from "./mail";

/*
 * Change alerts.
 *
 * Only fields that actually moved are reported: a mail listing every field of
 * an unchanged record teaches the reader to ignore it, and then a real change
 * goes unnoticed too.
 */

export interface FieldSpec<T> {
  key: keyof T & string;
  label: string;
  format?: (value: unknown) => string;
}

export interface Change {
  label: string;
  before: string;
  after: string;
}

const money = (v: unknown) => (v === null || v === undefined ? "—" : formatINR(Number(v)));
const label = (list: { id: string; label: string }[]) => (v: unknown) =>
  list.find((x) => x.id === v)?.label ?? String(v ?? "—");
const plain = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const dayLabel = (v: unknown) => (v ? formatDateKey(String(v)) : "—");

export const BILL_FIELDS: FieldSpec<Record<string, unknown>>[] = [
  { key: "date", label: "Date", format: dayLabel },
  { key: "desc", label: "Description", format: plain },
  { key: "amount", label: "Amount", format: money },
  { key: "category", label: "Category", format: label(CATEGORIES) },
  { key: "mode", label: "Paid by", format: label(PAYMENT_MODES) },
  { key: "customer", label: "Credit customer", format: plain },
];

export const EXPENSE_FIELDS: FieldSpec<Record<string, unknown>>[] = [
  { key: "desc", label: "Description", format: plain },
  { key: "amount", label: "Amount", format: money },
  { key: "category", label: "Category", format: label(EXPENSE_CATEGORIES) },
];

export const PURCHASE_FIELDS: FieldSpec<Record<string, unknown>>[] = [
  { key: "supplier", label: "Supplier", format: plain },
  { key: "item", label: "Item", format: plain },
  { key: "amount", label: "Goods value", format: money },
  { key: "paidUpfront", label: "Paid upfront", format: money },
];

/** Compares two records and returns only the fields whose value moved. */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: FieldSpec<Record<string, unknown>>[],
): Change[] {
  const out: Change[] = [];
  for (const f of fields) {
    const a = before[f.key];
    const b = after[f.key];
    // Numbers arrive as strings from some drivers, so compare on the display
    // form: it is what the reader would call "the same value".
    const fmt = f.format ?? plain;
    const from = fmt(a);
    const to = fmt(b);
    if (from !== to) out.push({ label: f.label, before: from, after: to });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Template
 * ------------------------------------------------------------------ */

const C = {
  ink: "#16181d",
  muted: "#5b6270",
  faint: "#8b92a0",
  line: "#e4e3de",
  bg: "#f7f7f5",
  primary: "#1f3fa0",
  danger: "#c23b33",
  dangerBg: "#fbe7e5",
  success: "#1e9e6b",
  successBg: "#e5f6ee",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export interface AlertInput {
  /** "Bill", "Expense", "Purchase" */
  kind: string;
  /** Which record, in the shop's own words. */
  title: string;
  /** e.g. "Today, 26 Aug · 5:30 PM" */
  when: string;
  actorName: string;
  actorRole: string;
  changes: Change[];
}

/** A before/after pair, or a plain fact when only one value applies. */
export interface Row {
  label: string;
  before?: string;
  after?: string;
  value?: string;
  /** Draws the value in red — used for what a deletion removed. */
  negative?: boolean;
}

function renderRow(r: Row): string {
  const head = `
  <tr>
    <td style="padding:14px 0 4px;font-size:11px;font-weight:700;color:${C.faint};letter-spacing:.04em;text-transform:uppercase;border-top:1px solid ${C.line}">${escapeHtml(r.label)}</td>
  </tr>`;

  if (r.before !== undefined || r.after !== undefined) {
    return `${head}
  <tr>
    <td style="padding:0 0 14px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:46%;padding:9px 11px;background:${C.dangerBg};border-radius:6px;font-size:13px;font-weight:700;color:${C.danger};text-decoration:line-through">${escapeHtml(r.before ?? "—")}</td>
          <td style="width:8%;text-align:center;font-size:15px;color:${C.faint}">&rarr;</td>
          <td style="width:46%;padding:9px 11px;background:${C.successBg};border-radius:6px;font-size:13px;font-weight:700;color:${C.success}">${escapeHtml(r.after ?? "—")}</td>
        </tr>
      </table>
    </td>
  </tr>`;
  }

  const tone = r.negative
    ? `background:${C.dangerBg};color:${C.danger};text-decoration:line-through`
    : `background:${C.bg};color:${C.ink}`;
  return `${head}
  <tr>
    <td style="padding:0 0 14px">
      <div style="padding:9px 11px;border-radius:6px;font-size:13px;font-weight:700;${tone}">${escapeHtml(r.value ?? "—")}</div>
    </td>
  </tr>`;
}

export interface Alert {
  /** e.g. "Bill edited", "Purchase deleted", "Credit settled" */
  badge: string;
  tone: "edit" | "delete" | "settle";
  title: string;
  meta: string;
  rows: Row[];
  footnote: string;
}

const TONES = {
  edit: { bg: "#fbf0de", fg: "#c08a2e" },
  delete: { bg: C.dangerBg, fg: C.danger },
  settle: { bg: C.successBg, fg: C.success },
};

export function alertHtml(a: Alert): string {
  const t = TONES[a.tone];
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${C.bg};padding:28px 12px">
<tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:540px;background:#fff;border:1px solid ${C.line};border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">

    <tr><td style="padding:22px 24px 0">
      <div style="font-size:21px;font-weight:800;color:${C.primary};letter-spacing:-.02em;line-height:1">ASM</div>
      <div style="font-size:11px;font-weight:600;color:${C.faint};margin-top:3px">Daily Fresh &middot; Shop Manager</div>
    </td></tr>

    <tr><td style="padding:18px 24px 0">
      <div style="display:inline-block;padding:5px 11px;background:${t.bg};color:${t.fg};border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(a.badge)}</div>
      <div style="font-size:18px;font-weight:800;color:${C.ink};margin:12px 0 4px">${escapeHtml(a.title)}</div>
      <div style="font-size:12.5px;font-weight:600;color:${C.muted}">${a.meta}</div>
    </td></tr>

    <tr><td style="padding:14px 24px 4px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        ${a.rows.map(renderRow).join("")}
      </table>
    </td></tr>

    <tr><td style="padding:4px 24px 24px">
      <div style="padding:12px 14px;background:${C.bg};border-radius:8px;font-size:11.5px;line-height:1.5;color:${C.faint}">
        ${escapeHtml(a.footnote)}
        You are receiving this because ADMIN_EMAIL is set to your address.
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

export function alertText(a: Alert): string {
  return [
    `${a.badge} — ${a.title}`,
    a.meta.replace(/<[^>]+>/g, ""),
    "",
    ...a.rows.map((r) =>
      r.before !== undefined || r.after !== undefined
        ? `${r.label}: ${r.before ?? "—"}  ->  ${r.after ?? "—"}`
        : `${r.label}: ${r.value ?? "—"}`,
    ),
    "",
    "ASM Daily Fresh · Shop Manager",
  ].join("\n");
}

function actorLine(name: string, role: string, when: string): string {
  const who = role === "admin" ? "owner" : "staff";
  return `by <strong style="color:${C.ink}">${escapeHtml(name)}</strong> (${who}) &middot; ${escapeHtml(when)}`;
}

export interface ActorContext {
  actorName: string;
  actorRole: string;
  when: string;
}

/** A record was edited: report only the fields that moved. */
export async function sendChangeAlert(
  a: ActorContext & { kind: string; title: string; changes: Change[] },
): Promise<boolean> {
  if (a.changes.length === 0) return false;
  return send({
    badge: `${a.kind} edited`,
    tone: "edit",
    title: a.title,
    meta: `Changed ${actorLine(a.actorName, a.actorRole, a.when)}`,
    rows: a.changes,
    footnote: "Struck-through red is what the value was; green is what it is now.",
  }, `${a.kind} edited by ${a.actorName} — ${a.changes.map((c) => c.label).join(", ")}`);
}

/** A record was removed: report what it held, since it is now unrecoverable. */
export async function sendDeleteAlert(
  a: ActorContext & { kind: string; title: string; details: Row[] },
): Promise<boolean> {
  return send({
    badge: `${a.kind} deleted`,
    tone: "delete",
    title: a.title,
    meta: `Deleted ${actorLine(a.actorName, a.actorRole, a.when)}`,
    rows: a.details.map((d) => ({ ...d, negative: true })),
    footnote: "This record has been removed and cannot be recovered from the app.",
  }, `${a.kind} deleted by ${a.actorName} — ${a.title}`);
}

/** Money moved: a customer paid the shop, or the shop paid a supplier. */
export async function sendSettlementAlert(
  a: ActorContext & { badge: string; title: string; rows: Row[]; subject: string },
): Promise<boolean> {
  return send({
    badge: a.badge,
    tone: "settle",
    title: a.title,
    meta: `Recorded ${actorLine(a.actorName, a.actorRole, a.when)}`,
    rows: a.rows,
    footnote: "Balances shown are what remained before and after this payment.",
  }, a.subject);
}

async function send(alert: Alert, subject: string): Promise<boolean> {
  return sendToAdmin(subject, alertHtml(alert), alertText(alert));
}
