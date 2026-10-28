import { DecorationLayout, GtkProvider, type GtkProviderProps } from "@gtk-js/gtk4";
import * as whitesurIcons from "@gtk-js/icons-whitesur";
import { type ReactNode, useMemo } from "react";
import { WhiteSurTheme } from "./theme.ts";

export interface WhiteSurProviderProps
  extends Omit<GtkProviderProps, "theme" | "cssHref" | "cssText"> {
  /** Color scheme. Default: "auto" (follows prefers-color-scheme, like the system's appearance). */
  colorScheme?: "light" | "dark" | "auto";
  /**
   * Icons over the WhiteSur icon theme's, e.g. the app's own. Names neither has
   * fall back to GTK's own icons.
   */
  icons?: GtkProviderProps["icons"];
  /** GtkSettings:gtk-decoration-layout. Default: macOS's, close, minimize and maximize on the left. */
  decorationLayout?: string;
  children: ReactNode;
}

/**
 * WhiteSurProvider — a libadwaita app themed like macOS Big Sur to Sequoia (11–15): the WhiteSur GTK theme
 * (over libadwaita's stylesheet, as its installer sets it up for libadwaita
 * apps), the WhiteSur icon theme, and macOS's window button order.
 *
 * Replaces GtkProvider and AdwaitaProvider — use one of them, not several.
 */
export function WhiteSurProvider({
  colorScheme = "auto",
  icons,
  decorationLayout = DecorationLayout.MACOS,
  ...rest
}: WhiteSurProviderProps) {
  const theme = useMemo(() => new WhiteSurTheme({ colorScheme }), [colorScheme]);
  const iconMap = useMemo(() => (icons ? { ...whitesurIcons, ...icons } : whitesurIcons), [icons]);
  return (
    <GtkProvider theme={theme} icons={iconMap} decorationLayout={decorationLayout} {...rest} />
  );
}
