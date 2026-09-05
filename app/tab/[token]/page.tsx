import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Noto_Sans_Malayalam } from "next/font/google";
import { db } from "@/lib/db";
import { customerForToken } from "@/lib/statement";
import StatementPage, { type Entry, type Receipt } from "@/components/StatementPage";

// The balance moves whenever a bill or a repayment is written.
export const dynamic = "force-dynamic";

/* Shared with the customer, not with search engines. */
export const metadata: Metadata = {
  title: "Your tab — ASM Daily Fresh",
  robots: { index: false, follow: false },
};

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-body" });
/* Customer names are written in Malayalam as often as in English, and a name
   that renders in tofu is worse than no page at all. */
const malayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-malayalam",
});

interface BillRow {
  id: string;
  sold_on: string;
  description: string;
  amount: number;
  paid: number;
}

interface PayRow {
  paid_on: string;
  amount: number;
}

export default async function TabPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const pool = db();
  const [nameRows] = await pool.query(
    "SELECT DISTINCT customer FROM bills WHERE mode = 'credit' AND customer IS NOT NULL",
  );
  const customer = customerForToken(
    token,
    (nameRows as { customer: string }[]).map((r) => r.customer),
  );
  if (!customer) notFound();

  const [billRows] = await pool.query(
    `SELECT b.id, b.sold_on, b.description, b.amount, COALESCE(p.paid, 0) AS paid
     FROM bills b
     LEFT JOIN (
       SELECT bill_id, SUM(amount) AS paid FROM bill_credit_payments GROUP BY bill_id
     ) p ON p.bill_id = b.id
     WHERE b.mode = 'credit' AND b.customer = ?
     ORDER BY b.sold_on, b.sold_at`,
    [customer],
  );
  const [payRows] = await pool.query(
    `SELECT p.paid_on, p.amount
     FROM bill_credit_payments p
     JOIN bills b ON b.id = p.bill_id
     WHERE b.mode = 'credit' AND b.customer = ?
     ORDER BY p.paid_on, p.created_at`,
    [customer],
  );

  const entries: Entry[] = (billRows as BillRow[]).map((r) => ({
    date: r.sold_on,
    desc: r.description === "Sale" ? "" : r.description,
    amount: Number(r.amount),
    settled: Number(r.paid) >= Number(r.amount),
    part: Number(r.paid) > 0 && Number(r.paid) < Number(r.amount) ? Number(r.paid) : 0,
  }));
  const receipts: Receipt[] = (payRows as PayRow[]).map((r) => ({
    date: r.paid_on,
    amount: Number(r.amount),
  }));

  const billed = entries.reduce((sum, e) => sum + e.amount, 0);
  const repaid = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className={`${display.variable} ${body.variable} ${malayalam.variable}`}>
      <StatementPage
        customer={customer}
        entries={entries}
        receipts={receipts}
        billed={billed}
        repaid={repaid}
      />
    </div>
  );
}
