import Image from "next/image";
import { formatINR } from "@/lib/format";
import c from "./StatementPage.module.css";

export interface Entry {
  /** YYYY-MM-DD */
  date: string;
  /** What was bought, when it was written down. Usually blank. */
  desc: string;
  amount: number;
  settled: boolean;
  /** Part paid, and by how much. Zero when none or all of it is paid. */
  part: number;
}

export interface Receipt {
  date: string;
  amount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function day(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function longDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function Tick() {
  return (
    <svg className={c.tick} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.6 6.4 11.4 12.5 4.9" />
    </svg>
  );
}

export default function StatementPage({
  customer,
  entries,
  receipts,
  billed,
  repaid,
}: {
  customer: string;
  entries: Entry[];
  receipts: Receipt[];
  billed: number;
  repaid: number;
}) {
  const balance = Math.max(0, billed - repaid);
  const clear = balance === 0;
  const owing = entries.filter((e) => !e.settled);
  const since = owing.length > 0 ? owing[0].date : "";
  const today = new Date();
  const asOf = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <main className={c.page}>
      <div className={c.sheet}>
        <header className={c.masthead}>
          <Image
            src="/logo-mark.png"
            alt="ASM Daily Fresh"
            width={900}
            height={441}
            sizes="150px"
            className={c.logo}
            priority
          />
          <span className={c.docType}>Credit note</span>
        </header>

        {/* The balance is the whole reason the page was opened, so it is the
            first thing on it — set on the shop's green, torn off like the stub
            of a slip from the counter. */}
        <section className={`${c.stub} ${clear ? c.stubClear : ""}`}>
          <p className={c.stubFor}>Tab kept for</p>
          <h1 className={c.name}>{customer}</h1>

          <p className={c.stubLabel}>{clear ? "Nothing owing" : "Balance to pay"}</p>
          <p className={c.balance}>{formatINR(balance)}</p>
          <p className={c.asOf}>
            as it stands on {asOf}
            {since && !clear ? ` · unpaid since ${day(since)}` : ""}
          </p>

          {clear && <span className={c.clearBadge}>Fully settled — thank you</span>}
          <span className={c.tear} aria-hidden="true" />
        </section>

        <dl className={c.meta}>
          <div className={c.metaItem}>
            <dt>Entries</dt>
            <dd>{entries.length}</dd>
          </div>
          <div className={c.metaItem}>
            <dt>Taken</dt>
            <dd>{formatINR(billed)}</dd>
          </div>
          <div className={c.metaItem}>
            <dt>Paid back</dt>
            <dd className={c.metaPaid}>{formatINR(repaid)}</dd>
          </div>
        </dl>

        <section className={c.block}>
          <h2 className={c.blockTitle}>What was taken</h2>
          <ol className={c.list}>
            {entries.map((e, i) => (
              <li key={i} className={`${c.row} ${e.settled ? c.rowSettled : ""}`}>
                <span className={c.rowDate}>{day(e.date)}</span>
                <span className={c.rowDesc}>
                  {e.desc || "Groceries"}
                  {e.part > 0 && (
                    <span className={c.rowPart}>{formatINR(e.part)} paid off this one</span>
                  )}
                </span>
                <span className={c.rowAmount}>
                  {e.settled && <Tick />}
                  {formatINR(e.amount)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {receipts.length > 0 && (
          <section className={c.block}>
            <h2 className={c.blockTitle}>What was paid back</h2>
            <ol className={c.list}>
              {receipts.map((r, i) => (
                <li key={i} className={c.row}>
                  <span className={c.rowDate}>{day(r.date)}</span>
                  <span className={c.rowDesc}>Received with thanks</span>
                  <span className={`${c.rowAmount} ${c.rowAmountPaid}`}>
                    &minus;{formatINR(r.amount)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className={c.total}>
          <span className={c.totalLabel}>{clear ? "Nothing owing" : "Still to pay"}</span>
          <span className={`${c.totalValue} ${clear ? c.totalClear : ""}`}>
            {formatINR(balance)}
          </span>
        </section>

        <footer className={c.footer}>
          <p className={c.footNote}>
            A copy of the shop&apos;s credit book, kept up to date as entries are made. Nothing can
            be changed from this page.
          </p>
          <p className={c.footShop}>Something not right? Ask at the counter.</p>
          <p className={c.footStamp}>Prepared {longDay(new Date().toISOString().slice(0, 10))}</p>
        </footer>
      </div>
    </main>
  );
}
