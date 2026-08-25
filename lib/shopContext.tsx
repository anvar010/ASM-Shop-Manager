"use client";

import { createContext, useContext } from "react";
import { useShop, type Shop } from "./useShop";

/*
 * The ledger lives in React state, so every route has to read the same
 * instance — a second useShop() call would hand the new page a fresh copy of
 * the seed and lose whatever was entered this session.
 */
const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const shop = useShop();
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export function useShopContext(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShopContext must be used inside <ShopProvider>");
  return shop;
}
