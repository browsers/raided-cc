"use client";

import { useRef, useState } from "react";
import { authClient } from "../lib/auth-client";

type BoxId = "pfp" | "background" | "music";

const BOXES: { id: BoxId; label: string; icon: string; accept: string }[] = [
  { id: "pfp", label: "Profile Picture", icon: "/icons/drag.png", accept: "image/png,image/jpeg,image/gif,image/webp" },
  { id: "background", label: "Background", icon: "/icons/drag.png", accept: "image/*,video/*" },
  { id: "music", label: "Music", icon: "/icons/songs.png", accept: "audio/*" },
];

export default function AssetsPanel({
  image,
  onAvatar,
}: {
  image: string | null;
  onAvatar: (url: string) => void;
}) {
  const [over, setOver] = useState<BoxId | null>(null);
  const [busy, setBusy] = useState<BoxId | null>(null);
  const [note, setNote] = useState<{ box: BoxId; text: string; error?: boolean } | null>(null);
  const inputs = useRef<Partial<Record<BoxId, HTMLInputElement | null>>>({});

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

  const handle = (id: BoxId, file: File | undefined) => {
    if (!file) return;
    if (id === "pfp") return void uploadAvatar(file);
    // Background and music uploads come later.
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
            <span className="assets__label">{b.label}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {!(b.id === "pfp" && image) && (
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
    </div>
  );
}