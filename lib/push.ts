import webpush from "web-push";
import { db } from "./db";

/*
 * Push is optional, exactly like mail. Without VAPID keys every send quietly
 * does nothing rather than failing a payment that has already been recorded.
 */

let configured = false;

export function pushEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured || !pushEnabled()) return;
  webpush.setVapidDetails(
    // A contact for the push service to reach if something misbehaves.
    `mailto:${process.env.ADMIN_EMAIL?.split(",")[0]?.trim() || "admin@example.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Where tapping the notification should land. */
  url?: string;
  /** Same tag replaces an earlier notification rather than stacking on it. */
  tag?: string;
}

interface Row {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Notifies every device belonging to an owner. Never throws. */
export async function pushToAdmins(message: PushMessage): Promise<number> {
  if (!pushEnabled()) return 0;
  configure();

  try {
    const [rows] = await db().query(
      `SELECT s.id, s.endpoint, s.p256dh, s.auth
       FROM push_subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE u.role = 'admin' AND u.active = 1`,
    );
    const subs = rows as Row[];
    if (subs.length === 0) return 0;

    const payload = JSON.stringify(message);
    const dead: string[] = [];

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush
          .sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          )
          .catch((err: { statusCode?: number }) => {
            /* 404 and 410 mean the browser has thrown the subscription away —
               uninstalled, or permission revoked. Keeping it would retry a
               dead endpoint forever. */
            if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.id);
            throw err;
          }),
      ),
    );

    if (dead.length > 0) {
      await db().query("DELETE FROM push_subscriptions WHERE id IN (?)", [dead]);
    }
    return results.filter((r) => r.status === "fulfilled").length;
  } catch (e) {
    console.error("push: could not send", e);
    return 0;
  }
}
