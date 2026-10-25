"use client";

import { useEffect, useRef } from "react";
import { background, wordField } from "asciify-engine/kit";

/**
 * Field, mounted behind the homepage. The engine keeps itself paused while
 * off screen or in a hidden tab, follows the dark ground, and holds a still
 * frame when the visitor prefers reduced motion.
 */
export default function FieldBackground() {
  const host = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    const bg = background(element, {
      preset: wordField,
      text: "ASCIIFY",
      // The site is a dark ground only, so the ink stays this colour either way.
      palette: "#8f8d86",
      speed: 1,
      cellSize: 13,
      mark: "glyph",
      cursor: "lantern",
      opacity: 1,
      dither: 0,
      look: { scene: "flow" },
    });

    return () => bg.destroy();
  }, []);

  return <main ref={host} id="hero" className="page" aria-label="raided.cc" />;
}
