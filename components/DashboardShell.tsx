"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import AssetsPanel from "./AssetsPanel";
import type { Background } from "../lib/r2";
import type { AvatarSettings, TooltipSettings } from "../lib/profile-settings";
import DashboardNav, { type Section } from "./DashboardNav";

export default function DashboardShell({
  username,
  displayName,
  image: initialImage,
  uid,
  background: initialBackground,
  cardOpacity: initialCardOpacity,
  avatarLayout: initialAvatarLayout,
  tooltip: initialTooltip,
}: {
  username: string;
  displayName: string;
  image: string | null;
  uid: number | null;
  background: Background | null;
  cardOpacity: number;
  avatarLayout: AvatarSettings;
  tooltip: TooltipSettings;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [image, setImage] = useState<string | null>(initialImage);
  const [background, setBackground] = useState<Background | null>(initialBackground);
  const [cardOpacity, setCardOpacity] = useState(initialCardOpacity);
  const [avatarLayout, setAvatarLayout] = useState(initialAvatarLayout);
  const [tooltip, setTooltip] = useState(initialTooltip);

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
          {/* Always mounted so it can fade out; data-open drives the transition */}
          {(
            <div
              className="dmenu"
              role="menu"
              aria-label="Account menu"
              data-open={menuOpen}
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="dmenu__icon" src="/icons/share.png" alt="" width={20} height={20} draggable={false} />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="dmenu__icon" src="/icons/setting.png" alt="" width={20} height={20} draggable={false} />
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="dmenu__icon" src="/icons/page.png" alt="" width={20} height={20} draggable={false} />
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
        {section === "assets" && (
          <AssetsPanel
            image={image}
            onAvatar={setImage}
            background={background}
            onBackground={setBackground}
            cardOpacity={cardOpacity}
            onCardOpacity={setCardOpacity}
            avatarLayout={avatarLayout}
            onAvatarLayout={setAvatarLayout}
            tooltip={tooltip}
            onTooltip={setTooltip}
          />
        )}
        {section === "description" && null}
      </main>
    </>
  );
}