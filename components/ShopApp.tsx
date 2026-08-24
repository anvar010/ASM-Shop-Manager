"use client";

import { useShop } from "@/lib/useShop";
import type { TabId } from "@/lib/types";
import { formatLongDate } from "@/lib/format";
import styles from "./ShopApp.module.css";
import { IconBill, IconBox, IconNote, IconTrend } from "./Icons";
import OverviewTab from "./OverviewTab";
import BillsTab from "./BillsTab";
import ExpensesTab from "./ExpensesTab";
import StockTab from "./StockTab";

const TABS: { id: TabId; label: string; title: string; Icon: typeof IconBill }[] = [
  { id: "bills", label: "Bills", title: "Daily Bills", Icon: IconBill },
  { id: "overview", label: "Overview", title: "Overview", Icon: IconTrend },
  { id: "expenses", label: "Expenses", title: "Expenses", Icon: IconNote },
  { id: "stock", label: "Stock", title: "Stock Count", Icon: IconBox },
];

export default function ShopApp() {
  const shop = useShop();
  const current = TABS.find((t) => t.id === shop.activeTab) ?? TABS[0];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div>
            <div className={styles.wordmark}>ASM</div>
            <div className={styles.tagline}>Shop Manager</div>
          </div>
          <div className={styles.divider} />
          <div className={styles.screenTitle}>{current.title}</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerDate}>{formatLongDate(new Date())}</div>
          <div className={styles.avatar}>A</div>
        </div>
      </header>

      <main className={styles.content}>
        {shop.activeTab === "bills" && <BillsTab shop={shop} />}
        {shop.activeTab === "overview" && <OverviewTab shop={shop} />}
        {shop.activeTab === "expenses" && <ExpensesTab shop={shop} />}
        {shop.activeTab === "stock" && <StockTab shop={shop} />}
      </main>

      <nav className={styles.nav} aria-label="Main">
        {TABS.map(({ id, label, Icon }) => {
          const active = shop.activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              onClick={() => shop.setActiveTab(id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={21} color="currentColor" />
              <span className={styles.navLabel}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
