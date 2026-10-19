/** The system's color scheme, as `prefers-color-scheme` reports it. */
export type SystemColorScheme = "light" | "dark";

/**
 * Abstract base class for GTK themes.
 *
 * Subclasses own all state (color scheme, accent, variants, etc.)
 * and return the full CSS string via getCSS().
 *
 * Third parties can subclass this with zero dependency on React or widgets.
 */
export abstract class GtkTheme {
  /**
   * @param systemScheme The system's color scheme, for an "auto" color scheme.
   *   GtkProvider reads it from `prefers-color-scheme` and calls getCSS() again when
   *   it changes, like AdwStyleManager follows the system setting. It is undefined
   *   when unknown: on the server and while hydrating.
   */
  abstract getCSS(systemScheme?: SystemColorScheme): string;
}

/**
 * Resolve "auto" color scheme to "light" or "dark": the system scheme when known,
 * otherwise prefers-color-scheme (light on the server).
 */
export function resolveColorScheme(
  scheme: "light" | "dark" | "auto",
  systemScheme?: SystemColorScheme,
): "light" | "dark" {
  if (scheme !== "auto") return scheme;
  if (systemScheme) return systemScheme;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}
