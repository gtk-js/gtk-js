import { type GtkTheme } from "@gtk-js/gtk-css";
import * as defaultIcons from "@gtk-js/icons-gtk4";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  version as reactVersion,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useState,
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
  /**
   * Keep the content laid out but invisible until it's ready: the theme CSS has
   * loaded and layout computed in JS (expand) has run. Server-rendered HTML paints
   * before hydration without expand (and with React 18, without the theme CSS); a
   * client render is ready before its first paint, so it's never held back unless
   * a `cssHref` stylesheet is still loading.
   * Default: true.
   */
  hideUntilReady?: boolean;
  children: ReactNode;
}

/** How long to wait for a `cssHref` stylesheet before showing the content anyway. */
const STYLESHEET_TIMEOUT = 3000;

/** Shows gated content when JavaScript is off, since nothing would ever reveal it. */
const NOSCRIPT_CSS = "[data-gtk-provider]{visibility:visible!important}";

/**
 * Calls `done` once the theme element applies: a <style> at once, a <link> when it
 * has loaded or failed, or after `timeout`. Returns a function that cancels it.
 */
export function whenStylesheetLoaded(
  element: Element | null,
  done: () => void,
  timeout = STYLESHEET_TIMEOUT,
): () => void {
  if (element?.localName !== "link" || (element as HTMLLinkElement).sheet) {
    done();
    return () => {};
  }
  const finish = () => {
    cancel();
    done();
  };
  const timer = setTimeout(finish, timeout);
  element.addEventListener("load", finish);
  element.addEventListener("error", finish);
  function cancel() {
    clearTimeout(timer);
    element!.removeEventListener("load", finish);
    element!.removeEventListener("error", finish);
  }
  return cancel;
}

/**
 * React 19 hoists `<style href precedence>` and `<link rel="stylesheet" precedence>`
 * into <head>, server HTML included, and renders each href once per document.
 * React 18 renders them in place, so there the CSS is only injected on the client.
 */
const HOISTS_STYLESHEETS = Number.parseInt(reactVersion, 10) >= 19;

const RESET_ID = "gtk-js-reset";
const THEME_ID = "gtk-js-theme";
const BASE_CSS = resetCSS + "\n" + weighGtkNodeClasses(layoutCSS);

/**
 * Takes over the server-rendered element for `id`, if there is one. Each has a
 * precedence of its own: React merges the styles that share one into one element.
 */
function adoptStylesheet(id: string): HTMLElement | null {
  const element = document.querySelector<HTMLElement>(`[data-precedence="${id}"]`);
  if (element) element.id = id;
  return element;
}

const subscribeNever = () => () => {};

/** True when rendering on the server or hydrating its HTML, false in client renders. */
function useServerRender() {
  return useSyncExternalStore(
    subscribeNever,
    () => false,
    () => true,
  );
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
  hideUntilReady = true,
  children,
}: GtkProviderProps) {
  const [ready, setReady] = useState(!hideUntilReady);
  const serverRender = useServerRender();

  // GTK looks an icon up in the theme, then in its own resources.
  const iconMap = useMemo(
    () => (icons === defaultIcons ? icons : { ...defaultIcons, ...icons }),
    [icons],
  );

  // Resolve theme CSS — theme takes priority, then cssText, then cssHref
  const resolvedCSSText = theme ? theme.getCSS() : cssText;

  // Inject reset + layout CSS, or take over the server-rendered copy.
  useInsertionEffect(() => {
    if (document.getElementById(RESET_ID)) return;

    const style = adoptStylesheet(RESET_ID) ?? document.createElement("style");
    if (!style.id) {
      style.id = RESET_ID;
      style.textContent = BASE_CSS;
      document.head.appendChild(style);
    }

    return () => {
      style.remove();
    };
  }, []);

  // Inject theme CSS inline
  useInsertionEffect(() => {
    if (!resolvedCSSText) return;

    const existing = document.getElementById(THEME_ID);
    if (existing) {
      // Only when it changed: parsing a theme takes a while.
      if (existing.textContent !== resolvedCSSText) existing.textContent = resolvedCSSText;
      return;
    }

    const style = adoptStylesheet(THEME_ID) ?? document.createElement("style");
    if (style.textContent !== resolvedCSSText) style.textContent = resolvedCSSText;
    if (!style.id) {
      style.id = THEME_ID;
      document.head.appendChild(style);
    }

    return () => {
      style.remove();
    };
  }, [resolvedCSSText]);

  // Inject theme stylesheet via <link> (fallback when no cssText/theme provided)
  useInsertionEffect(() => {
    if (resolvedCSSText || !cssHref) return;

    if (document.getElementById(THEME_ID)) return;

    const link = adoptStylesheet(THEME_ID) ?? document.createElement("link");
    if (!link.id) {
      link.id = THEME_ID;
      (link as HTMLLinkElement).rel = "stylesheet";
      (link as HTMLLinkElement).href = cssHref;
      document.head.appendChild(link);
    }

    return () => {
      link.remove();
    };
  }, [resolvedCSSText, cssHref]);

  // Layout CSS reads hexpand/vexpand as GTK computes them up the widget tree.
  useLayoutEffect(trackExpand, []);

  // Reveal once the theme CSS applies. With inline CSS that's now, before the first
  // paint: a state update from a layout effect renders synchronously.
  useLayoutEffect(() => {
    if (ready) return;
    return whenStylesheetLoaded(document.getElementById(THEME_ID), () => setReady(true));
  }, [ready]);

  return (
    <ThemeContext.Provider value={theme}>
      <IconProvider value={iconMap}>
        {/* The CSS in the server HTML, so it's styled at first paint. Rendered while
            hydrating too, to match; the effects above then take the elements over. */}
        {HOISTS_STYLESHEETS && serverRender && (
          <>
            <style href={RESET_ID} precedence={RESET_ID}>
              {BASE_CSS}
            </style>
            {resolvedCSSText ? (
              <style href={THEME_ID} precedence={THEME_ID}>
                {resolvedCSSText}
              </style>
            ) : (
              cssHref && <link rel="stylesheet" href={cssHref} precedence={THEME_ID} />
            )}
          </>
        )}
        {!ready && (
          <noscript>
            <style>{NOSCRIPT_CSS}</style>
          </noscript>
        )}
        <div
          data-gtk-provider=""
          data-gtk-ready={ready ? "" : undefined}
          aria-busy={ready ? undefined : true}
          className="background"
          // Hidden, not display: none, so the content is laid out (and measured) already.
          style={ready ? style : { ...style, visibility: "hidden" }}
        >
          {children}
        </div>
      </IconProvider>
    </ThemeContext.Provider>
  );
}
