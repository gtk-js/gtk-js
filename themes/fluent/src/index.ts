import { GtkTheme, resolveColorScheme } from "@gtk-js/gtk-css";
import dark_circular_default from "../dist/dark_circular_default.css?raw";
import dark_circular_round from "../dist/dark_circular_round.css?raw";
import dark_square_default from "../dist/dark_square_default.css?raw";
import dark_square_round from "../dist/dark_square_round.css?raw";
import light_circular_default from "../dist/light_circular_default.css?raw";
import light_circular_round from "../dist/light_circular_round.css?raw";
import light_square_default from "../dist/light_square_default.css?raw";
import light_square_round from "../dist/light_square_round.css?raw";

const CSS_MAP = {
  light_circular_default,
  light_circular_round,
  light_square_default,
  light_square_round,
  dark_circular_default,
  dark_circular_round,
  dark_square_default,
  dark_square_round,
} as const;

/**
 * The Fluent theme — a Fluent Design / Windows-style GTK theme.
 *
 * Supports runtime accent color and light/dark/auto color scheme.
 * Window button style and corner style are selected at construction time,
 * picking from pre-compiled CSS variants.
 *
 * @example
 * // Default (auto color scheme, square buttons, Fluent blue accent):
 * const theme = new FluentTheme();
 *
 * // Forced dark with circular buttons, rounded corners, custom accent:
 * const theme = new FluentTheme({ colorScheme: "dark", titlebutton: "circular", window: "round", accentColor: "#e66100" });
 *
 * // Immutable — create a new instance when settings change:
 * const theme = useMemo(() => new FluentTheme({ colorScheme, accentColor }), [colorScheme, accentColor]);
 * <GtkProvider theme={theme} />
 */
export class FluentTheme extends GtkTheme {
  readonly colorScheme: "light" | "dark" | "auto";
  /** Window button style. "square" is the native Fluent/Windows look. */
  readonly titlebutton: "circular" | "square";
  /** Corner style. "round" increases corner radii throughout. */
  readonly window: "default" | "round";
  /** Accent color as a CSS color string. Defaults to Fluent blue (#1A73E8). */
  readonly accentColor: string;

  constructor({
    colorScheme = "auto",
    titlebutton = "square",
    window = "default",
    accentColor = "#1A73E8",
  }: {
    colorScheme?: "light" | "dark" | "auto";
    titlebutton?: "circular" | "square";
    window?: "default" | "round";
    accentColor?: string;
  } = {}) {
    super();
    this.colorScheme = colorScheme;
    this.titlebutton = titlebutton;
    this.window = window;
    this.accentColor = accentColor;
  }

  getCSS() {
    const scheme = resolveColorScheme(this.colorScheme);
    const key = `${scheme}_${this.titlebutton}_${this.window}` as keyof typeof CSS_MAP;
    const base = CSS_MAP[key];
    return base + `\n[data-gtk-provider] { --fluent-accent: ${this.accentColor}; }\n`;
  }
}
