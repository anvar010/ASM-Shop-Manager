"use client";

import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";

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

export default function NotificationToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    /* iOS only exposes any of this to an app added to the home screen, so a
       Safari tab reports unsupported rather than an option that cannot work. */
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setState("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        // Web push forbids silent messages; every one shows a notification.
        userVisibleOnly: true,
        applicationServerKey: toKey(key),
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

  if (state === "loading") return null;

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
        Notifications are blocked. Allow them for this app in your browser settings.
      </div>
    );
  }

  const on = state === "on";
  return (
    <button
      type="button"
      className={`${styles.notifyButton} ${on ? styles.notifyOn : ""}`}
      onClick={on ? disable : enable}
      disabled={state === "working"}
    >
      {state === "working" ? "…" : on ? "Notifications on" : "Turn on notifications"}
    </button>
  );
}
