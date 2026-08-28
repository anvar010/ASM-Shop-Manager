"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the app installable and offline-capable.
 *
 * Production only. The worker serves /_next/static cache-first, which is safe
 * where filenames are content-hashed — but a dev server reuses those names, so
 * an edited module keeps being answered from cache and no restart dislodges it.
 * In development it is unregistered instead, which also rescues a browser that
 * already picked one up.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .then(() => caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k))))
        .catch(() => {
          /* Nothing to clean up. */
        });
      return;
    }

    // Registering after load keeps it off the critical path for first paint.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* An unavailable service worker must never break the app itself. */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
