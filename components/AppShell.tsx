"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useShopContext } from "@/lib/shopContext";
import type { TabId } from "@/lib/types";
import { formatLongDate } from "@/lib/format";
import styles from "./AppShell.module.css";
import { IconBill, IconBox, IconChevron, IconNote, IconTrend } from "./Icons";

export const TABS: { id: TabId; label: string; title: string; Icon: typeof IconBill }[] = [
  { id: "bills", label: "Bills", title: "Daily Bills", Icon: IconBill },
  { id: "overview", label: "Overview", title: "Overview", Icon: IconTrend },
  { id: "expenses", label: "Expenses", title: "Expenses", Icon: IconNote },
  { id: "stock", label: "Stock", title: "Stock Purchases", Icon: IconBox },
];

/**
 * Header, content well and tab bar, shared by the tabbed home route and by
 * drill-down pages. A page passing `back` gets a return link in place of the
 * wordmark; the tab bar stays put either way, so a tab is always one tap off.
 */
export default function AppShell({
  title,
  back,
  children,
}: {
  title: string;
  back?: { href: string; label: string; tab?: TabId };
  children: React.ReactNode;
}) {
  const shop = useShopContext();
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";

  function openTab(id: TabId) {
    shop.setActiveTab(id);
    if (!onHome) router.push("/");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {back ? (
            <Link
              href={back.href}
              className={styles.backButton}
              // Deep-linking straight here leaves the home route on its default
              // tab, so going back lands where the label promises.
              onClick={() => back.tab && shop.setActiveTab(back.tab)}
            >
              <span className={styles.backIcon}>
                <IconChevron size={15} color="currentColor" />
              </span>
              {back.label}
            </Link>
          ) : (
            <div>
              <div className={styles.wordmark}>ASM</div>
              <div className={styles.tagline}>Shop Manager</div>
            </div>
          )}
          <div className={styles.divider} />
          <div className={styles.screenTitle}>{title}</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerDate}>{formatLongDate(new Date())}</div>
          <div className={styles.avatar}>A</div>
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      <nav className={styles.nav} aria-label="Main">
        {TABS.map(({ id, label, Icon }) => {
          const active = onHome && shop.activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              onClick={() => openTab(id)}
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
