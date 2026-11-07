"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PET,
  PET_LIMITS,
  PET_TYPES,
  type PetSettings,
  type PetType,
} from "../lib/profile-settings";
import CursorPet from "./CursorPet";
import "./MiscPanel.css";

// ---------- small building blocks (same look as the Card controls) ----------

function PetSlider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="field__row">
        <input
          className="slider slider--fluid"
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
          aria-label={label}
        />
        <label className="numbox">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(clamp(e.target.value === "" ? min : Number(e.target.value)))}
            aria-label={`${label} (${suffix})`}
          />
          <span>{suffix}</span>
        </label>
      </div>
    </div>
  );
}

function PetColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="colorbox">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <span>{value.toUpperCase()}</span>
      </span>
    </label>
  );
}

// ---------- the tab ----------

export default function MiscPanel({
  pet,
  onPet,
}: {
  pet: PetSettings;
  onPet: (next: PetSettings) => void;
}) {
  // Same idea as the Assets tab: the screen updates instantly and the save goes
  // out a moment after you stop touching the controls.
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const pending = useRef<PetSettings | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flush = async () => {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    try {
      const res = await fetch("/api/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet: next }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  };

  const update = (patch: Partial<PetSettings>) => {
    const next = { ...pet, ...patch };
    onPet(next);
    pending.current = next;
    setStatus("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 400);
  };

  // Switching tabs mid-wait: send what's left instead of dropping it
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pending.current) {
        void fetch("/api/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pet: pending.current }),
          keepalive: true,
        }).catch(() => {});
      }
    },
    [],
  );

  const L = PET_LIMITS;

  return (
    <div className="assets">
      <div className="assets__group assets__group--fill">
        <h2 className="assets__title">Cursor pet</h2>

        <div className="setting">
          <div className="setting__text">
            <span className="setting__name">Show on my profile</span>
            <span className="setting__desc">
              A pixel pet that chases your visitors&apos; cursor around your page. It only shows on
              devices with a mouse.
            </span>
          </div>
          <div className="setting__controls">
            <button
              type="button"
              role="switch"
              aria-checked={pet.enabled}
              aria-label="Show cursor pet on my profile"
              className="switch"
              data-on={pet.enabled}
              onClick={() => update({ enabled: !pet.enabled })}
            >
              <span className="switch__thumb" />
            </button>
          </div>
        </div>

        <div className="cust-grid">
          <section className="panel">
            <div className="setting__text">
              <span className="setting__name">Preview</span>
              <span className="setting__desc">
                Move your mouse over the box. Hold still and it sits down.
              </span>
            </div>
            <div className="pet-stage">
              <CursorPet settings={pet} scope="box" />
            </div>
          </section>

          <section className="panel">
            <div className="setting__text">
              <span className="setting__name">Look and feel</span>
              <span className="setting__desc">Changes show in the preview right away.</span>
            </div>
            <div className="panel__fields">
              <label className="field">
                <span className="field__label">Pet</span>
                <select
                  className="select"
                  value={pet.type}
                  onChange={(e) => update({ type: e.target.value as PetType })}
                >
                  {PET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <PetSlider
                label="Size"
                value={pet.size}
                min={L.size.min}
                max={L.size.max}
                suffix="%"
                onChange={(size) => update({ size })}
              />
              {pet.type === "snake" && (
                <PetSlider
                  label="Length"
                  value={pet.length}
                  min={L.length.min}
                  max={L.length.max}
                  suffix="px"
                  onChange={(length) => update({ length })}
                />
              )}
              <PetSlider
                label="Speed"
                value={pet.speed}
                min={L.speed.min}
                max={L.speed.max}
                suffix="%"
                onChange={(speed) => update({ speed })}
              />
              <PetSlider
                label="Stop distance"
                value={pet.distance}
                min={L.distance.min}
                max={L.distance.max}
                suffix="px"
                onChange={(distance) => update({ distance })}
              />
              <PetSlider
                label="Opacity"
                value={pet.opacity}
                min={L.opacity.min}
                max={L.opacity.max}
                suffix="%"
                onChange={(opacity) => update({ opacity })}
              />
              <PetColor label="Color" value={pet.color} onChange={(color) => update({ color })} />
              <button
                type="button"
                className="pet-reset"
                onClick={() => update({ ...DEFAULT_PET, enabled: pet.enabled, type: pet.type })}
              >
                Reset look
              </button>
            </div>
          </section>
        </div>

        <p className="setting__status" data-error={status === "error"}>
          {status === "saving" && "Saving..."}
          {status === "saved" && "Saved."}
          {status === "error" && "Couldn't save. Try again."}
        </p>
      </div>
    </div>
  );
}