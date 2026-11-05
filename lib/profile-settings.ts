// profiles.settings is a JSON blob, so new options don't need a migration.

export function parseSettings(raw: string | null | undefined): Record<string, unknown> {
  try {
    const v = JSON.parse(raw ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Profile card opacity, 0 to 100. Defaults to 100 (solid). */
export function cardOpacityFrom(settings: Record<string, unknown>): number {
  const n = Number(settings.cardOpacity);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 100;
}
