"use client";

import Image from "next/image";
import { useState } from "react";
import c from "./LoginForm.module.css";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Wrong username or password");
        setBusy(false);
        return;
      }
      /* Read the redirect target here rather than with useSearchParams, which
         would force the whole form behind a Suspense boundary and prerender
         this page as an empty shell.

         A full navigation, not a client push: the session cookie has to be on
         the next request for middleware to let it through. */
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch {
      setError("Could not reach the server");
      setBusy(false);
    }
  }

  return (
    <div className={c.screen}>
      <form className={c.card} onSubmit={submit}>
        {/* Decorative only — the logo below carries the name. */}
        <div className={c.banner}>
          <Image
            src="/fruits-band.png"
            alt=""
            width={735}
            height={199}
            sizes="(max-width: 420px) 100vw, 380px"
            className={c.bannerImage}
            aria-hidden="true"
            priority
          />
        </div>

        <div className={c.brand}>
          <Image
            src="/logo-mark.png"
            alt="ASM Daily Fresh"
            width={900}
            height={441}
            sizes="130px"
            className={c.logo}
            priority
          />
        </div>

        <div className={c.title}>Sign in</div>
        <div className={c.subtitle}>Sign in with the account your shop gave you.</div>

        <label className={c.field}>
          <span className={c.label}>Email</span>
          <input
            className={c.input}
            type="email"
            inputMode="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>

        <label className={c.field}>
          <span className={c.label}>Password</span>
          <input
            className={c.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className={c.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" className={c.submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
