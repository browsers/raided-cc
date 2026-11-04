"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Cloudflare's fixed widget size. We render it at this size (borders draw
// correctly) and scale it up to fill the card, instead of using the "flexible"
// size, which clips its right edge.
const W = 300;
const H = 65;

export default function Turnstile({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  /** Bump this number to reset the widget (tokens are single-use). */
  resetKey?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  // Fit the widget to the width of its container.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Script may already be on the page (client-side navigation).
  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!SITE_KEY || !ready || !boxRef.current || idRef.current) return;
    idRef.current = window.turnstile?.render(boxRef.current, {
      sitekey: SITE_KEY,
      theme: "dark",
      size: "normal",
      callback: (t: string) => onTokenRef.current(t),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
    });
    return () => {
      if (idRef.current) window.turnstile?.remove(idRef.current);
      idRef.current = undefined;
    };
  }, [ready]);

  useEffect(() => {
    if (resetKey > 0 && idRef.current) {
      window.turnstile?.reset(idRef.current);
      onTokenRef.current("");
    }
  }, [resetKey]);

  if (!SITE_KEY) {
    return (
      <p className="auth__error">
        Turnstile site key is missing (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div
        className="auth__turnstile"
        ref={wrapRef}
        style={{ height: H * scale }}
      >
        <div
          ref={boxRef}
          style={{
            width: W,
            height: H,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </>
  );
}