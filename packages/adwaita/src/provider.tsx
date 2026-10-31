import { GtkProvider, type GtkProviderProps } from "@gtk-js/gtk4";
import * as adwaitaIcons from "@gtk-js/icons-adwaita";
import { AdwaitaTheme } from "@gtk-js/theme-adwaita";
import { type ReactNode, useMemo } from "react";

export interface AdwaitaProviderProps
  extends Omit<GtkProviderProps, "theme" | "cssHref" | "cssText"> {
  /** Color scheme. Default: "auto" (follows prefers-color-scheme). */
  colorScheme?: "light" | "dark" | "auto";
  /** Accent color (hex). Defaults to GNOME blue via AdwaitaTheme. */
  accentColor?: string;
  /**
   * Icons over the Adwaita icon theme's, e.g. the app's own. Names neither
   * has fall back to GTK's own icons.
   */
  icons?: GtkProviderProps["icons"];
  children: ReactNode;
}

/**
 * AdwaitaProvider — Initializes the Adwaita theme, analogous to adw_init().
 *
 * Replaces GtkProvider — use one or the other, not both.
 * Constructs an AdwaitaTheme instance from props and passes it to GtkProvider.
 */
export function AdwaitaProvider({
  colorScheme = "auto",
  accentColor,
  icons,
  ...rest
}: AdwaitaProviderProps) {
  const theme = useMemo(
    () => new AdwaitaTheme({ colorScheme, accentColor }),
    [colorScheme, accentColor],
  );
  const iconMap = useMemo(() => (icons ? { ...adwaitaIcons, ...icons } : adwaitaIcons), [icons]);
  return <GtkProvider theme={theme} icons={iconMap} {...rest} />;
}
