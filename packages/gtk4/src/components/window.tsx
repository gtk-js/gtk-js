import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { type WindowControlsAPI, WindowControlsContext } from "../window-controls-context.tsx";

export interface GtkWindowProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The titlebar widget (typically a GtkHeaderBar). */
  titlebar?: ReactNode;
  /** Main content of the window. */
  children?: ReactNode;
  /**
   * Whether the window is maximized.
   * Adds the .maximized CSS class, which removes border-radius and shadows
   * to match GTK's window manager behavior.
   * @see upstream/gtk/gtk/gtkwindow.c — add_or_remove_class(widget, priv->maximized, "maximized")
   */
  maximized?: boolean;
  /**
   * Whether to allocate space around the window for CSD box-shadow, and
   * render client-side resize handles on the visible window edges.
   *
   * In native GTK, the window manager allocates extra surface space for
   * shadows and uses the shadow region as the resize handle area. In
   * Tauri/Electron, the OS window boundary determines resize handles,
   * so this prop adds padding for the shadow AND renders invisible
   * resize handles at the visible window edges that call `onResize`.
   *
   * When maximized, shadow padding and resize handles are removed.
   * @default false
   */
  allocateShadow?: boolean;
  /** Called when the close button is clicked. */
  onClose?: () => void;
  /** Called when the minimize button is clicked. */
  onMinimize?: () => void;
  /** Called when the maximize button is clicked. */
  onMaximize?: () => void;
  /** Called when the titlebar is dragged (for window move). */
  onDrag?: () => void;
  /**
   * Called when a resize handle edge is dragged. The direction string
   * matches Tauri's `startResizeDragging()` direction parameter.
   * Only used when `allocateShadow` is true.
   */
  onResize?: (direction: string) => void;
}

/**
 * Measure the maximum extent of a box-shadow by reading the computed style.
 * @see upstream/gtk/gtk/gtkcssshadowvalue.c — _gtk_css_shadow_value_get_extents
 */
function measureShadowExtent(el: HTMLElement): number {
  const shadow = getComputedStyle(el).boxShadow;
  if (!shadow || shadow === "none") return 0;

  let maxExtent = 0;
  const regex = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(shadow)) !== null) {
    const [, offsetXRaw = "0", offsetYRaw = "0", blurRaw = "0", spreadRaw = "0"] = match;
    const offsetX = Math.abs(parseFloat(offsetXRaw));
    const offsetY = Math.abs(parseFloat(offsetYRaw));
    const blur = parseFloat(blurRaw);
    const spread = parseFloat(spreadRaw);
    const extent = Math.max(offsetX, offsetY) + blur + spread;
    if (extent > maxExtent) maxExtent = extent;
  }

  return Math.ceil(maxExtent);
}

/** Resize handle size in px — matches GTK's RESIZE_HANDLE_SIZE (12px). */
const HANDLE_SIZE = 12;

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

const HANDLE_EDGES: { direction: ResizeDirection; style: CSSProperties }[] = [
  // Edges
  {
    direction: "North",
    style: {
      top: -HANDLE_SIZE / 2,
      left: HANDLE_SIZE,
      right: HANDLE_SIZE,
      height: HANDLE_SIZE,
      cursor: "n-resize",
    },
  },
  {
    direction: "South",
    style: {
      bottom: -HANDLE_SIZE / 2,
      left: HANDLE_SIZE,
      right: HANDLE_SIZE,
      height: HANDLE_SIZE,
      cursor: "s-resize",
    },
  },
  {
    direction: "West",
    style: {
      left: -HANDLE_SIZE / 2,
      top: HANDLE_SIZE,
      bottom: HANDLE_SIZE,
      width: HANDLE_SIZE,
      cursor: "w-resize",
    },
  },
  {
    direction: "East",
    style: {
      right: -HANDLE_SIZE / 2,
      top: HANDLE_SIZE,
      bottom: HANDLE_SIZE,
      width: HANDLE_SIZE,
      cursor: "e-resize",
    },
  },
  // Corners
  {
    direction: "NorthWest",
    style: {
      top: -HANDLE_SIZE / 2,
      left: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 2,
      height: HANDLE_SIZE * 2,
      cursor: "nw-resize",
    },
  },
  {
    direction: "NorthEast",
    style: {
      top: -HANDLE_SIZE / 2,
      right: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 2,
      height: HANDLE_SIZE * 2,
      cursor: "ne-resize",
    },
  },
  {
    direction: "SouthWest",
    style: {
      bottom: -HANDLE_SIZE / 2,
      left: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 2,
      height: HANDLE_SIZE * 2,
      cursor: "sw-resize",
    },
  },
  {
    direction: "SouthEast",
    style: {
      bottom: -HANDLE_SIZE / 2,
      right: -HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 2,
      height: HANDLE_SIZE * 2,
      cursor: "se-resize",
    },
  },
];

/**
 * GtkWindow — A top-level window.
 *
 * CSS node: window.background.csd
 *
 * ## Tauri/Electron integration
 *
 * Use `allocateShadow` to automatically:
 * 1. Add padding around the window for the CSD box-shadow (measured from CSS)
 * 2. Render invisible resize handles at the visible window edges
 * 3. Remove both when maximized
 *
 * The resize handles call `onResize(direction)` which should invoke
 * Tauri's `startResizeDragging(direction)`.
 *
 * @see https://docs.gtk.org/gtk4/class.Window.html
 */
export const GtkWindow = forwardRef<HTMLDivElement, GtkWindowProps>(function GtkWindow(
  {
    titlebar,
    children,
    halign,
    valign,
    className,
    style,
    maximized,
    allocateShadow = false,
    onClose,
    onMinimize,
    onMaximize,
    onDrag,
    onResize,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-window", "background", "csd"];
  if (maximized) classes.push("maximized");
  if (className) classes.push(className);

  const windowControls = useMemo<WindowControlsAPI>(
    () => ({ close: onClose, minimize: onMinimize, maximize: onMaximize, drag: onDrag }),
    [onClose, onMinimize, onMaximize, onDrag],
  );

  const windowRef = useRef<HTMLDivElement>(null);
  const [shadowPadding, setShadowPadding] = useState(0);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      windowRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    if (!allocateShadow || maximized) {
      setShadowPadding(0);
      return;
    }
    const el = windowRef.current;
    if (!el) return;

    let frame = 0;
    const updateShadowPadding = () => {
      const extent = measureShadowExtent(el);
      setShadowPadding((current) => (current === extent ? current : extent));
    };

    updateShadowPadding();

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateShadowPadding();
      });
    };

    const observer = new MutationObserver(() => {
      scheduleUpdate();
    });

    const themeNode = document.getElementById("gtk-js-theme");
    if (themeNode) {
      // Theme already exists — watch for CSS changes (e.g. color scheme switch).
      observer.observe(themeNode, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      // If the theme is a <link> stylesheet, mutations won't fire when it
      // finishes loading — listen for the load event to re-measure.
      if (themeNode.tagName === "LINK") {
        themeNode.addEventListener("load", scheduleUpdate);
      }
    } else {
      // Theme hasn't been injected yet — watch <head> for its creation,
      // then pivot to watching the theme node itself.
      const headObserver = new MutationObserver(() => {
        const node = document.getElementById("gtk-js-theme");
        if (!node) return;
        headObserver.disconnect();
        scheduleUpdate();
        observer.observe(node, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });
        if (node.tagName === "LINK") {
          node.addEventListener("load", scheduleUpdate);
        }
      });
      headObserver.observe(document.head, { childList: true });

      return () => {
        headObserver.disconnect();
        observer.disconnect();
        const node = document.getElementById("gtk-js-theme");
        if (node?.tagName === "LINK") node.removeEventListener("load", scheduleUpdate);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    return () => {
      observer.disconnect();
      if (themeNode.tagName === "LINK") themeNode.removeEventListener("load", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [allocateShadow, maximized]);

  const showHandles = allocateShadow && !maximized && !!onResize;

  const windowElement = (
    <div
      ref={mergedRef}
      className={classes.join(" ")}
      {...(!allocateShadow ? alignAttrs(halign, valign) : {})}
      style={
        allocateShadow ? { width: "100%", height: "100%", position: "relative", ...style } : style
      }
      {...rest}
    >
      {titlebar && <div className="titlebar">{titlebar}</div>}
      <div className="gtk-box gtk-box-layout vertical" style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
      {showHandles &&
        HANDLE_EDGES.map(({ direction, style: handleStyle }) => (
          <div
            key={direction}
            onPointerDown={() => onResize?.(direction)}
            style={{
              position: "absolute",
              ...handleStyle,
              zIndex: 9999,
            }}
          />
        ))}
    </div>
  );

  if (!allocateShadow) {
    return (
      <WindowControlsContext.Provider value={windowControls}>
        {windowElement}
      </WindowControlsContext.Provider>
    );
  }

  return (
    <WindowControlsContext.Provider value={windowControls}>
      <div
        className="gtk-window-shadow-alloc"
        {...alignAttrs(halign, valign)}
        style={{
          padding: shadowPadding,
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {windowElement}
      </div>
    </WindowControlsContext.Provider>
  );
});
