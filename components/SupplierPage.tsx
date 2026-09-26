"use client";

import { useParams } from "next/navigation";
import { useShopContext } from "@/lib/shopContext";
import { formatINR } from "@/lib/format";
import AppShell from "./AppShell";
import LoadCard from "./LoadCard";
import { SupplierHistory, SupplierPayBox } from "./SupplierPanel";
import s from "./shared.module.css";
import c from "./SupplierPage.module.css";

/** One shop on its own page: what is owed, paying it, and everything that happened. */
export default function SupplierPage() {
  const shop = useShopContext();
  const params = useParams<{ name: string }>();
  const raw = params.name ?? "";
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    /* Already plain. */
  }

  const rows = shop.allPurchaseRows.filter((p) => p.supplier === name);
  const total = rows.reduce((sum, p) => sum + p.amount, 0);
  const paid = rows.reduce((sum, p) => sum + p.paid, 0);
  const balance = rows.reduce((sum, p) => sum + p.balance, 0);
  const settled = balance === 0;

  return (
    <AppShell title={name} back={{ href: "/", label: "Supplier", tab: "stock" }}>
      {rows.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyTitle}>No purchases from {name}</div>
        </div>
      ) : (
        <>
          <section className={`${s.banner} ${s.bannerDark}`} style={{ marginBottom: 12 }}>
            <div className={c.head}>
              <div className={c.headName}>
                <div className={c.shopBadge}>Supplier</div>
                <div className={c.shopName}>{name}</div>
                <div className={s.bannerLabel}>
                  {rows.length} {rows.length === 1 ? "load" : "loads"}
                </div>
              </div>
              <div className={c.headAmount}>
                <div className={`num ${s.bannerValue}`}>
                  {settled ? "Settled" : formatINR(balance)}
                </div>
                <div className={s.bannerLabel}>{settled ? "Nothing due" : "Still to pay"}</div>
              </div>
            </div>
            <div className={s.bannerRule} />
            <div className={s.rowBetween}>
              <div>
                <div className="num" style={{ fontSize: 18, color: "#fff" }}>{formatINR(total)}</div>
                <div className={s.bannerLabel}>Total bought</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 18, color: "#fff" }}>{formatINR(paid)}</div>
                <div className={s.bannerLabel}>Paid so far</div>
              </div>
            </div>
          </section>

          <div className={c.layout}>
            <div className={c.col}>
              <SupplierPayBox
                shop={shop}
                supplier={name}
                balance={balance}
                balanceLabel={formatINR(balance)}
              />
              <section className={s.card}>
                <div className={s.cardTitle} style={{ marginBottom: 12 }}>
                  Full history
                </div>
                <SupplierHistory rows={rows} />
              </section>
            </div>

            <section className={s.card}>
              <div className={s.cardTitle} style={{ marginBottom: 12 }}>
                Every load
              </div>
              <div className={c.loads}>
                {rows.map((p) => (
                  <LoadCard key={p.id} shop={shop} p={p} />
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
