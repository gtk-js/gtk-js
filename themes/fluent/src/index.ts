import { GtkTheme, type SystemColorScheme } from "@gtk-js/gtk-css";
import autoCSS from "../dist/auto.css?raw";
import darkCSS from "../dist/dark.css?raw";
import lightCSS from "../dist/light.css?raw";

/**
 * The Fluent theme — Windows 11's look (WinUI 3, Fluent 2) for GTK widgets:
 * Mica backgrounds, elevated 4px-corner controls, accent buttons, Windows
 * caption buttons and flyouts. Its colors and metrics are WinUI 3's theme
 * resources.
 *
 * Supports a free-pick accent color (Windows' system accent color, from which
 * the theme derives the fills and text colors like Windows does) and
 * light/dark/auto color scheme.
 *
 * The package also ships the native GTK stylesheet in `dist/gtk-4.0/`, to
 * theme native GTK 4/libadwaita apps the same way.
 *
 * @example
 * // Default (auto color scheme, Windows blue accent):
 * const theme = new FluentTheme();
 *
 * // Forced dark with a custom accent:
 * const theme = new FluentTheme({ colorScheme: "dark", accentColor: "#e74856" });
 *
 * // Immutable — create a new instance when settings change:
 * const theme = useMemo(() => new FluentTheme({ colorScheme, accentColor }), [colorScheme, accentColor]);
 * <GtkProvider theme={theme} />
 */
export class FluentTheme extends GtkTheme {
  readonly colorScheme: "light" | "dark" | "auto";
  /** Windows' system accent color, as a CSS color. Defaults to Windows blue (#0078d4). */
  readonly accentColor: string;

  constructor({
    colorScheme = "auto",
    accentColor = "#0078d4",
  }: {
    colorScheme?: "light" | "dark" | "auto";
    accentColor?: string;
  } = {}) {
    super();
    this.colorScheme = colorScheme;
    this.accentColor = accentColor;
  }

  getCSS(systemScheme?: SystemColorScheme) {
    const scheme = this.colorScheme === "auto" ? systemScheme : this.colorScheme;
    // Until the system scheme is known (server HTML, hydration), auto.css follows
    // prefers-color-scheme itself.
    const base = scheme === "dark" ? darkCSS : scheme === "light" ? lightCSS : autoCSS;

    // The stylesheet's :root derives the accent fills from it.
    return base + `\n:root { --fluent-accent: ${this.accentColor}; }\n`;
  }
}
