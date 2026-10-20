"use client";

import type { GtkTheme, IconMap } from "@gtk-js/gtk4";
import * as adwaitaIcons from "@gtk-js/icons-adwaita";
import * as fluentIcons from "@gtk-js/icons-fluent";
import * as mactahoeIcons from "@gtk-js/icons-mactahoe";
import * as whitesurIcons from "@gtk-js/icons-whitesur";
import { AdwaitaTheme } from "@gtk-js/theme-adwaita";
import { FluentTheme } from "@gtk-js/theme-fluent";
import { MacTahoeTheme } from "@gtk-js/theme-mactahoe";
import { WhiteSurTheme } from "@gtk-js/theme-whitesur";
import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

export type ThemeName = "adwaita" | "whitesur" | "mactahoe" | "fluent";

export const THEME_LABELS: Record<ThemeName, string> = {
  adwaita: "Adwaita",
  whitesur: "Big Sur",
  mactahoe: "Tahoe",
  fluent: "Fluent",
};

export const ADWAITA_ACCENT_PRESETS = [
  "#3584e4",
  "#9141ac",
  "#e66100",
  "#2ec27e",
  "#e01b24",
  "#f5c211",
];

export const FLUENT_ACCENT_PRESETS = [
  "#1A73E8",
  "#9C27B0",
  "#E91E63",
  "#F44336",
  "#FF9800",
  "#FFEB3B",
  "#4CAF50",
  "#009688",
  "#9E9E9E",
];

const THEME_ICONS: Record<ThemeName, IconMap> = {
  adwaita: adwaitaIcons,
  whitesur: whitesurIcons,
  mactahoe: mactahoeIcons,
  fluent: fluentIcons,
};

interface ThemeChoice {
  themeName: ThemeName;
  colorScheme: "light" | "dark" | "auto";
  adwaitaAccent: string;
  fluentAccent: string;
  fluentTitlebutton: "circular" | "square";
  fluentWindow: "default" | "round";
}

const DEFAULT_CHOICE: ThemeChoice = {
  themeName: "adwaita",
  colorScheme: "auto",
  adwaitaAccent: "#3584e4",
  fluentAccent: "#1A73E8",
  fluentTitlebutton: "square",
  fluentWindow: "default",
};

const ALLOWED: { [K in keyof ThemeChoice]: readonly ThemeChoice[K][] } = {
  themeName: Object.keys(THEME_LABELS) as ThemeName[],
  colorScheme: ["light", "dark", "auto"],
  adwaitaAccent: ADWAITA_ACCENT_PRESETS,
  fluentAccent: FLUENT_ACCENT_PRESETS,
  fluentTitlebutton: ["circular", "square"],
  fluentWindow: ["default", "round"],
};

const STORAGE_KEY = "gtk-js-docs-theme";

/** The saved choice, keeping only known values. */
function loadChoice(): ThemeChoice {
  const choice = { ...DEFAULT_CHOICE };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    for (const key of Object.keys(choice) as (keyof ThemeChoice)[]) {
      if ((ALLOWED[key] as readonly unknown[]).includes(saved?.[key])) {
        (choice as Record<keyof ThemeChoice, unknown>)[key] = saved[key];
      }
    }
  } catch {
    // Storage blocked or unreadable: keep the defaults.
  }
  return choice;
}

function saveChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
}

export interface ThemePickerState extends ThemeChoice {
  theme: GtkTheme;
  icons: IconMap;
  /** False while rendering the server HTML and hydrating it, true once the saved choice is in. */
  restored: boolean;
  setThemeName: (t: ThemeName) => void;
  setColorScheme: (s: "light" | "dark" | "auto") => void;
  setAdwaitaAccent: (c: string) => void;
  setFluentAccent: (c: string) => void;
  setFluentTitlebutton: (t: "circular" | "square") => void;
  setFluentWindow: (w: "default" | "round") => void;
}

/**
 * The site's theme choice: one stylesheet themes a whole document, so every
 * preview on the site shares it (see ThemePickerProvider). It's saved, and
 * restored before the first paint after hydration.
 */
export function useThemePickerState(): ThemePickerState {
  // null until the saved choice is read: the server HTML has the defaults, and
  // hydration has to render the same.
  const [saved, setSaved] = useState<ThemeChoice | null>(null);
  const choice = saved ?? DEFAULT_CHOICE;
  const { themeName, colorScheme, adwaitaAccent, fluentAccent, fluentTitlebutton, fluentWindow } =
    choice;

  // A state update from a layout effect renders synchronously, before the browser
  // paints the hydrated page, so the default theme never shows.
  useLayoutEffect(() => setSaved(loadChoice()), []);

  const set =
    <K extends keyof ThemeChoice>(key: K) =>
    (value: ThemeChoice[K]) =>
      setSaved((current) => {
        const next = { ...(current ?? DEFAULT_CHOICE), [key]: value };
        saveChoice(next);
        return next;
      });

  const theme = useMemo((): GtkTheme => {
    if (themeName === "adwaita")
      return new AdwaitaTheme({ colorScheme, accentColor: adwaitaAccent });
    if (themeName === "whitesur") return new WhiteSurTheme({ colorScheme });
    if (themeName === "mactahoe") return new MacTahoeTheme({ colorScheme });
    if (themeName === "fluent") {
      return new FluentTheme({
        colorScheme,
        titlebutton: fluentTitlebutton,
        window: fluentWindow,
        accentColor: fluentAccent,
      });
    }
    throw new Error(`Unknown theme: ${themeName satisfies never}`);
  }, [themeName, colorScheme, adwaitaAccent, fluentAccent, fluentTitlebutton, fluentWindow]);

  return {
    ...choice,
    theme,
    icons: THEME_ICONS[themeName],
    restored: saved !== null,
    setThemeName: set("themeName"),
    setColorScheme: set("colorScheme"),
    setAdwaitaAccent: set("adwaitaAccent"),
    setFluentAccent: set("fluentAccent"),
    setFluentTitlebutton: set("fluentTitlebutton"),
    setFluentWindow: set("fluentWindow"),
  };
}

export const ThemePickerContext = createContext<ThemePickerState | null>(null);

/** The site-wide theme choice, from the ThemePickerProvider in the root layout. */
export function useThemePicker(): ThemePickerState {
  const state = useContext(ThemePickerContext);
  if (!state) throw new Error("useThemePicker() needs a <ThemePickerProvider> above it");
  return state;
}
