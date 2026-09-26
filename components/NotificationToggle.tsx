"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./AppShell.module.css";
import { IconBell, IconBellOff, IconTimes } from "./Icons";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "working";

/** base64url VAPID key to the ArrayBuffer the Push API expects. */
function toKey(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/*
 * One state for every place this shows — the bell, the banner and the account
 * menu. Each used to keep its own copy, so turning notifications on from the
 * banner left the bell still showing "off" until the page reloaded.
 */
let current: State = "loading";
const listeners = new Set<() => void>();
let detecting = false;

function set(next: State) {
  if (current === next) return;
  current = next;
  listeners.forEach((l) => l());
}

function detect() {
  if (detecting || typeof window === "undefined") return;
  detecting = true;

  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    set("unsupported");
    return;
  }
  if (Notification.permission === "denied") {
    set("denied");
    return;
  }

  /* serviceWorker.ready never settles when no worker activates — it does not
     reject either — so waiting on it alone left this stuck on "loading" and
     rendering nothing at all. Assume off unless a subscription turns up. */
  let done = false;
  const settle = (s: State) => {
    if (!done) {
      done = true;
      set(s);
    }
  };
  const timeout = setTimeout(() => settle("off"), 3000);

  navigator.serviceWorker.ready
    .then((reg) => reg.pushManager.getSubscription())
    .then((sub) => {
      clearTimeout(timeout);
      settle(sub ? "on" : "off");
      /* Re-register what this browser holds. The server may have lost the row
         (a pruned endpoint, a different database), and the bell would keep
         saying "on" while nothing was ever sent here. It is an upsert. */
      if (sub) {
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        }).catch(() => {
          /* Offline: it will be re-sent next time the app opens. */
        });
      }
    })
    .catch(() => {
      clearTimeout(timeout);
      settle("off");
    });
}

let currentError = "";
function setError(message: string) {
  currentError = message;
  listeners.forEach((l) => l());
}

async function enable() {
  set("working");
  setError("");
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      set(permission === "denied" ? "denied" : "off");
      return;
    }
    /* ready never settles when no worker is active (e.g. the dev server,
       which unregisters it), so bound the wait instead of hanging. */
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("no service worker")), 5000),
      ),
    ]);
    const sub = await reg.pushManager.subscribe({
      // Web push forbids silent messages; every one shows a notification.
      userVisibleOnly: true,
      applicationServerKey: toKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    if (!res.ok) setError("Could not save. Try again.");
    set(res.ok ? "on" : "off");
  } catch (e) {
    setError(
      e instanceof Error && e.message === "no service worker"
        ? "Not available here. Use the installed app."
        : "Could not turn on. Try again.",
    );
    set("off");
  }
}

async function disable() {
  set("working");
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    set("off");
  } catch {
    set("on");
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  detect();
  return () => {
    listeners.delete(listener);
  };
}

function useNotifications() {
  const state = useSyncExternalStore(subscribe, () => current, () => "loading" as State);
  const error = useSyncExternalStore(subscribe, () => currentError, () => "");
  return { state, error, toggle: () => (state === "on" ? disable() : enable()) };
}

const DISMISS_KEY = "asm-notify-banner-dismissed";

/**
 * A prompt above the tab bar while notifications are off. Closing it hides it
 * for the rest of the session only, so it returns until notifications are on.
 */
export function NotificationBanner() {
  const { state, error, toggle } = useNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || (state !== "off" && state !== "working")) return null;

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* Private mode: it simply comes back next load. */
    }
  }

  return (
    <div className={styles.notifyBanner} role="region" aria-label="Notifications">
      <IconBell size={18} color="currentColor" />
      <span className={styles.notifyBannerText}>{error || "Notifications are off"}</span>
      <button
        type="button"
        className={styles.notifyBannerAction}
        onClick={toggle}
        disabled={state === "working"}
      >
        Turn on
      </button>
      <button type="button" className={styles.notifyBannerClose} onClick={close} aria-label="Dismiss">
        <IconTimes size={14} color="currentColor" />
      </button>
    </div>
  );
}

/** The bell beside the avatar. Hidden where push cannot work at all. */
export function NotificationBell() {
  const { state, toggle } = useNotifications();
  if (state === "loading" || state === "unsupported" || state === "denied") return null;

  const on = state === "on";
  return (
    <button
      type="button"
      className={`${styles.bell} ${on ? styles.bellOn : ""}`}
      onClick={toggle}
      disabled={state === "working"}
      aria-pressed={on}
      title={on ? "Notifications on — tap to turn off" : "Turn on notifications"}
      aria-label={on ? "Notifications on, tap to turn off" : "Turn on notifications"}
    >
      {on ? <IconBell size={17} color="currentColor" /> : <IconBellOff size={17} color="currentColor" />}
    </button>
  );
}

/**
 * The account menu carries only the cases the bell cannot: where push is
 * unavailable or blocked, which need a sentence rather than an icon. When it
 * works, the bell in the header is the only control.
 */
export default function NotificationToggle() {
  const { state } = useNotifications();

  if (state === "unsupported") {
    return (
      <div className={styles.notifyNote}>
        Add this app to your home screen to get notifications.
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className={styles.notifyNote}>
        Notifications are blocked. Allow them for this app in your device settings.
      </div>
    );
  }

  return null;
}
