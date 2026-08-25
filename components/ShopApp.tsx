"use client";

import { useShopContext, useUser } from "@/lib/shopContext";
import AppShell, { tabsFor } from "./AppShell";
import OverviewTab from "./OverviewTab";
import BillsTab from "./BillsTab";
import ExpensesTab from "./ExpensesTab";
import StockTab from "./StockTab";

export default function ShopApp() {
  const shop = useShopContext();
  const user = useUser();
  const tabs = tabsFor(user?.role);
  /* Falling back to the first allowed tab means a staff account landing on an
     admin tab sees bills, never a blank screen. */
  const current = tabs.find((t) => t.id === shop.activeTab) ?? tabs[0];

  return (
    <AppShell title={current.title}>
      {current.id === "bills" && <BillsTab shop={shop} />}
      {current.id === "overview" && <OverviewTab shop={shop} />}
      {current.id === "expenses" && <ExpensesTab shop={shop} />}
      {current.id === "stock" && <StockTab shop={shop} />}
    </AppShell>
  );
}
