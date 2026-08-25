"use client";

import { useEffect } from "react";

/** Registers the service worker that makes the app installable and offline-capable. */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
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
