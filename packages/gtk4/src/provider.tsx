import { GTK_LAYERS, type GtkTheme, type SystemColorScheme } from "@gtk-js/gtk-css";
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
import { DEFAULT_DECORATION_LAYOUT, DecorationLayoutContext } from "./window-controls-context.tsx";

export interface GtkProviderProps {
  /** Theme instance. Call theme.getCSS() to get the CSS to inject. */
  theme?: GtkTheme;
  /**
   * URL to a theme CSS file (loaded via <link> tag). Ignored if theme is set. A
   * new URL replaces the stylesheet once the new one has loaded, with
   * transitions off, so the page never shows neither or a mix of both.
   */
  cssHref?: string;
  /**
   * Theme CSS as a string (injected via <style> tag). Ignored if theme is set.
   * With cssHref, CSS that goes after that stylesheet, e.g. an accent color.
   */
  cssText?: string;
  /**
   * Icon set to use. Pass the full export of an icon package (e.g. @gtk-js/icons-adwaita).
   * Like GtkIconTheme, names it lacks fall back to GTK's own icons (@gtk-js/icons-gtk4).
   */
  icons?: IconMap;
  /**
   * GtkSettings:gtk-decoration-layout: where header bars put the window
   * buttons, e.g. "close,minimize,maximize:" for macOS's order on the left.
   * Default: "appmenu:minimize,maximize,close".
   */
  decorationLayout?: string;
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
/**
 * The theme's element in <head>. A page can link the theme itself before
 * React runs, e.g. from a script that picks a saved theme before the first
 * paint: a provider with that cssHref takes over `<link id="gtk-js-theme">`,
 * and `<style id="gtk-js-theme-text">` after it for its cssText.
 */
const THEME_ID = "gtk-js-theme";
const THEME_TEXT_ID = "gtk-js-theme-text";
/**
 * The reset is in the lowest cascade layer (GTK_LAYERS): like the browser's
 * defaults it strips, it's under everything, libadwaita's stylesheet under a
 * theme for libadwaita apps included. Layout is unlayered, weighed with the theme.
 */
const BASE_CSS = `${GTK_LAYERS}\n@layer gtk-reset {\n${resetCSS}\n}\n${weighGtkNodeClasses(layoutCSS)}`;

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

/** The theme stylesheet loading to replace the current one, and the CSS to put after it. */
let pendingLink: HTMLLinkElement | null = null;
let pendingText: string | undefined;

/**
 * Puts the theme CSS in <head>, or replaces the CSS there, and returns what removes
 * the element it added.
 */
export function insertThemeCSS(cssText: string) {
  // A new theme, color scheme or accent, or the system's scheme changed: switch
  // to it without fading.
  suppressTransitions();

  // A linked theme (cssHref) before, and the CSS after it: this one replaces them.
  pendingLink?.remove();
  pendingLink = null;
  document.getElementById(THEME_TEXT_ID)?.remove();
  const linked = document.getElementById(THEME_ID);
  const existing = linked?.localName === "link" ? null : linked;
  if (linked && !existing) {
    const style = document.createElement("style");
    style.id = THEME_ID;
    style.textContent = cssText;
    linked.replaceWith(style);
    return () => {
      style.remove();
    };
  }
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

/**
 * Links the theme stylesheet at `href`, with `cssText` after it, or switches to
 * them. A new stylesheet replaces the old one once it has loaded (or failed, or
 * timed out), so no frame shows neither or a mix of both, and transitions are
 * off then, as insertThemeCSS() switches.
 */
export function linkThemeCSS(href: string, cssText?: string) {
  const current = document.getElementById(THEME_ID) ?? adoptStylesheet(THEME_ID);
  // CSS after the stylesheet, kept right after it.
  const setText = (link: Element, cssText?: string) => {
    const text = document.getElementById(THEME_TEXT_ID) ?? adoptStylesheet(THEME_TEXT_ID);
    if (!cssText) {
      text?.remove();
      return;
    }
    const style = text ?? document.createElement("style");
    style.id = THEME_TEXT_ID;
    if (style.textContent !== cssText) style.textContent = cssText;
    if (link.nextElementSibling !== style) link.after(style);
  };

  const url = new URL(href, document.baseURI).href;
  if (current?.localName === "link" && (current as HTMLLinkElement).href === url) {
    pendingLink?.remove();
    pendingLink = null;
    const text = document.getElementById(THEME_TEXT_ID) ?? adoptStylesheet(THEME_TEXT_ID);
    if ((text?.textContent ?? "") !== (cssText ?? "")) suppressTransitions();
    setText(current, cssText);
    return;
  }
  pendingText = cssText;
  if (pendingLink?.href === url) return;

  pendingLink?.remove();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  if (!current) {
    // Nothing to keep showing meanwhile.
    link.id = THEME_ID;
    document.head.appendChild(link);
    setText(link, cssText);
    return;
  }
  current.after(link);
  pendingLink = link;
  whenStylesheetLoaded(link, () => {
    if (pendingLink !== link) return;
    pendingLink = null;
    suppressTransitions();
    current.remove();
    link.id = THEME_ID;
    setText(link, pendingText);
  });
}

/** Providers showing a linked theme (cssHref). */
let linkedThemeUsers = 0;

/** Keeps the linked theme while a provider shows it; returns what releases it. */
function holdLinkedTheme() {
  linkedThemeUsers++;
  return () => {
    linkedThemeUsers--;
    // Once no provider replaces this one in the same commit, e.g. on navigation.
    queueMicrotask(() => {
      if (linkedThemeUsers > 0) return;
      pendingLink?.remove();
      pendingLink = null;
      const theme = document.getElementById(THEME_ID);
      if (theme?.localName === "link") theme.remove();
      document.getElementById(THEME_TEXT_ID)?.remove();
    });
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
  decorationLayout = DEFAULT_DECORATION_LAYOUT,
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

  // Resolve theme CSS — theme takes priority, then cssHref (with cssText after
  // it), then cssText. Only when an input changes: themes are immutable, and
  // their CSS is large.
  const themeCSS = useMemo(() => theme?.getCSS(systemScheme), [theme, systemScheme]);
  const linkedHref = theme ? undefined : cssHref;
  const resolvedCSSText = theme ? themeCSS : linkedHref ? undefined : cssText;
  const linkedText = linkedHref ? cssText : undefined;

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

  // Link the theme stylesheet (cssHref), or switch to a new one.
  useInsertionEffect(() => {
    if (linkedHref) linkThemeCSS(linkedHref, linkedText);
  }, [linkedHref, linkedText]);
  const linked = !!linkedHref;
  useInsertionEffect(() => {
    if (linked) return holdLinkedTheme();
  }, [linked]);

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
          <DecorationLayoutContext.Provider value={decorationLayout}>
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
                  linkedHref && (
                    <>
                      <link rel="stylesheet" href={linkedHref} precedence={THEME_ID} />
                      {linkedText && (
                        <style href={THEME_TEXT_ID} precedence={THEME_TEXT_ID}>
                          {linkedText}
                        </style>
                      )}
                    </>
                  )
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
          </DecorationLayoutContext.Provider>
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
