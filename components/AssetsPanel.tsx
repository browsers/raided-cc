"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import type { Background } from "../lib/r2";

type BoxId = "pfp" | "background" | "music";

const BOXES: { id: BoxId; label: string; icon: string; accept: string }[] = [
  { id: "pfp", label: "Profile Picture", icon: "/icons/drag.png", accept: "image/png,image/jpeg,image/gif,image/webp" },
  { id: "background", label: "Background", icon: "/icons/drag.png", accept: "image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" },
  { id: "music", label: "Music", icon: "/icons/songs.png", accept: "audio/*" },
];

export default function AssetsPanel({
  image,
  onAvatar,
  background,
  onBackground,
  cardOpacity,
  onCardOpacity,
}: {
  image: string | null;
  onAvatar: (url: string) => void;
  background: Background | null;
  onBackground: (bg: Background) => void;
  cardOpacity: number;
  onCardOpacity: (value: number) => void;
}) {
  const [over, setOver] = useState<BoxId | null>(null);
  const [busy, setBusy] = useState<BoxId | null>(null);
  const [note, setNote] = useState<{ box: BoxId; text: string; error?: boolean } | null>(null);
  const inputs = useRef<Partial<Record<BoxId, HTMLInputElement | null>>>({});

  // Card opacity: updates instantly, saves a moment after you stop moving it
  const [opacityStatus, setOpacityStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const changeOpacity = (raw: number) => {
    const value = Math.min(100, Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0)));
    onCardOpacity(value);
    setOpacityStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opacity: value }),
        });
        setOpacityStatus(res.ok ? "saved" : "error");
      } catch {
        setOpacityStatus("error");
      }
    }, 400);
  };

  const uploadAvatar = async (file: File) => {
    setBusy("pfp");
    setNote(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setNote({ box: "pfp", text: data.error ?? "Upload failed. Try again.", error: true });
        return;
      }
      onAvatar(data.url); // sidebar pill
      authClient.$store.notify("$sessionSignal"); // dock reads the session
      setNote({ box: "pfp", text: "Profile picture updated." });
    } catch {
      setNote({ box: "pfp", text: "Upload failed. Try again.", error: true });
    } finally {
      setBusy(null);
    }
  };

  const uploadBackground = async (file: File) => {
    setBusy("background");
    setNote(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/background", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        kind?: "image" | "video";
        error?: string;
      };
      if (!res.ok || !data.url || !data.kind) {
        setNote({ box: "background", text: data.error ?? "Upload failed. Try again.", error: true });
        return;
      }
      onBackground({ url: data.url, kind: data.kind });
      setNote({ box: "background", text: "Background updated." });
    } catch {
      setNote({ box: "background", text: "Upload failed. Try again.", error: true });
    } finally {
      setBusy(null);
    }
  };

  const handle = (id: BoxId, file: File | undefined) => {
    if (!file) return;
    if (id === "pfp") return void uploadAvatar(file);
    if (id === "background") return void uploadBackground(file);
    // Music uploads come later.
    setNote({ box: id, text: "Uploads for this are coming soon.", error: true });
  };

  return (
    <div className="assets">
      <div className="assets__group">
        <h2 className="assets__title">Profile</h2>
        <div className="assets__grid">
        {BOXES.map((b) => (
          <div
            key={b.id}
            className="assets__box"
            data-over={over === b.id}
            data-busy={busy === b.id}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${b.label}`}
            onClick={() => inputs.current[b.id]?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputs.current[b.id]?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(b.id);
            }}
            onDragLeave={() => setOver((o) => (o === b.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              handle(b.id, e.dataTransfer.files?.[0]);
            }}
          >
            {b.id === "pfp" && image ? (
              // Current picture fills the box; it updates as soon as an upload finishes
              // eslint-disable-next-line @next/next/no-img-element
              <img className="assets__preview" src={image} alt="" draggable={false} />
            ) : null}
            {b.id === "background" && background ? (
              background.kind === "video" ? (
                <video
                  key={background.url}
                  className="assets__preview"
                  src={background.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="assets__preview" src={background.url} alt="" draggable={false} />
              )
            ) : null}
            <span className="assets__label">{b.label}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {!((b.id === "pfp" && image) || (b.id === "background" && background)) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="assets__icon" src={b.icon} alt="" draggable={false} />
            )}
            <span className="assets__hint" data-error={note?.box === b.id && note.error ? "true" : "false"}>
              {busy === b.id
                ? "Uploading..."
                : note?.box === b.id
                  ? note.text
                  : "Drag & drop or click"}
            </span>
            <input
              ref={(el) => {
                inputs.current[b.id] = el;
              }}
              type="file"
              accept={b.accept}
              hidden
              onChange={(e) => {
                handle(b.id, e.target.files?.[0]);
                e.target.value = ""; // allow picking the same file again
              }}
            />
          </div>
        ))}
        </div>
      </div>

      {/* Card settings */}
      <div className="assets__group assets__group--fill">
        <h2 className="assets__title">Card</h2>

        <div className="setting">
          <div className="setting__text">
            <span className="setting__name">Profile opacity</span>
            <span className="setting__desc">
              How see-through your profile card is. 100% is solid, 0% shows only your background.
            </span>
          </div>
          <div className="setting__controls">
            <input
              className="slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={cardOpacity}
              onChange={(e) => changeOpacity(Number(e.target.value))}
              style={{ "--fill": `${cardOpacity}%` } as React.CSSProperties}
              aria-label="Profile opacity"
            />
            <label className="numbox">
              <input
                type="number"
                min={0}
                max={100}
                value={cardOpacity}
                onChange={(e) => changeOpacity(e.target.value === "" ? 0 : Number(e.target.value))}
                aria-label="Profile opacity percent"
              />
              <span>%</span>
            </label>
          </div>
        </div>

        <p className="setting__status" data-error={opacityStatus === "error"}>
          {opacityStatus === "saving" && "Saving..."}
          {opacityStatus === "saved" && "Saved."}
          {opacityStatus === "error" && "Couldn't save. Try again."}
        </p>
      </div>
    </div>
  );
}