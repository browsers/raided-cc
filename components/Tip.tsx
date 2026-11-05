"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TipShape } from "../lib/profile-settings";
import { TAIL_H, TIP_RADIUS_PX, tipPath } from "../lib/tip-shape";

// The hover bubble. Put it inside a `.tip-host` element and give it the text:
//
//   <span className="tip-host">
//     Name
//     <Tip shape={tooltip.shape}>
//       <span className="tip__label">UID</span>
//       <span className="tip__value">1</span>
//     </Tip>
//   </span>
//
// It measures its text and draws the box and the pointer as one path (see
// lib/tip-shape.ts), so there is a single outline with no seam. The frosted
// blur and the drop shadow follow that same path. Look comes from the CSS
// variables set by tooltipVars(); animation from data-tip-anim (app/tooltip.css).

export default function Tip({
  shape,
  children,
}: {
  shape: TipShape;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // url(#id) needs an id without colons
  const filterId = `tipshadow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Measure the text box now, and again whenever it changes size (font loading,
  // different text). offsetWidth ignores the open/close scale animation.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = size ? tipPath(size.w, size.h, Math.min(TIP_RADIUS_PX[shape], size.h / 2)) : "";

  return (
    <span className="tip" role="tooltip">
      <span className="tip__body" ref={bodyRef}>
        {size && d && (
          <>
            {/* frosted blur, cut to the exact outline */}
            <span
              className="tip__blur"
              aria-hidden="true"
              style={{ width: size.w, height: size.h + TAIL_H, clipPath: `path("${d}")` }}
            />
            <svg
              className="tip__shape"
              aria-hidden="true"
              focusable="false"
              width={size.w}
              height={size.h + TAIL_H}
              viewBox={`0 0 ${size.w} ${size.h + TAIL_H}`}
            >
              <defs>
                {/* drop shadow that only shows OUTSIDE the outline, so a light or
                    see-through bubble doesn't get a grey patch inside */}
                <filter
                  id={filterId}
                  filterUnits="userSpaceOnUse"
                  x={-70}
                  y={-70}
                  width={size.w + 140}
                  height={size.h + TAIL_H + 150}
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="14" />
                  <feOffset dy="10" result="blur" />
                  <feFlood floodColor="#000" floodOpacity="0.5" />
                  <feComposite in2="blur" operator="in" result="shadow" />
                  <feComposite in="shadow" in2="SourceAlpha" operator="out" />
                </filter>
              </defs>
              <path d={d} fill="#000" filter={`url(#${filterId})`} />
              <path className="tip__outline" d={d} />
            </svg>
          </>
        )}
        <span className="tip__content">{children}</span>
      </span>
    </span>
  );
}
