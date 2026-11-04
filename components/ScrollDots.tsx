"use client";

import { useEffect, useRef } from "react";

const COUNT = 3;

/**
 * Side dots that follow scroll progress. The dot for the section you're on is a
 * tall pill; scrolling toward the next one shrinks it while the next grows.
 * Sizes are written straight to the DOM from a rAF loop (no React re-renders),
 * so they track the scroll position exactly, and because one dot's loss is
 * the other's gain the column never changes height or jitters.
 */
export default function ScrollDots() {
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let current = -1; // last painted progress, to skip redundant writes

    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * (COUNT - 1) : 0;
      const progress = Math.min(COUNT - 1, Math.max(0, p));
      if (Math.abs(progress - current) < 0.0005) return;
      current = progress;

      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        // 1 when this dot is the current section, 0 when a full section away
        const t = Math.max(0, 1 - Math.abs(progress - i));
        el.style.setProperty("--t", t.toFixed(4));
        el.setAttribute("aria-current", t > 0.5 ? "true" : "false");
      });
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (i: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (max / (COUNT - 1)) * i, behavior: "smooth" });
  };

  return (
    <nav className="dots" aria-label="Sections">
      {Array.from({ length: COUNT }, (_, i) => (
        <button
          key={i}
          type="button"
          className="dots__dot"
          style={{ ["--t" as string]: i === 0 ? 1 : 0 }}
          aria-label={`Go to section ${i + 1}`}
          aria-current={i === 0 ? "true" : "false"}
          ref={(el) => {
            dotRefs.current[i] = el;
          }}
          onClick={() => goTo(i)}
        />
      ))}
    </nav>
  );
}
