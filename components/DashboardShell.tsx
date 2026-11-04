"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import AssetsPanel from "./AssetsPanel";
import DashboardNav, { type Section } from "./DashboardNav";

export default function DashboardShell({
  username,
  displayName,
  image: initialImage,
}: {
  username: string;
  displayName: string;
  image: string | null;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [image, setImage] = useState<string | null>(initialImage);

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

        {/* Account card, pinned to the bottom of the sidebar */}
        <div className="dash__user">
          <span className="dash__avatar">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" draggable={false} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="dash__avatar-default" src="/icons/user.png" alt="" draggable={false} />
            )}
          </span>
          <span className="dash__user-text">
            <span className="dash__user-name">{displayName}</span>
            <span className="dash__user-handle">/{username}</span>
          </span>
          <button type="button" className="dash__logout" onClick={logout} aria-label="Log out" title="Log out">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logout.png" alt="" width={22} height={22} draggable={false} />
          </button>
        </div>
      </aside>

      {/* The big rounded square. Empty for now; each section renders in here. */}
      <main className="dash__panel">
        {section === "overview" && null}
        {section === "settings" && null}
        {section === "badges" && null}
        {section === "assets" && <AssetsPanel onAvatar={setImage} />}
        {section === "description" && null}
      </main>
    </>
  );
}