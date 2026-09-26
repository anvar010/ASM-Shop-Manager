"use client";

import { useEffect, useState } from "react";
import { IconTimes } from "./Icons";
import styles from "./UpdateBanner.module.css";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const EVERY = 5 * 60_000;

/**
 * Tells someone using an old copy of the app that a newer one is live. An app
 * left open, or an installed one, keeps running the code it loaded until it is
 * reloaded, so without this a fix can sit undelivered for days.
 */
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!CURRENT) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = await res.json();
        // An empty id is a server that does not know; never call that "new".
        if (id && id !== CURRENT) setStale(true);
      } catch {
        /* Offline: nothing to learn, try again later. */
      }
    };

    const start = () => {
      void check();
      timer = setInterval(check, EVERY);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      stop();
      if (document.visibilityState === "visible") start();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!stale || dismissed) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.text}>A new version is available</span>
      <button type="button" className={styles.update} onClick={() => window.location.reload()}>
        Update now
      </button>
      <button
        type="button"
        className={styles.close}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <IconTimes size={14} color="currentColor" />
      </button>
    </div>
  );
}
