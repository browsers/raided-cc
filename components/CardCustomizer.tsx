"use client";

import "../app/avatar.css";
import "../app/tooltip.css";
import Tip from "./Tip";
import {
  AVATAR_SHAPES,
  BORDER_STYLES,
  TIP_ANIMATIONS,
  TIP_SHAPES,
  avatarBorderVars,
  avatarRadius,
  tooltipVars,
  type AvatarSettings,
  type TooltipSettings,
} from "../lib/profile-settings";

// ---------- small building blocks ----------

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SliderField({
  label,
  value,
  min = 0,
  max = 100,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
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

function ColorField({
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

/** Content that slides open/closed smoothly; everything below it glides with it. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="reveal" data-open={open} aria-hidden={!open} inert={!open}>
      <div className="reveal__inner">
        <div className="reveal__content">{children}</div>
      </div>
    </div>
  );
}

// ---------- the two side-by-side panels ----------

export default function CardCustomizer({
  image,
  avatar,
  onAvatar,
  tooltip,
  onTooltip,
}: {
  image: string | null;
  avatar: AvatarSettings;
  onAvatar: (next: AvatarSettings) => void;
  tooltip: TooltipSettings;
  onTooltip: (next: TooltipSettings) => void;
}) {
  const setTip = (patch: Partial<TooltipSettings>) => onTooltip({ ...tooltip, ...patch });

  return (
    <div className="cust-grid">
      {/* ----- Profile picture layout ----- */}
      <section className="panel">
        <div className="setting__text">
          <span className="setting__name">Profile picture layout</span>
          <span className="setting__desc">The shape of your picture on your profile.</span>
        </div>

        <div className="panel__preview panel__preview--stripes">
          <span
            className="aprev pfp"
            data-pfp-border={avatar.borderStyle}
            style={{ borderRadius: avatarRadius(avatar), ...avatarBorderVars(avatar) } as React.CSSProperties}
          >
            <span className="pfp__inner">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" draggable={false} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="aprev__default" src="/icons/user.png" alt="" draggable={false} />
              )}
            </span>
          </span>
        </div>

        <div className="panel__fields">
          <Select
            label="Layout"
            value={avatar.shape}
            options={AVATAR_SHAPES}
            onChange={(shape) => onAvatar({ ...avatar, shape })}
          />
          {/* Roundness slider slides open only for "Custom" */}
          <Reveal open={avatar.shape === "custom"}>
            <SliderField
              label="Corner roundness"
              value={avatar.radius}
              max={50}
              onChange={(radius) => onAvatar({ ...avatar, radius })}
            />
          </Reveal>

          <Select
            label="Profile border"
            value={avatar.borderStyle}
            options={BORDER_STYLES}
            onChange={(borderStyle) => onAvatar({ ...avatar, borderStyle })}
          />
          {/* Border options slide open for Color / Glass / Gradient */}
          <Reveal open={avatar.borderStyle !== "none"}>
            <div className="stack">
              <ColorField
                label={avatar.borderStyle === "glass" ? "Tint color" : "Color"}
                value={avatar.borderColor}
                onChange={(borderColor) => onAvatar({ ...avatar, borderColor })}
              />
              <Reveal open={avatar.borderStyle === "gradient"}>
                <ColorField
                  label="Second color"
                  value={avatar.borderColor2}
                  onChange={(borderColor2) => onAvatar({ ...avatar, borderColor2 })}
                />
              </Reveal>
              <SliderField
                label="Opacity"
                value={avatar.borderOpacity}
                onChange={(borderOpacity) => onAvatar({ ...avatar, borderOpacity })}
              />
              <SliderField
                label="Width"
                value={avatar.borderWidth}
                min={1}
                max={12}
                suffix="px"
                onChange={(borderWidth) => onAvatar({ ...avatar, borderWidth })}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----- Tooltip customiser ----- */}
      <section className="panel">
        <div className="setting__text">
          <span className="setting__name">Tooltip</span>
          <span className="setting__desc">The bubble that pops up when someone hovers your name or views.</span>
        </div>

        <div className="panel__preview tprev" data-tip-anim={tooltip.animation} style={tooltipVars(tooltip) as React.CSSProperties}>
          <span className="tprev__host tip-host" tabIndex={0}>
            Hover me
            <Tip shape={tooltip.shape}>
              <span className="tip__label">UID</span>
              <span className="tip__value">1</span>
            </Tip>
          </span>
        </div>

        <div className="panel__fields">
          <div className="field-grid field-grid--2">
            <Select label="Shape" value={tooltip.shape} options={TIP_SHAPES} onChange={(shape) => setTip({ shape })} />
            <Select
              label="Animation"
              value={tooltip.animation}
              options={TIP_ANIMATIONS}
              onChange={(animation) => setTip({ animation })}
            />
          </div>
          <div className="field-grid field-grid--3">
            <ColorField label="Text" value={tooltip.textColor} onChange={(textColor) => setTip({ textColor })} />
            <ColorField label="Background" value={tooltip.bgColor} onChange={(bgColor) => setTip({ bgColor })} />
            <ColorField label="Border" value={tooltip.borderColor} onChange={(borderColor) => setTip({ borderColor })} />
          </div>
          <SliderField label="Background opacity" value={tooltip.bgOpacity} onChange={(bgOpacity) => setTip({ bgOpacity })} />
          <SliderField label="Border opacity" value={tooltip.borderOpacity} onChange={(borderOpacity) => setTip({ borderOpacity })} />
        </div>
      </section>
    </div>
  );
}