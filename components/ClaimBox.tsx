"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// TODO: point this at your real signup / register page.
// The chosen handle is passed along as ?username=<handle>.
const CLAIM_PATH = "/signup";

export default function ClaimBox() {
  const router = useRouter();
  const [handle, setHandle] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim();
    router.push(
      clean ? `${CLAIM_PATH}?username=${encodeURIComponent(clean)}` : CLAIM_PATH,
    );
  };

  return (
    <form className="claim" onSubmit={onSubmit}>
      <label className="claim__prefix" htmlFor="claim-handle">
        raided.cc/
      </label>
      <input
        id="claim-handle"
        className="claim__input"
        type="text"
        name="username"
        placeholder="you"
        value={handle}
        // lowercase, letters / numbers / . _ - only
        onChange={(e) =>
          setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
        }
        maxLength={24}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Choose your raided.cc username"
      />
      <button className="claim__btn" type="submit">
        Claim
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
      </button>
    </form>
  );
}
