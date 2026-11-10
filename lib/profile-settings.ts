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

export const BORDER_STYLES = [
  { value: "none", label: "None" },
  { value: "color", label: "Color" },
  { value: "glass", label: "Glass (blur)" },
  { value: "gradient", label: "Gradient (moving)" },
] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number]["value"];

export type AvatarSettings = {
  shape: AvatarShape;
  /** Custom corner roundness: 0 = square, 50 = circle (percent of the picture) */
  radius: number;
  borderStyle: BorderStyle;
  borderColor: string;
  /** Second colour, only used by the moving gradient */
  borderColor2: string;
  borderOpacity: number; // 0-100
  borderWidth: number; // px, 1-12
};

export const DEFAULT_AVATAR: AvatarSettings = {
  shape: "rounded",
  radius: 12,
  borderStyle: "none",
  borderColor: "#ffffff",
  borderColor2: "#7c5cff",
  borderOpacity: 100,
  borderWidth: 3,
};

export function sanitizeAvatar(v: unknown): AvatarSettings {
  const o = isObj(v) ? v : {};
  const d = DEFAULT_AVATAR;
  return {
    shape: pick(o.shape, AVATAR_SHAPES.map((s) => s.value), d.shape),
    radius: clamp(o.radius, 0, 50, d.radius),
    borderStyle: pick(o.borderStyle, BORDER_STYLES.map((s) => s.value), d.borderStyle),
    borderColor: color(o.borderColor, d.borderColor),
    borderColor2: color(o.borderColor2, d.borderColor2),
    borderOpacity: clamp(o.borderOpacity, 0, 100, d.borderOpacity),
    borderWidth: clamp(o.borderWidth, 1, 12, d.borderWidth),
  };
}

export const avatarFrom = (settings: Record<string, unknown>) => sanitizeAvatar(settings.avatar);

export function avatarRadius(a: AvatarSettings): string {
  if (a.shape === "circle") return "50%";
  if (a.shape === "custom") return `${a.radius}%`;
  return "14px";
}

/** CSS variables app/avatar.css reads to draw the border ring around the picture. */
export function avatarBorderVars(a: AvatarSettings): Record<string, string> {
  const w = a.borderStyle === "none" ? 0 : a.borderWidth;
  const inner =
    a.shape === "circle" ? "50%" : a.shape === "custom" ? `${a.radius}%` : `${Math.max(0, 14 - w)}px`;
  const vars: Record<string, string> = { "--pfp-bw": `${w}px`, "--avatar-inner-radius": inner };
  if (a.borderStyle === "color") vars["--pfp-bg"] = hexToRgba(a.borderColor, a.borderOpacity);
  // Glass is a frosted tint, so the same opacity slider gives a softer range
  if (a.borderStyle === "glass") vars["--pfp-bg"] = hexToRgba(a.borderColor, Math.round(a.borderOpacity * 0.35));
  if (a.borderStyle === "gradient") {
    vars["--pfp-c1"] = hexToRgba(a.borderColor, a.borderOpacity);
    vars["--pfp-c2"] = hexToRgba(a.borderColor2, a.borderOpacity);
  }
  return vars;
}

// ---------- Profile layout (how the picture and name are arranged on the card) ----------

export const PROFILE_LAYOUTS = [
  { value: "default", label: "Default (picture beside name)" },
  { value: "stacked", label: "Stacked (picture above name)" },
] as const;
export type ProfileLayout = (typeof PROFILE_LAYOUTS)[number]["value"];

export const DEFAULT_LAYOUT: ProfileLayout = "default";

export const sanitizeLayout = (v: unknown): ProfileLayout =>
  pick(v, PROFILE_LAYOUTS.map((l) => l.value), DEFAULT_LAYOUT);

export const layoutFrom = (settings: Record<string, unknown>) => sanitizeLayout(settings.layout);

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

// ---------- Cursor pet (the little sprite that chases the visitor's mouse) ----------

/** Which pet. Cat and frog are sprite sheets in public/pet/; the snake is
 *  drawn live in components/snake.ts so it can be any length. The order here
 *  is the order of the dropdown. */
export const PET_TYPES = ["cat", "frog", "snake"] as const;
export type PetType = (typeof PET_TYPES)[number];

export type PetSettings = {
  /** Show the pet on the public profile */
  enabled: boolean;
  /** Which sprite sheet to use */
  type: PetType;
  /** Sprite size, percent of the 32px original (125 = 40px) */
  size: number;
  /** Snake only: body length in sprite pixels */
  length: number;
  /** Running speed, percent of the original */
  speed: number;
  /** How close it gets to the cursor before it stops, in px */
  distance: number;
  /** Tint for the white part of the sprite; the black outline stays */
  color: string;
  opacity: number; // 10-100
};

export const DEFAULT_PET: PetSettings = {
  enabled: false,
  type: "cat",
  size: 125,
  length: 60,
  speed: 35,
  distance: 10,
  color: "#ffffff",
  opacity: 100,
};

export const PET_LIMITS = {
  size: { min: 50, max: 300 },
  length: { min: 20, max: 150 },
  speed: { min: 25, max: 250 },
  distance: { min: 0, max: 200 },
  opacity: { min: 10, max: 100 },
} as const;

export function sanitizePet(v: unknown): PetSettings {
  const o = isObj(v) ? v : {};
  const d = DEFAULT_PET;
  const L = PET_LIMITS;
  return {
    enabled: o.enabled === true,
    type: PET_TYPES.find((t) => t === o.type) ?? d.type,
    size: clamp(o.size, L.size.min, L.size.max, d.size),
    length: clamp(o.length, L.length.min, L.length.max, d.length),
    speed: clamp(o.speed, L.speed.min, L.speed.max, d.speed),
    distance: clamp(o.distance, L.distance.min, L.distance.max, d.distance),
    color: color(o.color, d.color),
    opacity: clamp(o.opacity, L.opacity.min, L.opacity.max, d.opacity),
  };
}

export const petFrom = (settings: Record<string, unknown>) => sanitizePet(settings.pet);
