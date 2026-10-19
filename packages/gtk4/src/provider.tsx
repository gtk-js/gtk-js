import { type GtkTheme, type SystemColorScheme } from "@gtk-js/gtk-css";
import * as defaultIcons from "@gtk-js/icons-gtk4";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  version as reactVersion,
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { trackExpand } from "./expand.ts";
import { type IconMap, IconProvider } from "./icon-context.tsx";
import layoutCSS from "./layouts/layout.css?raw";
import { weighGtkNodeClasses } from "./layouts/specificity.ts";
import resetCSS from "./reset.css?raw";
import { GtkTooltipLayer, trackTooltips } from "./tooltip.tsx";

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

  const existing = document.getElementById(THEME_ID);
  if (existing) {
    // Only when it changed: parsing a theme takes a while.
    if (existing.textContent !== cssText) existing.textContent = cssText;
    return;
  }

  // Or take over the server-rendered copy.
  const style = adoptStylesheet(THEME_ID) ?? document.createElement("style");
  if (style.textContent !== cssText) style.textContent = cssText;
  if (!style.id) {
    style.id = THEME_ID;
    document.head.appendChild(style);
  }

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
/** The provider's `style`, for GtkProviderBoundary. */
const ProviderStyleContext = createContext<CSSProperties | undefined>(undefined);

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
    if (resolvedCSSText) return insertThemeCSS(resolvedCSSText);
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

  // Widgets' tooltips (GtkWidget:tooltip-text), shown in this provider.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(trackTooltips, []);

  // Reveal once the theme CSS applies. With inline CSS that's now, before the first
  // paint: a state update from a layout effect renders synchronously.
  useLayoutEffect(() => {
    if (ready) return;
    return whenStylesheetLoaded(document.getElementById(THEME_ID), () => setReady(true));
  }, [ready]);

  return (
    <ThemeContext.Provider value={theme}>
      <ProviderStyleContext.Provider value={style}>
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
            ref={rootRef}
            data-gtk-provider=""
            data-gtk-ready={ready ? "" : undefined}
            aria-busy={ready ? undefined : true}
            className="background"
            // Hidden, not display: none, so the content is laid out (and measured) already.
            style={ready ? style : { ...style, visibility: "hidden" }}
          >
            {children}
            <GtkTooltipLayer rootRef={rootRef} />
          </div>
        </IconProvider>
      </ProviderStyleContext.Provider>
    </ThemeContext.Provider>
  );
}

/**
 * Re-establishes the provider's scope (reset, default font, theme variables)
 * around content portaled out of it, e.g. a dialog rendered into
 * document.body. It generates no box of its own.
 */
export function GtkProviderBoundary({ children }: { children: ReactNode }) {
  const style = useContext(ProviderStyleContext);
  return (
    <div
      data-gtk-provider=""
      data-gtk-portal=""
      className="background"
      style={{ ...style, display: "contents" }}
    >
      {children}
    </div>
  );
}
