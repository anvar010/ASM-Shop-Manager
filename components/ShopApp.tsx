"use client";

import { useShopContext } from "@/lib/shopContext";
import AppShell, { TABS } from "./AppShell";
import OverviewTab from "./OverviewTab";
import BillsTab from "./BillsTab";
import ExpensesTab from "./ExpensesTab";
import StockTab from "./StockTab";

export default function ShopApp() {
  const shop = useShopContext();
  const current = TABS.find((t) => t.id === shop.activeTab) ?? TABS[0];

  return (
    <AppShell title={current.title}>
      {shop.activeTab === "bills" && <BillsTab shop={shop} />}
      {shop.activeTab === "overview" && <OverviewTab shop={shop} />}
      {shop.activeTab === "expenses" && <ExpensesTab shop={shop} />}
      {shop.activeTab === "stock" && <StockTab shop={shop} />}
    </AppShell>
  );
}
