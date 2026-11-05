"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Section = "overview" | "settings" | "badges" | "assets" | "description" | "misc" | "sections" | "widgets" | "projects" | "links";

const ACCOUNT_ITEMS: { label: string; id: Section }[] = [
  { label: "Overview", id: "overview" },
  { label: "Settings", id: "settings" },
  { label: "Badges", id: "badges" },
];

const COMPONENT_ITEMS: { label: string; id: Section; icon: string }[] = [
  { label: "Assets", id: "assets", icon: "/icons/asset.png" },
  { label: "Description", id: "description", icon: "/icons/description.png" },
  { label: "Miscs", id: "misc", icon: "/icons/misc.png" },
  { label: "Sections", id: "sections", icon: "/icons/widgets.png" },
  { label: "Widgets", id: "widgets", icon: "/icons/sections.png"},
  { label: "Projects", id: "projects", icon: "/icons/projects.png"},
  { label: "Links", id: "Links", icon: "/icons/links.ong"}
];

// Sidebar nav. Switching items changes the panel, never the URL.
export default function DashboardNav({
  active,
  onSelect,
}: {
  active: Section;
  onSelect: (id: Section) => void;
}) {
  const [open, setOpen] = useState(true);

  // Sliding hover pill: glides to whatever you hover, and back to the active
  // item when the mouse leaves (hidden if the active item is collapsed away).
  const navRef = useRef<HTMLElement>(null);
  const hoverEl = useRef<HTMLElement | null>(null);
  const wasVisible = useRef(false);
  const [pill, setPill] = useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    r: 14,
    visible: false,
    instant: true,
  });

  const place = useCallback((el: HTMLElement | null) => {
    const nav = navRef.current;
    if (!nav) return;
    let target = el;
    if (!target) {
      target = nav.querySelector<HTMLElement>('[data-active="true"]');
      // Active item sits in the closed dropdown: nothing to show
      if (target?.closest('.dnav__sub[data-open="false"]')) target = null;
    }
    if (!target) {
      wasVisible.current = false;
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const n = nav.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const instant = !wasVisible.current;
    wasVisible.current = true;
    setPill({
      x: t.left - n.left,
      y: t.top - n.top,
      w: t.width,
      h: t.height,
      r: parseFloat(getComputedStyle(target).borderRadius) || 12,
      visible: true,
      instant,
    });
  }, []);

  // Re-place after selecting / opening / closing (layout moves while it animates)
  useLayoutEffect(() => {
    place(hoverEl.current);
  }, [active, open, place]);

  useEffect(() => {
    const id = window.setTimeout(() => place(hoverEl.current), 230);
    return () => window.clearTimeout(id);
  }, [active, open, place]);

  const onOver = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-nav-item]");
    if (el && el !== hoverEl.current) {
      hoverEl.current = el;
      place(el);
    }
  };

  const onLeave = () => {
    hoverEl.current = null;
    place(null);
  };

  return (
    <nav
      className="dnav"
      aria-label="Dashboard"
      ref={navRef}
      onMouseOver={onOver}
      onMouseLeave={onLeave}
    >
      <span
        className="dnav__pill"
        aria-hidden="true"
        data-instant={pill.instant}
        style={{
          width: pill.w,
          height: pill.h,
          borderRadius: pill.r,
          opacity: pill.visible ? 1 : 0,
          transform: `translate(${pill.x}px, ${pill.y}px)`,
        }}
      />

      <p className="dnav__label">Dashboard</p>

      <button
        type="button"
        className="dnav__item"
        data-nav-item
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dnav__icon" src="/icons/user.png" alt="" width={22} height={22} draggable={false} />
        <span className="dnav__text">Account</span>
        <svg
          className="dnav__chevron"
          data-open={open}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className="dnav__sub" data-open={open}>
        <div className="dnav__sub-inner">
          <ul className="dnav__list">
            {ACCOUNT_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="dnav__sub-item"
                  data-nav-item
                  data-active={active === item.id}
                  tabIndex={open ? 0 : -1}
                  onClick={() => onSelect(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="dnav__label dnav__label--section">Components</p>
      {COMPONENT_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="dnav__item"
          data-nav-item
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dnav__icon" src={item.icon} alt="" width={22} height={22} draggable={false} />
          <span className="dnav__text">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}