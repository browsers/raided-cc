"use client";

import Link from "next/link";
import { useState } from "react";
import Turnstile from "./Turnstile";

const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9._-]/g, "");

const COMMON = ["password", "12345678", "123456789", "qwertyui", "iloveyou", "11111111"];

// 0 = empty, 1 = weak (red), 2 = okay (yellow), 3 = strong (green)
function strength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  if (pw.length < 8 || COMMON.some((c) => pw.toLowerCase().includes(c))) return 1;
  let points = 1; // 8+ chars
  if (pw.length >= 12) points++;
  if (pw.length >= 16) points++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points++;
  if (/\d/.test(pw)) points++;
  if (/[^A-Za-z0-9]/.test(pw)) points++;
  if (points <= 2) return 1;
  if (points === 3) return 2;
  return 3;
}

export default function SignupForm({ initialUsername }: { initialUsername: string }) {
  const [username, setUsername] = useState(clean(initialUsername).slice(0, 24));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [done, setDone] = useState(false);
  const level = strength(password);

  // Posts to /api/signup, which checks Turnstile first. Account creation itself
  // is the TODO inside app/api/signup/route.ts.
  async function createAccount(payload: {
    username: string;
    email: string;
    password: string;
    turnstileToken: string;
  }) {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Something went wrong.");
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3) return setError("Username must be at least 3 characters.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    if (!token) return setError("Please complete the verification.");

    setLoading(true);
    try {
      await createAccount({
        username,
        email: email.trim(),
        password,
        turnstileToken: token,
      });
      setDone(true);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResetKey((k) => k + 1); // tokens are single-use
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="auth__logo" src="/dock.png" alt="" width={36} height={36} draggable={false} />
        <h1 className="auth__title">You&apos;re in</h1>
        <p className="auth__sub">raided.cc/{username} is yours.</p>
        <Link className="auth__btn" href="/" style={{ textDecoration: "none" }}>
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form className="auth__card" method="post" onSubmit={onSubmit} noValidate={false}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="auth__logo" src="/dock.png" alt="" width={36} height={36} draggable={false} />
      <h1 className="auth__title">Create your account</h1>
      <p className="auth__sub">Claim your link and make it yours.</p>

      <label className="auth__label" htmlFor="su-username">Username</label>
      <div className="auth__handle">
        <span className="auth__prefix">raided.cc/</span>
        <input
          id="su-username"
          className="auth__input auth__input--bare"
          type="text"
          name="username"
          placeholder="you"
          value={username}
          onChange={(e) => setUsername(clean(e.target.value))}
          maxLength={24}
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </div>

      <label className="auth__label" htmlFor="su-email">Email</label>
      <input
        id="su-email"
        className="auth__input"
        type="email"
        name="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <label className="auth__label" htmlFor="su-password">Password</label>
      <input
        id="su-password"
        className="auth__input"
        type="password"
        name="password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        onFocus={() => setPwFocus(true)}
        onBlur={() => setPwFocus(false)}
        required
      />

      <div
        className="auth__strength"
        data-open={pwFocus || password.length > 0}
        data-level={level}
        aria-hidden="true"
      >
        <div className="auth__strength-inner">
          <span className="auth__bar" />
          <span className="auth__bar" />
          <span className="auth__bar" />
        </div>
      </div>

      <Turnstile onToken={setToken} resetKey={resetKey} />

      {error && (
        <p className="auth__error" role="alert">
          {error}
        </p>
      )}

      <button className="auth__btn" type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
        {!loading && (
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>

      <p className="auth__foot">
        Already have an account? <Link href="/login" prefetch={false}>Log in</Link>
      </p>
    </form>
  );
}