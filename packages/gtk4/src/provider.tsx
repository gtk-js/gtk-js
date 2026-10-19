import { type GtkTheme, type SystemColorScheme } from "@gtk-js/gtk-css";
import * as defaultIcons from "@gtk-js/icons-gtk4";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { trackExpand } from "./expand.ts";
import { type IconMap, IconProvider } from "./icon-context.tsx";
import layoutCSS from "./layouts/layout.css?raw";
import { weighGtkNodeClasses } from "./layouts/specificity.ts";
import resetCSS from "./reset.css?raw";

export interface GtkProviderProps {
  /** Theme instance. Call theme.getCSS() to get the CSS to inject. */
  theme?: GtkTheme;
  /** URL to a theme CSS file (loaded via <link> tag). Ignored if theme is set. */
  cssHref?: string;
  /** Theme CSS as a string (injected via <style> tag). Ignored if theme is set. Takes priority over cssHref. */
  cssText?: string;
  /**
   * Icon set to use. Pass the full export of an icon package (e.g. @gtk-js/icons-adwaita).
   * Like GtkIconTheme, names it lacks fall back to GTK's own icons (@gtk-js/icons-gtk4).
   */
  icons?: IconMap;
  /** Style applied to the root scoping div. */
  style?: CSSProperties;
  children: ReactNode;
}

/** How long transitions stay off while the theme switches, AdwStyleManager's SWITCH_DURATION. */
const SWITCH_DURATION = 250;

const SWITCHING_ID = "gtk-js-switching";
const SWITCHING_CSS =
  "[data-gtk-provider], [data-gtk-provider] *, [data-gtk-provider] *::before, [data-gtk-provider] *::after { transition: none !important; }";

let switchTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Turns transitions off for a moment while the stylesheet changes, like
 * update_stylesheet() in adw-style-manager.c: widgets switch to the new theme,
 * color scheme or accent at once instead of fading between the two.
 */
export function suppressTransitions() {
  let style = document.getElementById(SWITCHING_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = SWITCHING_ID;
    style.textContent = SWITCHING_CSS;
    document.head.appendChild(style);
  }
  clearTimeout(switchTimer);
  switchTimer = setTimeout(() => style.remove(), SWITCH_DURATION);
}

/**
 * Puts the theme CSS in <head>, or replaces the CSS there, and returns what removes
 * the element it added.
 */
export function insertThemeCSS(cssText: string) {
  // A new theme, color scheme or accent, or the system's scheme changed: switch
  // to it without fading.
  suppressTransitions();

  const id = "gtk-js-theme";
  const existing = document.getElementById(id);
  if (existing) {
    // Only when it changed: parsing a theme takes a while.
    if (existing.textContent !== cssText) existing.textContent = cssText;
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);

  return () => {
    style.remove();
  };
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Calls `onChange` when the system switches between light and dark. */
export function subscribeSystemScheme(onChange: () => void) {
  const query = globalThis.matchMedia?.(DARK_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** The system's color scheme, like adw_settings_get_color_scheme(). */
export function getSystemScheme(): SystemColorScheme | undefined {
  const query = globalThis.matchMedia?.(DARK_QUERY);
  return query && (query.matches ? "dark" : "light");
}

/** Unknown on the server, and while hydrating its HTML. */
const getServerSystemScheme = () => undefined;

const ThemeContext = createContext<GtkTheme | undefined>(undefined);

export function useGtkTheme() {
  return useContext(ThemeContext);
}

/**
 * GtkProvider — Initializes a GTK theme, analogous to gtk_init().
 *
 * Injects the reset stylesheet and theme stylesheet, and provides the theme
 * object and icon set to descendants.
 *
 * Pass a theme instance via the `theme` prop. The theme class controls
 * everything about appearance — color scheme, accent color, variants, etc.
 * GtkProvider just injects whatever CSS the theme returns.
 *
 * Everything inside this provider gets browser defaults stripped and the GTK
 * theme applied. Everything outside is completely unaffected.
 */
export function GtkProvider({
  theme,
  cssHref,
  cssText,
  icons = defaultIcons,
  style,
  children,
}: GtkProviderProps) {
  // GTK looks an icon up in the theme, then in its own resources.
  const iconMap = useMemo(
    () => (icons === defaultIcons ? icons : { ...defaultIcons, ...icons }),
    [icons],
  );

  // Followed like AdwStyleManager follows the system setting: an "auto" theme gets
  // the new scheme's CSS, which the insertion effect swaps in without transitions.
  const systemScheme = useSyncExternalStore(
    subscribeSystemScheme,
    getSystemScheme,
    getServerSystemScheme,
  );

  // Resolve theme CSS — theme takes priority, then cssText, then cssHref.
  // Only when an input changes: themes are immutable, and their CSS is large.
  const themeCSS = useMemo(() => theme?.getCSS(systemScheme), [theme, systemScheme]);
  const resolvedCSSText = theme ? themeCSS : cssText;

  // Inject reset + layout CSS
  useInsertionEffect(() => {
    const id = "gtk-js-reset";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = resetCSS + "\n" + weighGtkNodeClasses(layoutCSS);
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  // Inject theme CSS inline
  useInsertionEffect(() => {
    if (resolvedCSSText) return insertThemeCSS(resolvedCSSText);
  }, [resolvedCSSText]);

  // Inject theme stylesheet via <link> (fallback when no cssText/theme provided)
  useInsertionEffect(() => {
    if (resolvedCSSText || !cssHref) return;

    const id = "gtk-js-theme";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = cssHref;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [resolvedCSSText, cssHref]);

  // Layout CSS reads hexpand/vexpand as GTK computes them up the widget tree.
  useLayoutEffect(trackExpand, []);

  return (
    <ThemeContext.Provider value={theme}>
      <IconProvider value={iconMap}>
        <div data-gtk-provider="" className="background" style={style}>
          {children}
        </div>
      </IconProvider>
    </ThemeContext.Provider>
  );
}
