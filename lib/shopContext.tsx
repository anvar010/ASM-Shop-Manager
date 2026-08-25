"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useShop, type Shop } from "./useShop";
import type { SessionUser } from "./session-token";

/*
 * The ledger lives in React state, so every route has to read the same
 * instance — a second useShop() call would hand the new page a fresh copy of
 * the seed and lose whatever was entered this session.
 */
const ShopContext = createContext<Shop | null>(null);
const UserContext = createContext<SessionUser | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const shop = useShop();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <UserContext.Provider value={user}>
      <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>
    </UserContext.Provider>
  );
}

/** Null until /api/auth/me answers, so guard on it before gating anything. */
export function useUser(): SessionUser | null {
  return useContext(UserContext);
}

export function useShopContext(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShopContext must be used inside <ShopProvider>");
  return shop;
}
