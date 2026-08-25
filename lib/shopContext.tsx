"use client";

import { createContext, useContext } from "react";
import { useShop, type Shop } from "./useShop";
import type { SessionUser } from "./session-token";

/*
 * The ledger lives in React state, so every route has to read the same
 * instance — a second useShop() call would hand the new page a fresh copy of
 * the seed and lose whatever was entered this session.
 */
const ShopContext = createContext<Shop | null>(null);
const UserContext = createContext<SessionUser | null>(null);

/*
 * The user is read from the session cookie on the server and passed in, rather
 * than fetched after mount. Fetching meant the first render always assumed the
 * lesser role, so an owner watched the nav change under them — and any gating
 * written against it was briefly wrong.
 */
export function ShopProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const shop = useShop();

  return (
    <UserContext.Provider value={user}>
      <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>
    </UserContext.Provider>
  );
}

/** The signed-in user, known from the first render. */
export function useUser(): SessionUser | null {
  return useContext(UserContext);
}

export function useShopContext(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShopContext must be used inside <ShopProvider>");
  return shop;
}
