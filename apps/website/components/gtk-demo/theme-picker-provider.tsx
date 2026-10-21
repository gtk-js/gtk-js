"use client";

import type { ReactNode } from "react";
import { ThemePickerContext, useThemePickerState } from "./use-theme-picker";

/**
 * Holds the site's one theme choice. GtkProvider injects a single theme
 * stylesheet per document, so previews can't have themes of their own: every
 * preview's picker sets this one, and its icons follow it.
 */
export function ThemePickerProvider({ children }: { children: ReactNode }) {
  const state = useThemePickerState();
  return <ThemePickerContext.Provider value={state}>{children}</ThemePickerContext.Provider>;
}
