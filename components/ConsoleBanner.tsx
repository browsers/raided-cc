"use client";

import { useEffect } from "react";

// The console can't truly centre text (the page can't see how wide DevTools is),
// so we centre the banner on this x position instead, in px from the left edge
// of the console. 260 fits panels down to ~400px wide without wrapping; bigger
// pushes the banner right, smaller pushes it left. If DevTools is docked to the
// side when the page loads, the real panel width is used instead.
const DEFAULT_CENTER_X = 260;

const TITLE = "RAIDED";
const TITLE_SIZE = 64;
const TITLE_SPACING = 8;
const SUB = "created by @factor on tiktok";
const SUB_SIZE = 14;

function textWidth(text: string, font: string, spacing = 0) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width + spacing * text.length;
}

// Prints a banner in the browser console (once per page load).
export default function ConsoleBanner() {
  useEffect(() => {
    const w = window as unknown as { __raidedBanner?: boolean };
    if (w.__raidedBanner) return; // dev strict mode runs effects twice
    w.__raidedBanner = true;

    const titleW = textWidth(TITLE, `900 ${TITLE_SIZE}px monospace`, TITLE_SPACING);
    const subW = textWidth(SUB, `${SUB_SIZE}px monospace`);
    // Docked to the side: the width DevTools takes from the window is the panel width.
    const side = window.outerWidth - window.innerWidth;
    const centerX = side > 250 ? (side - 20) / 2 : DEFAULT_CENTER_X;
    const left = (width: number) => Math.max(0, Math.round(centerX - width / 2));

    // No colours or background: uses the console's own text colour.
    console.log(
      `%c${TITLE}`,
      `font-size:${TITLE_SIZE}px;font-weight:900;letter-spacing:${TITLE_SPACING}px;padding:10px 0 0 ${left(titleW)}px;`,
    );
    console.log(
      `%c${SUB}`,
      `font-size:${SUB_SIZE}px;padding:0 0 10px ${left(subW)}px;`,
    );
  }, []);

  return null;
}