"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";

// TODO: swap for your real invite link.
const DISCORD_URL = "https://discord.gg/";

// Icons live in /public/icons/<icon>.png. They sit left of the label and stay put as the bar lifts off the top edge.
const links = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: "/icons/trophy.png",
    iconClass: "dock__icon--trophy",
  },
  {
    href: "#section-3",
    label: "Components",
    icon: "/icons/components.png",
    iconClass: "dock__icon--components",
  },
  {
    href: "/support",
    label: "Help Center",
    icon: "/icons/info.png",
    iconClass: "dock__icon--info",
  },
];

export default function Dock() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = session?.user as
    | { name?: string; image?: string | null; username?: string | null; displayUsername?: string | null }
    | undefined;
  const shownName = user?.displayUsername || user?.username || user?.name || "";

  // Close the account menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const logout = async () => {
    setMenuOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
  const [hl, setHl] = useState({ x: 0, w: 0, show: false, slide: false });

  const targetRef = useRef<HTMLElement | null>(null);

  // Slide the highlight to a link. The first move after it was hidden jumps
  // into place (no slide across from the old spot); later moves glide.
  const moveTo = (el: HTMLElement, animate = true) => {
    targetRef.current = el;
    setHl((h) => ({
      x: el.offsetLeft,
      w: el.offsetWidth,
      show: true,
      slide: animate && h.show,
    }));
  };

  // Rest on the current page's link, or fade out if there isn't one.
  const rest = useCallback(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) moveTo(active);
    else {
      targetRef.current = null;
      setHl((h) => ({ ...h, show: false }));
    }
  }, []);

  // Keep the highlight glued to its link if the link's size changes (font
  // load, window resize). No gliding, it just follows.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (targetRef.current) moveTo(targetRef.current, false);
    });
    list.querySelectorAll("a").forEach((a) => ro.observe(a));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    rest();
  }, [pathname, rest]);

  // Lift off the top edge after a small scroll, and hang from it again once
  // you're (nearly) at the top. Two thresholds, so it can't flicker
  // back and forth around a single scroll position.
  useEffect(() => {
    const onScroll = () =>
      setScrolled((was) => (was ? window.scrollY > 8 : window.scrollY > 32));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="dock" data-scrolled={scrolled}>
      <nav className="dock__bar" aria-label="Main">
        <Link href="/" className="dock__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dock__brand-icon" src="/dock.png" alt="" width={26} height={26} />
          raided.cc
        </Link>

        <ul className="dock__links" ref={listRef} onMouseLeave={rest}>
          <li
            aria-hidden="true"
            className={`dock__hl${hl.slide ? " dock__hl--slide" : ""}`}
            style={{
              width: hl.w,
              transform: `translateX(${hl.x}px)`,
              opacity: hl.show ? 1 : 0,
            }}
          />
          {links.map(({ href, label, icon, iconClass }) => (
            <li key={href}>
              <Link
                href={href}
                className="dock__link"
                prefetch={false} // these pages don't exist yet; remove once they do
                aria-label={label}
                title={label}
                aria-current={pathname === href ? "page" : undefined}
                onMouseEnter={(e) => moveTo(e.currentTarget)}
                onFocus={(e) => moveTo(e.currentTarget)}
                onBlur={rest}
                onClick={(e) => {
                  if (!href.startsWith("#")) return;
                  e.preventDefault();
                  const target = document.getElementById(href.slice(1));
                  if (!target) return;
                  window.scrollTo({
                    top: target.getBoundingClientRect().top + window.scrollY,
                    behavior: "smooth",
                  });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={`dock__icon ${iconClass}`}
                  src={icon}
                  alt=""
                  width={20}
                  height={20}
                />
                <span className="dock__text">
                  <span>{label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <a
          href={DISCORD_URL}
          className="dock__discord"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
          </svg>
          <span>Discord</span>
        </a>

        <div className="dock__account" ref={userRef}>
          {user ? (
            <>
              <button
                type="button"
                className="dock__user dock__user--pill"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="dock__avatar">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" draggable={false} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="dock__avatar-default" src="/icons/user.png" alt="" draggable={false} />
                  )}
                </span>
                <span className="dock__username">{shownName}</span>
                <svg className="dock__chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
                  <path d="M0 0h10L5 6z" fill="currentColor" />
                </svg>
              </button>

              {menuOpen && (
                <div className="dock__menu" role="menu">
                  <Link href="/dashboard" className="dock__menu-item" role="menuitem" prefetch={false} onClick={() => setMenuOpen(false)}>
                    <span className="dock__menu-icon" style={{ maskImage: "url(/icons/dashboard.png)", WebkitMaskImage: "url(/icons/dashboard.png)" }} />
                    Dashboard
                  </Link>
                  <div className="dock__menu-sep" />
                  <button type="button" className="dock__menu-item dock__menu-item--danger" role="menuitem" onClick={logout}>
                    <span className="dock__menu-icon" style={{ maskImage: "url(/icons/logout.png)", WebkitMaskImage: "url(/icons/logout.png)" }} />
                    Logout
                  </button>
                </div>
              )}
            </>
          ) : isPending ? null : (
            <Link href="/login" className="dock__user dock__user--text" prefetch={false}>
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}