"use client";

import { useState } from "react";

const RESERVED = new Set(["admin", "login", "dashboard", "api", "settings"]);

function check(name: string) {
  if (name.length === 0) return { ok: false, msg: "Type the name you want." };
  if (name.length < 3) return { ok: false, msg: "Use at least 3 characters." };
  if (name.length > 20) return { ok: false, msg: "Use 20 characters or fewer." };
  if (!/^[a-z0-9_.]+$/.test(name))
    return { ok: false, msg: "Use letters, numbers, dots and underscores." };
  if (RESERVED.has(name)) return { ok: false, msg: "That name is reserved." };
  return { ok: true, msg: "That format works. Add your invite to claim it." };
}

export default function Claim({
  name,
  onName,
}: {
  name: string;
  onName: (v: string) => void;
}) {
  const [invite, setInvite] = useState("");
  const [sent, setSent] = useState(false);
  const result = check(name);

  return (
    <form
      id="claim"
      className="claim"
      onSubmit={(e) => {
        e.preventDefault();
        if (result.ok && invite.trim()) setSent(true);
      }}
    >
      <h1 className="claim-title">
        <label htmlFor="username" className="claim-prefix">
          raided.cc/
        </label>
        <input
          id="username"
          className="claim-input"
          value={name}
          maxLength={20}
          placeholder="yourname"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{ width: `${Math.max(name.length, 8) + 0.5}ch` }}
          onChange={(e) => {
            setSent(false);
            onName(e.target.value.toLowerCase().replace(/\s/g, ""));
          }}
        />
      </h1>

      <p className={result.ok ? "claim-status ok" : "claim-status"} role="status">
        {result.msg}
      </p>

      <div className="claim-row">
        <input
          className="invite-input"
          value={invite}
          placeholder="Invite code"
          aria-label="Invite code"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setSent(false);
            setInvite(e.target.value);
          }}
        />
        <button
          className="btn"
          type="submit"
          disabled={!result.ok || !invite.trim()}
        >
          Claim name
        </button>
      </div>

      {sent && (
        <p className="claim-status" role="status">
          Sign-up isn&apos;t connected yet. This button will create your
          account once auth is built.
        </p>
      )}
    </form>
  );
}
