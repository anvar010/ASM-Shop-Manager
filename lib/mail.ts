import nodemailer from "nodemailer";

/*
 * Mail is optional. With SMTP_HOST unset the app runs exactly as before and
 * every send quietly does nothing, so a missing mail server can never stop a
 * shopkeeper recording a sale.
 */

declare global {
  var __asmMailer: nodemailer.Transporter | undefined;
}

export function mailEnabled(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter(): nodemailer.Transporter {
  if (!globalThis.__asmMailer) {
    globalThis.__asmMailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      // Implicit TLS on 465; on 587 the connection upgrades via STARTTLS.
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return globalThis.__asmMailer;
}

/** Everyone who should receive the shop's own notifications. */
function admins(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export async function sendToAdmin(subject: string, html: string, text: string): Promise<boolean> {
  if (!mailEnabled()) return false;
  const to = admins();
  if (to.length === 0) return false;

  try {
    await transporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      ...(process.env.MAIL_REPLY_TO ? { replyTo: process.env.MAIL_REPLY_TO } : {}),
      subject,
      text,
      html,
    });
    return true;
  } catch (e) {
    // A ledger write must not fail because the mail server did.
    console.error("mail: could not send", e);
    return false;
  }
}
