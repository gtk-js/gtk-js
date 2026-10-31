"use client";

import { DecorationLayout, type IconMap } from "@gtk-js/gtk4";
import * as adwaitaIcons from "@gtk-js/icons-adwaita";
import * as fluentIcons from "@gtk-js/icons-fluent";
import * as mactahoeIcons from "@gtk-js/icons-mactahoe";
import * as whitesurIcons from "@gtk-js/icons-whitesur";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { preload } from "react-dom";
import {
  ALLOWED,
  BASE_PATH,
  DEFAULT_CHOICE,
  readChoice,
  STORAGE_KEY,
  type ThemeChoice,
  type ThemeName,
  themeStylesheet,
} from "./theme-stylesheet";

export {
  ADWAITA_ACCENT_PRESETS,
  FLUENT_ACCENT_PRESETS,
  THEME_LABELS,
  type ThemeName,
} from "./theme-stylesheet";

const THEME_ICONS: Record<ThemeName, IconMap> = {
  adwaita: adwaitaIcons,
  whitesur: whitesurIcons,
  mactahoe: mactahoeIcons,
  fluent: fluentIcons,
};

/** The saved choice, keeping only known values. */
function loadChoice(): ThemeChoice {
  try {
    return readChoice(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"),
      DEFAULT_CHOICE,
      ALLOWED,
    );
  } catch {
    // Storage blocked or unreadable: keep the defaults.
    return DEFAULT_CHOICE;
  }
}

function saveChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystemScheme(onChange: () => void) {
  const query = matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const systemIsDark = () => matchMedia(DARK_QUERY).matches;

export interface ThemePickerState extends ThemeChoice {
  /**
   * The theme's stylesheet file and the CSS after it, for GtkProvider's
   * cssHref and cssText. Unset while rendering the server HTML and hydrating
   * it: the <head> script (themeScript()) has linked the saved theme then.
   */
  cssHref: string | undefined;
  cssText: string | undefined;
  icons: IconMap;
  /** The window buttons' order for GtkProvider: macOS's (on the left) for the macOS themes. */
  decorationLayout: string | undefined;
  /** False while rendering the server HTML and hydrating it, true once the saved choice is in. */
  restored: boolean;
  setThemeName: (t: ThemeName) => void;
  setColorScheme: (s: "light" | "dark" | "auto") => void;
  setAdwaitaAccent: (c: string) => void;
  setFluentAccent: (c: string) => void;
  /** Loads the stylesheets one click in the picker away, so switching to them doesn't wait. */
  preloadOptions: () => void;
}

/**
 * The site's theme choice: one stylesheet themes a whole document, so every
 * preview on the site shares it (see ThemePickerProvider). It's saved, and
 * linked before the first paint by the <head> script; the providers take
 * that stylesheet over once the saved choice is restored after hydration.
 */
export function useThemePickerState(): ThemePickerState {
  // null until the saved choice is read: the server HTML has the defaults, and
  // hydration has to render the same.
  const [saved, setSaved] = useState<ThemeChoice | null>(null);
  const choice = saved ?? DEFAULT_CHOICE;
  const { themeName, colorScheme, adwaitaAccent, fluentAccent } = choice;

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

  // An "auto" scheme follows the system's, like AdwStyleManager.
  const dark = useSyncExternalStore(subscribeSystemScheme, systemIsDark, () => false);
  const scheme = colorScheme === "auto" ? (dark ? "dark" : "light") : colorScheme;
  const stylesheet = useMemo(
    () =>
      themeStylesheet({ themeName, colorScheme, adwaitaAccent, fluentAccent }, scheme, BASE_PATH),
    [themeName, colorScheme, adwaitaAccent, fluentAccent, scheme],
  );

  // An "auto" scheme switches to the other scheme's file when the system's
  // changes: load it now, so the switch doesn't wait for it.
  const otherHref =
    saved && colorScheme === "auto"
      ? themeStylesheet(choice, scheme === "dark" ? "light" : "dark", BASE_PATH).href
      : null;
  useEffect(() => {
    if (otherHref) preload(otherHref, { as: "style" });
  }, [otherHref]);

  return {
    ...choice,
    cssHref: saved ? stylesheet.href : undefined,
    cssText: saved ? stylesheet.css : undefined,
    icons: THEME_ICONS[themeName],
    decorationLayout:
      themeName === "whitesur" || themeName === "mactahoe" ? DecorationLayout.MACOS : undefined,
    restored: saved !== null,
    setThemeName: set("themeName"),
    setColorScheme: set("colorScheme"),
    setAdwaitaAccent: set("adwaitaAccent"),
    setFluentAccent: set("fluentAccent"),
    preloadOptions: () => {
      const options: ThemeChoice[] = [
        ...ALLOWED.themeName.map((name) => ({ ...choice, themeName: name })),
        { ...choice, colorScheme: scheme === "dark" ? "light" : "dark" },
      ];
      for (const option of options) {
        const optionScheme =
          option.colorScheme === "auto" ? scheme : (option.colorScheme as "light" | "dark");
        preload(themeStylesheet(option, optionScheme, BASE_PATH).href, { as: "style" });
      }
    },
  };
}

export const ThemePickerContext = createContext<ThemePickerState | null>(null);

/** The site-wide theme choice, from the ThemePickerProvider in the root layout. */
export function useThemePicker(): ThemePickerState {
  const state = useContext(ThemePickerContext);
  if (!state) throw new Error("useThemePicker() needs a <ThemePickerProvider> above it");
  return state;
}
