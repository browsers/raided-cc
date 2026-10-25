"use client";

import { useEffect, useRef, useState } from "react";
import GlyphPortal from "@/components/ui/glyph-portal";
import HalftoneFlow from "@/components/ui/halftone-flow";

const FAMILY = '"Glyph Portal Jakarta", Arial, sans-serif';
let fontLoad: Promise<void> | undefined;

export default function GlyphPortalHome() {
  const [face, setFace] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    let settled = false;
    const finish = (value: string) => {
      if (!settled) {
        settled = true;
        setFace(value);
      }
    };
    fontLoad ??= new FontFace(
      "Glyph Portal Jakarta",
      'url("/fonts/glyph-portal-jakarta.woff2")',
      { weight: "400 700" },
    )
      .load()
      .then((font) => {
        document.fonts.add(font);
      });
    const timeout = window.setTimeout(() => finish("Arial, sans-serif"), 1600);
    void fontLoad.then(
      () => finish(FAMILY),
      () => finish("Arial, sans-serif"),
    );
    return () => {
      settled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const block = (event: Event) => {
      if (!lockedRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const keys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
    const onKey = (event: KeyboardEvent) => {
      if (!lockedRef.current) return;
      if (keys.has(event.key)) event.preventDefault();
    };
    const onScroll = () => {
      const wrapper = wrapperRef.current;
      if (!lockedRef.current || !wrapper) return;
      const max = wrapper.scrollHeight - wrapper.clientHeight;
      if (wrapper.scrollTop < max) wrapper.scrollTop = max;
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", onKey);
    const wrapper = wrapperRef.current;
    wrapper?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", onKey);
      wrapper?.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onProgress = (progress: number) => {
    if (progress < 0.8 || lockedRef.current) return;
    lockedRef.current = true;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.dataset.locked = "true";
    wrapper.style.touchAction = "none";
    wrapper.scrollTop = wrapper.scrollHeight - wrapper.clientHeight;
  };

  return (
    <div
      ref={wrapperRef}
      className="glyph-portal-home relative h-svh w-full overflow-y-auto bg-black outline-none"
      tabIndex={0}
      role="region"
      aria-label="raided.cc"
    >
      <style>{`
        .glyph-portal-home { scrollbar-width: none; }
        .glyph-portal-home::-webkit-scrollbar { display: none; }
        .glyph-portal-home [data-gp-caption],
        .glyph-portal-home [data-gp-touch-picker] { display: none !important; }
        .glyph-portal-home [data-gp-content] { padding: 0 !important; background: transparent !important; opacity: 0 !important; }
        .glyph-portal-home [data-gp-content] > * { display: none !important; }
      `}</style>
      {face ? (
        <GlyphPortal
          word="raided.cc"
          focusChar="d"
          fontFamily={face}
          fontWeight={700}
          style={{
            fontFamily: face,
            "--gp-paper": "#000",
            "--gp-ink": "#f5f5f5",
            "--gp-field": "#000",
            "--gp-foreground": "#f5f5f5",
          }}
          scrollLength={2.4}
          interactive={false}
          annotations={false}
          enterLabel="Enter"
          onProgress={onProgress}
          background={
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                transform: "scale(var(--gp-field-scale, 1))",
                transformOrigin: "center",
              }}
            >
              <HalftoneFlow className="absolute inset-0 h-full w-full" />
            </div>
          }
        >
          <div aria-hidden="true" />
        </GlyphPortal>
      ) : (
        <div className="h-full w-full bg-black" />
      )}
    </div>
  );
}
