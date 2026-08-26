"use client";

import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";
import { IconBell, IconBellOff } from "./Icons";

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

/**
 * Shared state for both places this appears: an icon in the header, and a
 * labelled row in the account menu that has room to explain itself.
 */
function useNotifications() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    /* serviceWorker.ready never settles when no worker activates — it does not
       reject either — so waiting on it alone left this stuck on "loading" and
       rendering nothing at all. Assume off unless a subscription turns up. */
    let done = false;
    const settle = (s: State) => {
      if (!done) {
        done = true;
        setState(s);
      }
    };
    const timeout = setTimeout(() => settle("off"), 3000);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        clearTimeout(timeout);
        settle(sub ? "on" : "off");
      })
      .catch(() => {
        clearTimeout(timeout);
        settle("off");
      });

    return () => clearTimeout(timeout);
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
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
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
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
      setState("off");
    } catch {
      setState("on");
    }
  }

  return { state, toggle: () => (state === "on" ? disable() : enable()) };
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
