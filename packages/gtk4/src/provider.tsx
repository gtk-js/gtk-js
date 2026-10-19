import { type GtkTheme } from "@gtk-js/gtk-css";
import * as defaultIcons from "@gtk-js/icons-gtk4";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
   * before hydration without either; a client render is ready before its first
   * paint, so it's never held back unless a `cssHref` stylesheet is still loading.
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

  // Widgets' tooltips (GtkWidget:tooltip-text), shown in this provider.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(trackTooltips, []);

  // Reveal once the theme CSS applies. With inline CSS that's now, before the first
  // paint: a state update from a layout effect renders synchronously.
  useLayoutEffect(() => {
    if (ready) return;
    return whenStylesheetLoaded(document.getElementById("gtk-js-theme"), () => setReady(true));
  }, [ready]);

  return (
    <ThemeContext.Provider value={theme}>
      <ProviderStyleContext.Provider value={style}>
        <IconProvider value={iconMap}>
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
