import { DecorationLayout, GtkProvider, type GtkProviderProps } from "@gtk-js/gtk4";
import * as mactahoeIcons from "@gtk-js/icons-mactahoe";
import { type ReactNode, useMemo } from "react";
import { MacTahoeTheme } from "./theme.ts";

export interface MacTahoeProviderProps
  extends Omit<GtkProviderProps, "theme" | "cssHref" | "cssText"> {
  /** Color scheme. Default: "auto" (follows prefers-color-scheme, like the system's appearance). */
  colorScheme?: "light" | "dark" | "auto";
  /**
   * Icons over the MacTahoe icon theme's, e.g. the app's own. Names neither has
   * fall back to GTK's own icons.
   */
  icons?: GtkProviderProps["icons"];
  /** GtkSettings:gtk-decoration-layout. Default: macOS's, close, minimize and maximize on the left. */
  decorationLayout?: string;
  children: ReactNode;
}

/**
 * MacTahoeProvider — a libadwaita app themed like macOS Tahoe (26): the MacTahoe GTK theme
 * (over libadwaita's stylesheet, as its installer sets it up for libadwaita
 * apps), the MacTahoe icon theme, and macOS's window button order.
 *
 * Replaces GtkProvider and AdwaitaProvider — use one of them, not several.
 */
export function MacTahoeProvider({
  colorScheme = "auto",
  icons,
  decorationLayout = DecorationLayout.MACOS,
  ...rest
}: MacTahoeProviderProps) {
  const theme = useMemo(() => new MacTahoeTheme({ colorScheme }), [colorScheme]);
  const iconMap = useMemo(() => (icons ? { ...mactahoeIcons, ...icons } : mactahoeIcons), [icons]);
  return (
    <GtkProvider theme={theme} icons={iconMap} decorationLayout={decorationLayout} {...rest} />
  );
}
