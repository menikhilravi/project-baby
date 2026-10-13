/**
 * Theme + baby-accent model shared by the server layout and client toggles.
 *
 * Theme is device-local (a cookie: the 3am phone wants Night, the laptop may
 * not). The accent follows the baby: derived from profiles.baby_sex unless the
 * user picked an override (profiles.baby_accent).
 */

export type ThemePref = "system" | "light" | "night";
export type Accent = "neutral" | "boy" | "girl";
export type BabySex = "male" | "female";

export const THEME_COOKIE = "theme";
export const THEME_PREFS: readonly ThemePref[] = ["system", "light", "night"];
export const ACCENTS: readonly Accent[] = ["neutral", "boy", "girl"];

/** Hex equivalents of --background, for <meta name="theme-color">. */
export const THEME_COLORS = {
  light: "#fdfaf4",
  night: "#151828",
} as const;

export function parseThemePref(value: string | undefined | null): ThemePref {
  return value === "light" || value === "night" || value === "system"
    ? value
    : "system";
}

export function isAccent(value: unknown): value is Accent {
  return value === "neutral" || value === "boy" || value === "girl";
}

export function resolveAccent(
  sex: string | null | undefined,
  override: string | null | undefined,
): Accent {
  if (isAccent(override)) return override;
  if (sex === "male") return "boy";
  if (sex === "female") return "girl";
  return "neutral";
}

export const ACCENT_LABELS: Record<Accent, string> = {
  neutral: "Sage",
  boy: "Powder blue",
  girl: "Blush",
};

/**
 * Hue/chroma per accent. Mirrors the [data-accent] blocks in globals.css; the
 * mascot uses these directly so a preview can render any accent.
 */
export const ACCENT_HC: Record<Accent, { h: number; c: number }> = {
  neutral: { h: 160, c: 0.06 },
  boy: { h: 238, c: 0.075 },
  girl: { h: 12, c: 0.075 },
};
