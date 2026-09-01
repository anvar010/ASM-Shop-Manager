"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShopContext, useUser } from "@/lib/shopContext";
import type { TabId } from "@/lib/types";
import { formatLongDate } from "@/lib/format";
import styles from "./AppShell.module.css";
import NotificationToggle, { NotificationBell } from "./NotificationToggle";
import {
  IconBill,
  IconBox,
  IconCalculator,
  IconChevron,
  IconNote,
  IconTrend,
  IconUsers,
} from "./Icons";

type Tab = {
  id: TabId;
  label: string;
  title: string;
  Icon: typeof IconBill;
  adminOnly?: boolean;
  /* Staff take credit payments at the counter, so they get a tab for it. The
     owner reaches the same page from Overview and already has four tabs. */
  staffOnly?: boolean;
  /** A tab that opens its own route rather than switching panel. */
  href?: string;
  /* Hidden below tablet width. The calculator wants a keypad and a price list
     side by side, which a phone cannot give it. */
  tabletOnly?: boolean;
};

export const TABS: Tab[] = [
  { id: "bills", label: "Bills", title: "Daily Bills", Icon: IconBill },
  { id: "overview", label: "Overview", title: "Overview", Icon: IconTrend, adminOnly: true },
  { id: "credits", label: "Credits", title: "Credit Customers", Icon: IconUsers, staffOnly: true, href: "/credits" },
  { id: "expenses", label: "Expenses", title: "Expenses", Icon: IconNote },
  { id: "stock", label: "Stock", title: "Stock Purchases", Icon: IconBox },
  { id: "calculator", label: "Calculator", title: "Calculator", Icon: IconCalculator, tabletOnly: true },
];

/** Staff keep to takings, credit and stock; the rest is the owner's business. */
export function tabsFor(role: string | undefined): Tab[] {
  const admin = role === "admin";
  return TABS.filter((t) => (admin ? !t.staffOnly : !t.adminOnly));
}

/**
 * Header, content well and tab bar, shared by the tabbed home route and by
 * drill-down pages. A page passing `back` gets a return link in place of the
 * wordmark; the tab bar stays put either way, so a tab is always one tap off.
 */
function AccountMenu() {
  const user = useUser();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className={styles.account}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen(!open)}
        aria-label="Account"
        aria-expanded={open}
      >
        {(user?.name ?? "?").slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <>
          <div className={styles.accountBackdrop} onClick={() => setOpen(false)} />
          <div className={styles.accountMenu}>
            <div className={styles.accountName}>{user?.name ?? "Signed in"}</div>
            <div className={styles.accountRole}>
              {user?.role === "admin" ? "Owner · full access" : "Staff · counter and spending"}
            </div>
            {user?.role === "admin" && <NotificationToggle />}
            <button type="button" className={styles.signOut} onClick={signOut}>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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
  const user = useUser();
  const tabs = tabsFor(user?.role);
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";

  function openTab(tab: Tab) {
    if (tab.href) {
      router.push(tab.href);
      return;
    }
    shop.setActiveTab(tab.id);
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
            <Link href="/" className={styles.logoLink} aria-label="ASM Daily Fresh — home">
              <Image
                src="/logo-mark.png"
                alt="ASM Daily Fresh"
                width={900}
                height={441}
                sizes="90px"
                className={styles.logo}
                priority
              />
            </Link>
          )}
          <div className={styles.divider} />
          <div className={styles.screenTitle}>{title}</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerDate}>{formatLongDate(new Date())}</div>
          {user?.role === "admin" && <NotificationBell />}
          <AccountMenu />
        </div>
      </header>

      <main className={styles.content}>
        {/* An empty ledger and an unread one look identical, so say which. */}
        {shop.loading ? (
          <div className={styles.state}>
            <span className={styles.spinner} aria-hidden="true" />
            <div className={styles.stateText}>Loading your shop…</div>
          </div>
        ) : shop.loadError ? (
          <div className={styles.state}>
            <div className={styles.stateTitle}>Could not load your data</div>
            <div className={styles.stateText}>{shop.loadError}</div>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Whatever went wrong says so in its own words: a failed write is not
          the same event as a refresh that could not reach the server. */}
      {shop.saveError && (
        <div className={styles.toast} role="alert">
          <span>{shop.saveError}</span>
          <button type="button" className={styles.toastClose} onClick={shop.dismissSaveError}>
            Dismiss
          </button>
        </div>
      )}

      <nav className={styles.nav} aria-label="Main">
        {tabs.map((tab) => {
          const { id, label, Icon } = tab;
          const active = tab.href ? pathname === tab.href : onHome && shop.activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${active ? styles.navItemActive : ""} ${
                tab.tabletOnly ? styles.navTabletOnly : ""
              }`}
              onClick={() => openTab(tab)}
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
