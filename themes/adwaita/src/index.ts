import { GtkTheme } from "@gtk-js/gtk-css";
import autoCSS from "../dist/auto.css?raw";
import darkCSS from "../dist/dark.css?raw";
import lightCSS from "../dist/light.css?raw";

/**
 * The Adwaita theme — the default GNOME/libadwaita theme.
 *
 * Supports free-pick accent color and light/dark/auto color scheme.
 *
 * @example
 * // Default (auto color scheme, GNOME blue accent):
 * const theme = new AdwaitaTheme();
 *
 * // Forced dark with custom accent:
 * const theme = new AdwaitaTheme({ colorScheme: "dark", accentColor: "#e66100" });
 *
 * // Immutable — create a new instance when settings change:
 * const theme = useMemo(() => new AdwaitaTheme({ colorScheme, accentColor }), [colorScheme, accentColor]);
 * <GtkProvider theme={theme} />
 */
export class AdwaitaTheme extends GtkTheme {
  readonly colorScheme: "light" | "dark" | "auto";
  readonly accentColor: string;

  constructor({
    colorScheme = "auto",
    accentColor = "#3584e4",
  }: {
    colorScheme?: "light" | "dark" | "auto";
    accentColor?: string;
  } = {}) {
    super();
    this.colorScheme = colorScheme;
    this.accentColor = accentColor;
  }

  getCSS() {
    const base =
      this.colorScheme === "dark" ? darkCSS : this.colorScheme === "light" ? lightCSS : autoCSS;

    // Append accent override on top of the default baked into the CSS
    return (
      base +
      `\n[data-gtk-provider] { --accent-bg-color: ${this.accentColor}; --accent-fg-color: white; }\n`
    );
  }
}
