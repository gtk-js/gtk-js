import { type GtkTheme } from "@gtk-js/gtk-css";
import * as defaultIcons from "@gtk-js/icons-gtk4";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
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

  // Resolve theme CSS — theme takes priority, then cssText, then cssHref
  const resolvedCSSText = theme ? theme.getCSS() : cssText;

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
    if (!resolvedCSSText) return;

    const id = "gtk-js-theme";
    const existing = document.getElementById(id);
    if (existing) {
      existing.textContent = resolvedCSSText;
      return;
    }

    const style = document.createElement("style");
    style.id = id;
    style.textContent = resolvedCSSText;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
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
