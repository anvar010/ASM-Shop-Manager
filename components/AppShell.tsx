"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useShopContext, useUser } from "@/lib/shopContext";
import type { TabId } from "@/lib/types";
import { formatLongDate } from "@/lib/format";
import styles from "./AppShell.module.css";
import NotificationToggle from "./NotificationToggle";
import { IconBill, IconBox, IconChevron, IconNote, IconTrend } from "./Icons";

type Tab = { id: TabId; label: string; title: string; Icon: typeof IconBill; adminOnly?: boolean };

export const TABS: Tab[] = [
  { id: "bills", label: "Bills", title: "Daily Bills", Icon: IconBill },
  { id: "overview", label: "Overview", title: "Overview", Icon: IconTrend, adminOnly: true },
  { id: "expenses", label: "Expenses", title: "Expenses", Icon: IconNote, adminOnly: true },
  { id: "stock", label: "Stock", title: "Stock Purchases", Icon: IconBox },
];

/** Staff keep to takings and stock; the rest is the owner's business. */
export function tabsFor(role: string | undefined): Tab[] {
  return role === "admin" ? TABS : TABS.filter((t) => !t.adminOnly);
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
              {user?.role === "admin" ? "Owner · full access" : "Staff · bills and stock"}
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

      {/* A write that failed after the screen already changed must not pass
          silently, or the shop is trusting a figure the database never got. */}
      {shop.saveError && (
        <div className={styles.toast} role="alert">
          <span>{shop.saveError}. The screen has been put back to what is saved.</span>
          <button type="button" className={styles.toastClose} onClick={shop.dismissSaveError}>
            Dismiss
          </button>
        </div>
      )}

      <nav className={styles.nav} aria-label="Main">
        {tabs.map(({ id, label, Icon }) => {
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
