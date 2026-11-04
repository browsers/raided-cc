"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import AssetsPanel from "./AssetsPanel";
import DashboardNav, { type Section } from "./DashboardNav";

export default function DashboardShell({
  username,
  displayName,
  image: initialImage,
  uid,
}: {
  username: string;
  displayName: string;
  image: string | null;
  uid: number | null;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [image, setImage] = useState<string | null>(initialImage);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const shareProfile = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${username}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const avatar = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" draggable={false} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="dash__avatar-default" src="/icons/user.png" alt="" draggable={false} />
  );

  const logout = async () => {
    await authClient.signOut();
    window.location.assign("/");
  };

  return (
    <>
      {/* Black sidebar */}
      <aside className="dash__side" aria-label="Sidebar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="dash__brand">
          <img className="dash__logo" src="/dock.png" alt="" width={36} height={36} draggable={false} />
          <span className="dash__brand-text">raided.cc</span>
        </div>
        <DashboardNav active={section} onSelect={setSection} />

        {/* Account card, pinned to the bottom of the sidebar. Click it for the menu. */}
        <div className="dash__account" ref={accountRef}>
          {menuOpen && (
            <div className="dmenu" role="menu" aria-label="Account menu">
              <div className="dmenu__head">
                <span className="dash__avatar dmenu__avatar">{avatar}</span>
                <span className="dash__user-text">
                  <span className="dash__user-name">{displayName}</span>
                  <span className="dash__user-handle">
                    @{username}
                    {uid !== null && <> &middot; UID {uid}</>}
                  </span>
                </span>
              </div>
              <div className="dmenu__sep" />
              <button type="button" className="dmenu__item" role="menuitem" onClick={shareProfile}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                </svg>
                {copied ? "Link copied!" : "Share your profile"}
              </button>
              <button
                type="button"
                className="dmenu__item"
                role="menuitem"
                onClick={() => {
                  setSection("settings");
                  setMenuOpen(false);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" />
                </svg>
                Account settings
              </button>
              <a
                className="dmenu__item"
                role="menuitem"
                href={`/${username}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
                View my page
              </a>
            </div>
          )}

          <div
            className="dash__user"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMenuOpen((o) => !o);
              }
            }}
          >
            <span className="dash__avatar">{avatar}</span>
            <span className="dash__user-text">
              <span className="dash__user-name">{displayName}</span>
              <span className="dash__user-handle">/{username}</span>
            </span>
            <button
              type="button"
              className="dash__logout"
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              aria-label="Log out"
              title="Log out"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/logout.png" alt="" width={22} height={22} draggable={false} />
            </button>
          </div>
        </div>
      </aside>

      {/* The big rounded square. Empty for now; each section renders in here. */}
      <main className="dash__panel">
        {section === "overview" && null}
        {section === "settings" && null}
        {section === "badges" && null}
        {section === "assets" && <AssetsPanel image={image} onAvatar={setImage} />}
        {section === "description" && null}
      </main>
    </>
  );
}