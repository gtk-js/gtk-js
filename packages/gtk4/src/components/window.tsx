import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import {
  type WindowControlsAPI,
  WindowControlsContext,
  WindowElementContext,
} from "../window-controls-context.tsx";

export interface GtkWindowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "onDrag">,
    GtkAlignProps {
  /**
   * The window's title. Header bars without a title widget show it; it isn't
   * a tooltip.
   */
  title?: string;
  /** The titlebar widget (typically a GtkHeaderBar). */
  titlebar?: ReactNode;
  /**
   * The window's child. It gets the whole area below the titlebar, where its
   * halign/valign place it (a window has one child: use a box for several).
   */
  children?: ReactNode;
  /**
   * Whether the window is maximized.
   * Adds the .maximized CSS class, which removes border-radius and shadows
   * to match GTK's window manager behavior.
   * @see upstream/gtk/gtk/gtkwindow.c — add_or_remove_class(widget, priv->maximized, "maximized")
   */
  maximized?: boolean;
  /**
   * Whether the window is fullscreen: the .fullscreen class, no rounded
   * corners, shadow or resize handles.
   */
  fullscreen?: boolean;
  /**
   * Whether the window is tiled (snapped to a screen edge): the .tiled class,
   * square corners and no resize handles.
   */
  tiled?: boolean;
  /**
   * Whether to allocate space around the window for CSD box-shadow, and
   * render client-side resize handles in it, just outside the window's edges.
   *
   * In native GTK, the window manager allocates extra surface space for
   * shadows and uses the shadow region as the resize handle area. In
   * Tauri/Electron, the OS window boundary determines resize handles,
   * so this prop adds padding for the shadow (at least 12px) AND renders
   * invisible resize handles in its 12px next to the window's edges (and in
   * its rounded corners) that call `onResize`.
   *
   * When maximized or fullscreen, shadow padding and resize handles are
   * removed; when tiled, the resize handles.
   * @default false
   */
  allocateShadow?: boolean;
  /** Called when a close button is clicked (the window.close action). */
  onClose?: () => void;
  /** Called when a minimize button is clicked (the window.minimize action). */
  onMinimize?: () => void;
  /**
   * Called when a maximize/restore button is clicked or a title bar is
   * double-clicked (the window.toggle-maximized action).
   */
  onMaximize?: () => void;
  /**
   * Called when a press on a title bar (a window handle) is dragged past the
   * drag threshold, with that pointer move, to start moving the window (e.g.
   * Tauri's `startDragging()`).
   */
  onDrag?: (event: PointerEvent<HTMLDivElement>) => void;
  /**
   * Make window handles (header bars) draggable regions, for hosts that move
   * frameless windows through CSS `app-region` (Electron, installed web apps
   * with window controls overlay) rather than `onDrag`. Like
   * GtkWindowHandle, a press on a widget inside it (a button, an entry)
   * still goes to that widget.
   * @default false
   */
  draggableRegions?: boolean;
  /**
   * Called with the width of the shadow around the window (0 when there is
   * none, e.g. maximized), as GTK tells the compositor with
   * gdk_toplevel_set_shadow_width(), so the host can tell where the visible
   * window is (input region, tiling, snapping). Only measured when
   * `allocateShadow` is true.
   */
  onShadowWidthChanged?: (width: number) => void;
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

/** How far corner handles reach along each edge — RESIZE_HANDLE_CORNER_SIZE. */
const HANDLE_CORNER_SIZE = 24;

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  North: "n-resize",
  South: "s-resize",
  East: "e-resize",
  West: "w-resize",
  NorthEast: "ne-resize",
  NorthWest: "nw-resize",
  SouthEast: "se-resize",
  SouthWest: "sw-resize",
};

/**
 * The resize handles around a window `inset` px inside its shadow allocation,
 * like get_edge_for_coordinates(): edges are HANDLE_SIZE px outside the
 * window's box (the input region past it), corners reach `corner` px along
 * each edge. Corner handles also cover the window's corners, under it, so
 * they're hit only where its rounded corners leave them uncovered.
 */
function resizeHandles(inset: number, corner: number): [ResizeDirection, CSSProperties][] {
  const out = inset - HANDLE_SIZE;
  const along = inset + corner;
  const square = HANDLE_SIZE + corner;
  return [
    ["North", { top: out, left: along, right: along, height: HANDLE_SIZE }],
    ["South", { bottom: out, left: along, right: along, height: HANDLE_SIZE }],
    ["West", { left: out, top: along, bottom: along, width: HANDLE_SIZE }],
    ["East", { right: out, top: along, bottom: along, width: HANDLE_SIZE }],
    ["NorthWest", { top: out, left: out, width: square, height: square }],
    ["NorthEast", { top: out, right: out, width: square, height: square }],
    ["SouthWest", { bottom: out, left: out, width: square, height: square }],
    ["SouthEast", { bottom: out, right: out, width: square, height: square }],
  ];
}

/**
 * GtkWindow — A top-level window.
 *
 * CSS node: window.background.csd
 *
 * ## Tauri/Electron integration
 *
 * Use `allocateShadow` to automatically:
 * 1. Add padding around the window for the CSD box-shadow (measured from CSS)
 * 2. Render invisible resize handles in that shadow, around the window's edges
 * 3. Remove both when maximized or fullscreen (and the handles when tiled)
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
    hexpand,
    vexpand,
    className,
    style,
    title,
    maximized,
    fullscreen,
    tiled,
    allocateShadow = false,
    onClose,
    onMinimize,
    onMaximize,
    onDrag,
    draggableRegions = false,
    onShadowWidthChanged,
    onResize,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-window", "background", "csd"];
  // update_window_style_classes()
  if (maximized) classes.push("maximized");
  if (fullscreen) classes.push("fullscreen");
  if (tiled) classes.push("tiled");
  if (className) classes.push(className);

  const windowControls = useMemo<WindowControlsAPI>(
    () => ({
      close: onClose,
      minimize: onMinimize,
      maximize: onMaximize,
      drag: onDrag,
      maximized: !!maximized,
      title,
    }),
    [onClose, onMinimize, onMaximize, onDrag, maximized, title],
  );

  const windowRef = useRef<HTMLDivElement>(null);
  const [shadowPadding, setShadowPadding] = useState(0);
  const [cornerSize, setCornerSize] = useState(HANDLE_CORNER_SIZE);
  const [windowElement, setWindowElement] = useState<HTMLDivElement | null>(null);

  // Report changes of the shadow width only, whatever the callback's identity.
  const shadowWidthChanged = useRef(onShadowWidthChanged);
  shadowWidthChanged.current = onShadowWidthChanged;
  useEffect(() => {
    shadowWidthChanged.current?.(shadowPadding);
  }, [shadowPadding]);

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      windowRef.current = node;
      setWindowElement(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useLayoutEffect(() => {
    // get_shadow_width(): none when maximized or fullscreen.
    if (!allocateShadow || maximized || fullscreen) {
      setShadowPadding(0);
      return;
    }
    const el = windowRef.current;
    if (!el) return;

    let frame = 0;
    const updateShadowPadding = () => {
      // At least RESIZE_HANDLE_SIZE, room for the resize handles.
      const extent = Math.max(measureShadowExtent(el), HANDLE_SIZE);
      setShadowPadding((current) => (current === extent ? current : extent));
      // Corner handles reach at least as far as the window's corner radius.
      const cs = getComputedStyle(el);
      const radius = Math.max(
        ...[
          cs.borderTopLeftRadius,
          cs.borderTopRightRadius,
          cs.borderBottomRightRadius,
          cs.borderBottomLeftRadius,
        ].map((r) => parseFloat(r) || 0),
      );
      setCornerSize(Math.max(HANDLE_CORNER_SIZE, Math.ceil(radius)));
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
  }, [allocateShadow, maximized, fullscreen, tiled]);

  // get_edge_for_coordinates(): no resize edges when maximized, fullscreen or
  // tiled.
  const showHandles = allocateShadow && !maximized && !fullscreen && !tiled && !!onResize;

  const windowNode = (
    <div
      ref={mergedRef}
      className={classes.join(" ")}
      data-draggable-regions={draggableRegions ? "" : undefined}
      {...(!allocateShadow ? alignAttrs(halign, valign, hexpand, vexpand) : {})}
      style={
        allocateShadow ? { width: "100%", height: "100%", position: "relative", ...style } : style
      }
      {...rest}
    >
      {titlebar && <div className="titlebar">{titlebar}</div>}
      {/* The child gets the whole area below the titlebar, placed by its
          halign/valign (_gtk_window_set_allocation()). */}
      <div className="gtk-bin-layout" style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );

  if (!allocateShadow) {
    return (
      <WindowControlsContext.Provider value={windowControls}>
        <WindowElementContext.Provider value={windowElement}>
          {windowNode}
        </WindowElementContext.Provider>
      </WindowControlsContext.Provider>
    );
  }

  return (
    <WindowControlsContext.Provider value={windowControls}>
      <div
        className="gtk-window-shadow-alloc"
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        style={{
          padding: shadowPadding,
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* In the shadow around the window, painted under it. */}
        {showHandles &&
          resizeHandles(shadowPadding, cornerSize).map(([direction, handleStyle]) => (
            <div
              key={direction}
              onPointerDown={(e) => {
                if (e.button === 0) onResize?.(direction);
              }}
              style={{ position: "absolute", cursor: RESIZE_CURSORS[direction], ...handleStyle }}
            />
          ))}
        <WindowElementContext.Provider value={windowElement}>
          {windowNode}
        </WindowElementContext.Provider>
      </div>
    </WindowControlsContext.Provider>
  );
});
