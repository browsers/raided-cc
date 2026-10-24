"use client";

import { useRef } from "react";

const LINKS = [
  { label: "TikTok", handle: "@yourname" },
  { label: "X", handle: "@yourname" },
  { label: "GitHub", handle: "yourname" },
  { label: "Discord", handle: "Join the server" },
];

export default function TiltCard({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = name || "yourname";

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
  }

  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div className="stage" onPointerMove={move} onPointerLeave={leave}>
      <div className="card" ref={ref}>
        <div className="card-head">
          <div className="avatar" aria-hidden="true">
            {shown.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="card-name">{shown}</p>
            <p className="card-bio">Clips, code and a Discord that never sleeps.</p>
          </div>
        </div>
        <ul className="card-links">
          {LINKS.map((l) => (
            <li key={l.label}>
              <span>{l.label}</span>
              <span className="card-handle">{l.handle}</span>
            </li>
          ))}
        </ul>
        <p className="card-views">1,204 views</p>
      </div>
    </div>
  );
}
