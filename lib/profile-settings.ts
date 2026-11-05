// profiles.settings is a JSON blob, so new options don't need a migration.
// This file is safe to import from both server and client code.

export function parseSettings(raw: string | null | undefined): Record<string, unknown> {
  try {
    const v = JSON.parse(raw ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : fallback;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const color = (v: unknown, fallback: string) =>
  typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback;

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback;

/** Profile card opacity, 0 to 100. Defaults to 100 (solid). */
export function cardOpacityFrom(settings: Record<string, unknown>): number {
  return clamp(settings.cardOpacity, 0, 100, 100);
}

// ---------- Profile picture layout ----------

export const AVATAR_SHAPES = [
  { value: "rounded", label: "Rounded square (default)" },
  { value: "circle", label: "Circle" },
  { value: "custom", label: "Custom" },
] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number]["value"];

export type AvatarSettings = {
  shape: AvatarShape;
  /** Custom corner roundness: 0 = square, 50 = circle (percent of the picture) */
  radius: number;
};

export const DEFAULT_AVATAR: AvatarSettings = { shape: "rounded", radius: 12 };

export function sanitizeAvatar(v: unknown): AvatarSettings {
  const o = isObj(v) ? v : {};
  return {
    shape: pick(o.shape, AVATAR_SHAPES.map((s) => s.value), DEFAULT_AVATAR.shape),
    radius: clamp(o.radius, 0, 50, DEFAULT_AVATAR.radius),
  };
}

export const avatarFrom = (settings: Record<string, unknown>) => sanitizeAvatar(settings.avatar);

export function avatarRadius(a: AvatarSettings): string {
  if (a.shape === "circle") return "50%";
  if (a.shape === "custom") return `${a.radius}%`;
  return "14px";
}

// ---------- Tooltips (the hover bubbles on the name and view count) ----------

export const TIP_SHAPES = [
  { value: "rounded", label: "Rounded" },
  { value: "square", label: "Square" },
  { value: "pill", label: "Pill" },
] as const;
export type TipShape = (typeof TIP_SHAPES)[number]["value"];

export const TIP_ANIMATIONS = [
  { value: "pop", label: "Pop (bouncy)" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide up" },
  { value: "zoom", label: "Zoom" },
  { value: "none", label: "None" },
] as const;
export type TipAnimation = (typeof TIP_ANIMATIONS)[number]["value"];

export type TooltipSettings = {
  shape: TipShape;
  animation: TipAnimation;
  textColor: string;
  bgColor: string;
  bgOpacity: number; // 0-100
  borderColor: string;
  borderOpacity: number; // 0-100
};

export const DEFAULT_TOOLTIP: TooltipSettings = {
  shape: "rounded",
  animation: "pop",
  textColor: "#ffffff",
  bgColor: "#161616",
  bgOpacity: 82,
  borderColor: "#ffffff",
  borderOpacity: 12,
};

export function sanitizeTooltip(v: unknown): TooltipSettings {
  const o = isObj(v) ? v : {};
  const d = DEFAULT_TOOLTIP;
  return {
    shape: pick(o.shape, TIP_SHAPES.map((s) => s.value), d.shape),
    animation: pick(o.animation, TIP_ANIMATIONS.map((s) => s.value), d.animation),
    textColor: color(o.textColor, d.textColor),
    bgColor: color(o.bgColor, d.bgColor),
    bgOpacity: clamp(o.bgOpacity, 0, 100, d.bgOpacity),
    borderColor: color(o.borderColor, d.borderColor),
    borderOpacity: clamp(o.borderOpacity, 0, 100, d.borderOpacity),
  };
}

export const tooltipFrom = (settings: Record<string, unknown>) => sanitizeTooltip(settings.tooltip);

export function hexToRgba(hex: string, opacityPct: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${(opacityPct / 100).toFixed(2)})`;
}

const TIP_RADIUS: Record<TipShape, string> = { rounded: "12px", square: "2px", pill: "999px" };

/** CSS variables the tooltip styles (app/tooltip.css) read. */
export function tooltipVars(t: TooltipSettings): Record<string, string> {
  return {
    "--tip-bg": hexToRgba(t.bgColor, t.bgOpacity),
    "--tip-border": hexToRgba(t.borderColor, t.borderOpacity),
    "--tip-color": t.textColor,
    "--tip-radius": TIP_RADIUS[t.shape],
  };
}
