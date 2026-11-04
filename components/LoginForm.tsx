"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../lib/auth-client";

export default function LoginForm() {
  const [login, setLogin] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = login.trim().toLowerCase();
    if (!id || !password) return setError("Enter your username and password.");

    setLoading(true);
    try {
      const res = id.includes("@")
        ? await authClient.signIn.email({ email: id, password })
        : await authClient.signIn.username({ username: id, password });

      if (res.error) {
        const { status, message } = res.error;
        // 401 = bad credentials. Anything else is a setup problem, so show it.
        setError(
          status === 401 || status === 400
            ? "Wrong username or password."
            : `Sign in failed (${status || "network"}${message ? `: ${message}` : ""}).`,
        );
        return;
      }
      // Full page load so the dock picks up the new session straight away.
      window.location.assign("/dashboard");
    } catch {
      setError("Couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth__card" onSubmit={onSubmit}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="auth__logo" src="/dock.png" alt="" width={36} height={36} draggable={false} />
      <h1 className="auth__title">Welcome back</h1>
      <p className="auth__sub">Sign in to your dashboard.</p>

      <label className="auth__label" htmlFor="li-login">Username or email</label>
      <input
        id="li-login"
        className="auth__input"
        type="text"
        name="username"
        placeholder="you"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        required
      />

      <label className="auth__label" htmlFor="li-password">Password</label>
      <input
        id="li-password"
        className="auth__input"
        type="password"
        name="password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      {error && (
        <p className="auth__error" role="alert">
          {error}
        </p>
      )}

      <button className="auth__btn" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="auth__foot">
        Need an account? <Link href="/signup" prefetch={false}>Sign up</Link>
      </p>
    </form>
  );
}