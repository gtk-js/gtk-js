import React, {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useEscapeLayer } from "../escape-layers.ts";
import { FOCUSABLE } from "../focusable.ts";
import { GtkProviderBoundary } from "../provider.tsx";
import { alignAttrs, type GtkAlign, type GtkAlignProps, type GtkPositionType } from "../types.ts";

// GTK constants from gtkpopover.c lines 162-163
const TAIL_GAP_WIDTH = 24;
const TAIL_HEIGHT = 12;

const OPPOSITE: Record<GtkPositionType, GtkPositionType> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export interface GtkPopoverProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Content of the popover. */
  children?: ReactNode;
  /** Whether the popover is visible. */
  visible?: boolean;
  /** Whether the popover has an arrow. Default: true. */
  hasArrow?: boolean;
  /** Preferred position relative to anchor. Default: "bottom". */
  position?: GtkPositionType;
  /** Close on click outside or Escape. Default: true. */
  autohide?: boolean;
  /** Portal target. false=inline, true=document.body, HTMLElement=custom. Default: false. */
  portal?: boolean | HTMLElement;
  /**
   * Element the popover points to and gives the focus back to when it closes.
   * Defaults to the element it's rendered in (its parent element), so pass it
   * when using `portal`.
   */
  pointingTo?: RefObject<HTMLElement | null>;
  /**
   * Element that opens/toggles the popover (e.g. the button that owns it).
   * Clicks on this element are excluded from outside-click detection so
   * the anchor can own the toggle without the popover fighting it.
   * Matches GTK's GtkMenuButton behavior where the anchor is not treated
   * as "outside" the popover for autohide purposes.
   */
  anchorRef?: RefObject<Element | null>;
  /** Callback when the popover should close. */
  onClosed?: () => void;
}

type Point = [number, number];
type Triangle = [Point, Point, Point];

/** GTK's CLAMP(): the upper bound wins when the bounds cross. */
const clamp = (value: number, low: number, high: number) =>
  value > high ? high : value < low ? low : value;

/** Pixels a Gaussian blur adds on each side (gsk_cairo_blur_compute_pixels()). */
const blurPixels = (radius: number) =>
  Math.floor(radius * ((3 * Math.sqrt(2 * Math.PI)) / 4) * 1.5 + 0.5);

/**
 * How far a computed box-shadow reaches past each side of its box, like
 * gtk_css_shadow_value_get_extents(). GTK makes a popover's surface that much
 * larger than its contents.
 */
export function shadowExtents(boxShadow: string) {
  const extents = { top: 0, right: 0, bottom: 0, left: 0 };
  if (boxShadow === "none") return extents;
  // Shadows are separated by commas outside parentheses (colors have them).
  for (const shadow of boxShadow.split(/,(?![^(]*\))/)) {
    if (/\binset\b/.test(shadow)) continue;
    const lengths = shadow.replace(/\([^)]*\)/g, "").match(/-?[\d.]+px/g) ?? [];
    const [dx = 0, dy = 0, blur = 0, spread = 0] = lengths.map(parseFloat);
    const reach = blurPixels(blur / 2) + spread;
    extents.top = Math.max(extents.top, Math.ceil(reach - dy));
    extents.right = Math.max(extents.right, Math.ceil(reach + dx));
    extents.bottom = Math.max(extents.bottom, Math.ceil(reach + dy));
    extents.left = Math.max(extents.left, Math.ceil(reach - dx));
  }
  return extents;
}

/**
 * Where the arrow's base starts and ends and where its tip is, along the
 * popover's edge (gtk_popover_get_gap_coords()). The tip points at the
 * anchor's center. The base, TAIL_GAP_WIDTH wide, stays within the popover's
 * surface, which reaches past the popover by its contents' shadow, and clear
 * of its border radius; it only leans when the anchor is at that edge.
 */
export function arrowGap(
  anchorCenter: number,
  size: number,
  shadowStart: number,
  shadowEnd: number,
  radius: number,
) {
  const surface = size + shadowStart + shadowEnd;
  const tip = anchorCenter + shadowStart;
  return {
    initial:
      clamp(tip - TAIL_GAP_WIDTH / 2, radius, surface - TAIL_GAP_WIDTH - radius) - shadowStart,
    tip: clamp(tip, 0, surface) - shadowStart,
    final: clamp(tip + TAIL_GAP_WIDTH / 2, radius + TAIL_GAP_WIDTH, surface - radius) - shadowStart,
  };
}

/**
 * The arrow as [along the edge, from the tip] points: base, tip, base. Its
 * base is `depth` from the tip: TAIL_HEIGHT plus the contents' border it
 * covers (gtk_popover_get_gap_coords()).
 */
function arrowTriangle(
  { initial, tip, final }: ReturnType<typeof arrowGap>,
  depth: number,
): Triangle {
  return [
    [initial, depth],
    [tip, 0],
    [final, depth],
  ];
}

/** The triangle with its two sides moved `width` inwards, its base kept. */
export function insetTriangle([a, t, f]: Triangle, width: number): Triangle {
  // Each side as n·p = c, with n its unit normal pointing inwards.
  const side = (p: Point, q: Point, sign: number) => {
    const [nx, ny] = [sign * (q[1] - p[1]), sign * (p[0] - q[0])];
    const length = Math.hypot(nx, ny) || 1;
    const n: Point = [nx / length, ny / length];
    return { n, c: n[0] * p[0] + n[1] * p[1] + width };
  };
  const left = side(a, t, -1);
  const right = side(t, f, -1);
  const depth = a[1];
  const onBase = ({ n, c }: typeof left): Point => [(c - n[1] * depth) / n[0], depth];
  const det = left.n[0] * right.n[1] - left.n[1] * right.n[0];
  const tip: Point = det
    ? [
        (left.c * right.n[1] - left.n[1] * right.c) / det,
        (left.n[0] * right.c - left.c * right.n[0]) / det,
      ]
    : t;
  return [onBase(left), tip, onBase(right)];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of a placed popover that's inside the viewport, as
 * GDK_ANCHOR_RESIZE shrinks a popup that still doesn't fit after flipping and
 * sliding (gdk_surface_layout_popup_helper()).
 */
export function resizeToFit({ x, y, width, height }: Rect, viewWidth: number, viewHeight: number) {
  if (x < 0) {
    width += x;
    x = 0;
  }
  if (x + width > viewWidth) width = viewWidth - x;
  if (y < 0) {
    height += y;
    y = 0;
  }
  if (y + height > viewHeight) height = viewHeight - y;
  return { x, y, width: Math.max(width, 0), height: Math.max(height, 0) };
}

/** The elements Tab moves the focus between, in order. */
function tabbables(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(":disabled") &&
      !el.closest("[inert]") &&
      el.getClientRects().length > 0,
  );
}

/**
 * Gives the focus to `widget` or its first ancestor that takes it, as
 * GtkWindow does for the parent of a widget that's hidden with the focus
 * (maybe_unset_focus_and_default()).
 */
function focusAncestor(widget: HTMLElement | null) {
  for (let el = widget; el; el = el.parentElement) {
    el.focus({ preventScroll: true });
    if (document.activeElement === el) return;
  }
}

/** Mouse events that follow a press an autohide popover consumed (consumePress()). */
const CONSUMED_EVENTS = ["mousedown", "mouseup", "click", "auxclick", "contextmenu"] as const;

function consume(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function stopConsuming() {
  for (const type of CONSUMED_EVENTS) window.removeEventListener(type, consume, true);
  window.removeEventListener("pointerup", consumePointerUp, true);
  window.removeEventListener("pointercancel", stopConsuming, true);
}

// The click (or auxclick) follows the pointerup in the same task.
function consumePointerUp(e: Event) {
  consume(e);
  setTimeout(stopConsuming);
}

/**
 * Consumes a press outside an autohide popover and the mouse events it
 * causes: GDK hides the popup and doesn't deliver the press (check_autohide()),
 * so it neither moves the focus nor activates what's under the pointer.
 */
function consumePress(e: PointerEvent) {
  consume(e);
  stopConsuming();
  for (const type of CONSUMED_EVENTS) window.addEventListener(type, consume, true);
  window.addEventListener("pointerup", consumePointerUp, true);
  window.addEventListener("pointercancel", stopConsuming, true);
}

/**
 * Where a popover of `popSize` starts along an anchor at `start` of `size`, as
 * create_popup_layout() picks the gravities from its halign (top/bottom) or
 * valign (left/right): START lines its start edge up with the anchor's, END
 * its end edge, anything else centers it. In RTL the start is on the right.
 */
export function alignAlong(
  align: GtkAlign | undefined,
  rtl: boolean,
  start: number,
  size: number,
  popSize: number,
) {
  if (align === (rtl ? "end" : "start")) return start;
  if (align === (rtl ? "start" : "end")) return start + size - popSize;
  return start + size / 2 - popSize / 2;
}

/**
 * GtkPopover — A floating popup attached to a widget.
 *
 * Uses position: fixed to avoid causing document scrollbars (matching
 * GTK's separate-surface behavior). Centers on the anchor, or lines up with
 * its start or end edge (alignAlong()), flips to the other side when the
 * preferred one has no room (GDK_ANCHOR_FLIP), then slides along the
 * cross-axis to stay within the viewport (GDK_ANCHOR_SLIDE), and shrinks its
 * contents to what's left (GDK_ANCHOR_RESIZE). Like
 * gdk_surface_layout_popup_helper(), only its shadow may leave the viewport.
 * The arrow points at the anchor's center (arrowGap()). It follows its anchor
 * while open, as GTK re-presents it when its parent moves.
 *
 * With `autohide` it's modal like GTK's: it takes the focus when shown, Tab
 * cycles inside it, and a press outside closes it without reaching what's
 * under the pointer. Closing it with the focus inside gives the focus back to
 * the anchor.
 *
 * CSS node:
 *   popover.background
 *     ├── arrow
 *     └── contents
 *
 * @see https://docs.gtk.org/gtk4/class.Popover.html
 */
export const GtkPopover = forwardRef<HTMLDivElement, GtkPopoverProps>(function GtkPopover(
  {
    children,
    visible = false,
    hasArrow = true,
    position = "bottom",
    autohide = true,
    portal = false,
    pointingTo,
    anchorRef,
    onClosed,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const resolvedRef = (ref as RefObject<HTMLDivElement | null>) ?? popoverRef;
  // The element the popover is rendered in, its default anchor.
  const parentRef = useRef<HTMLElement | null>(null);
  // Read when it opens and closes, not followed while open.
  const latest = useRef({ autohide, pointingTo });
  latest.current = { autohide, pointingTo };

  // Position the popover relative to the anchor using fixed coordinates.
  // Runs when it opens, and while open when its size, its anchor's position
  // or the viewport changes.
  const updateLayout = useCallback(() => {
    const popEl = resolvedRef.current;
    if (!popEl) return;

    // Anchor: explicit pointingTo, or the element the popover is rendered inside
    const anchorEl = pointingTo?.current ?? popEl.parentElement;
    if (!anchorEl || !(anchorEl instanceof HTMLElement)) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const contents = popEl.querySelector<HTMLElement>(":scope > .gtk-contents");

    // Measure popover's natural size (reset position so size isn't constrained)
    popEl.style.left = "0";
    popEl.style.top = "0";
    popEl.style.transform = "none";
    if (contents) {
      contents.style.maxWidth = "";
      contents.style.maxHeight = "";
    }
    const popWidth = popEl.offsetWidth;
    const popHeight = popEl.offsetHeight;

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let x: number;
    let y: number;

    // Flip to the other side when the preferred one has no room and that one
    // does (GDK_ANCHOR_FLIP_Y for top/bottom, GDK_ANCHOR_FLIP_X for left/right).
    const fits = (side: GtkPositionType) =>
      side === "bottom"
        ? anchorRect.bottom + popHeight <= viewH
        : side === "top"
          ? anchorRect.top - popHeight >= 0
          : side === "right"
            ? anchorRect.right + popWidth <= viewW
            : anchorRect.left - popWidth >= 0;
    const side = !fits(position) && fits(OPPOSITE[position]) ? OPPOSITE[position] : position;
    // The arrow and the contents' margin follow the side (layout.css).
    popEl.dataset.position = side;
    const isVertical = side === "top" || side === "bottom";

    // Along the anchor's side, halign (top/bottom) or valign (left/right)
    // picks the gravities (alignAlong()).
    const rtl = getComputedStyle(popEl).direction === "rtl";

    if (side === "bottom") {
      x = alignAlong(halign, rtl, anchorRect.left, anchorRect.width, popWidth);
      y = anchorRect.bottom;
    } else if (side === "top") {
      x = alignAlong(halign, rtl, anchorRect.left, anchorRect.width, popWidth);
      y = anchorRect.top - popHeight;
    } else if (side === "right") {
      x = anchorRect.right;
      y = alignAlong(valign, false, anchorRect.top, anchorRect.height, popHeight);
    } else {
      x = anchorRect.left - popWidth;
      y = alignAlong(valign, false, anchorRect.top, anchorRect.height, popHeight);
    }

    // Slide: keep within viewport (GTK's GDK_ANCHOR_SLIDE)
    if (isVertical) {
      if (x + popWidth > viewW) x = viewW - popWidth;
      if (x < 0) x = 0;
    } else {
      if (y + popHeight > viewH) y = viewH - popHeight;
      if (y < 0) y = 0;
    }

    // Resize: whatever still doesn't fit shrinks the contents, so a long menu
    // scrolls (GDK_ANCHOR_RESIZE).
    const fit = resizeToFit({ x, y, width: popWidth, height: popHeight }, viewW, viewH);
    ({ x, y } = fit);
    const contentsStyle = contents ? getComputedStyle(contents) : null;
    if (contents && contentsStyle) {
      if (fit.width < popWidth)
        contents.style.maxWidth = `${Math.max(parseFloat(contentsStyle.width) - (popWidth - fit.width), 0)}px`;
      if (fit.height < popHeight)
        contents.style.maxHeight = `${Math.max(parseFloat(contentsStyle.height) - (popHeight - fit.height), 0)}px`;
    }

    popEl.style.left = `${x}px`;
    popEl.style.top = `${y}px`;
    popEl.style.transform = "";

    if (hasArrow && arrowRef.current) {
      const shadow = shadowExtents(contentsStyle?.boxShadow ?? "none");
      // The arrow covers the contents' border on its side; GTK reads the top
      // one for bottom and right popovers (gtk_popover_get_gap_coords()).
      const border = parseFloat(
        (side === "top"
          ? contentsStyle?.borderBottomWidth
          : side === "left"
            ? contentsStyle?.borderRightWidth
            : contentsStyle?.borderTopWidth) ?? "0",
      );
      const depth = TAIL_HEIGHT + (border || 0);
      popEl.style.setProperty("--gtk-arrow-depth", `${depth}px`);
      const [start, end, anchorStart, anchorSize] = isVertical
        ? [shadow.left, shadow.right, anchorRect.left - x, anchorRect.width]
        : [shadow.top, shadow.bottom, anchorRect.top - y, anchorRect.height];
      const gap = arrowGap(
        Math.round(anchorStart) + Math.trunc(Math.round(anchorSize) / 2),
        isVertical ? fit.width : fit.height,
        start,
        end,
        // GTK reads the popover's own radius here, not its contents'.
        parseFloat(getComputedStyle(popEl).borderTopLeftRadius) || 0,
      );
      // The two sides are stroked in the arrow's border color, a line of its
      // border width + 1 centered on them (create_arrow_render_node()). The
      // arrow's border fills its box here; the theme gives it the contents'.
      const stroke = (parseFloat(contentsStyle?.borderTopWidth ?? "0") + 1) / 2;
      const toBox = ([u, v]: Point): string => {
        const [px, py] =
          side === "bottom"
            ? [u, v]
            : side === "top"
              ? [u, depth - v]
              : side === "right"
                ? [v, u]
                : [depth - v, u];
        return `${px}px ${py}px`;
      };
      const polygon = (points: Triangle) => `polygon(${points.map(toBox).join(", ")})`;
      const outer = arrowTriangle(gap, depth);
      arrowRef.current.style.clipPath = polygon(outer);
      arrowRef.current.style.setProperty("--gtk-arrow-fill", polygon(insetTriangle(outer, stroke)));
    }
  }, [position, halign, valign, hasArrow, pointingTo, resolvedRef]);

  // Position on mount/update and observe size changes (theme switches
  // change CSS without triggering a React re-render of this component).
  useLayoutEffect(() => {
    if (!visible) return;
    updateLayout();

    const popEl = resolvedRef.current;
    if (!popEl) return;
    parentRef.current = popEl.parentElement;

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updateLayout();
      });
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(popEl);
    // Follow the anchor wherever layout, scrolling or a resize moves it, as GTK
    // re-presents a popover when its parent moves (surface_transform_changed_cb()).
    let placed = "";
    let frame = requestAnimationFrame(function follow() {
      const anchor = pointingTo?.current ?? popEl.parentElement;
      const r = anchor?.getBoundingClientRect();
      const now = r && `${r.left} ${r.top} ${r.width} ${r.height} ${innerWidth} ${innerHeight}`;
      if (placed && now !== placed) updateLayout();
      placed = now ?? "";
      frame = requestAnimationFrame(follow);
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [visible, updateLayout, resolvedRef, pointingTo]);

  // Escape closes the topmost popover or dialog only.
  useEscapeLayer(visible && autohide, resolvedRef, () => onClosed?.());

  // An autohide popover takes the focus when shown: its first focusable child,
  // unless content like a menu already moved it inside (gtk_popover_show()).
  // Hidden with the focus inside, it gives the focus to its anchor or the
  // anchor's first focusable ancestor (cascade_popdown(),
  // maybe_unset_focus_and_default()).
  useEffect(() => {
    const popEl = resolvedRef.current;
    if (!visible || !popEl) return;
    if (latest.current.autohide && !popEl.contains(document.activeElement)) {
      const contents = popEl.querySelector(":scope > .gtk-contents");
      if (contents) tabbables(contents)[0]?.focus({ preventScroll: true });
    }
    let focusInside = popEl.contains(document.activeElement);
    const trackFocus = (e: FocusEvent) => {
      focusInside = e.target instanceof Node && popEl.contains(e.target);
    };
    document.addEventListener("focusin", trackFocus);
    return () => {
      document.removeEventListener("focusin", trackFocus);
      const anchor = latest.current.pointingTo?.current ?? parentRef.current;
      if (focusInside && anchor?.isConnected) focusAncestor(anchor);
    };
  }, [visible, resolvedRef]);

  // A press outside an autohide popover closes it and is consumed. The anchor
  // that toggles it (anchorRef) isn't outside.
  useEffect(() => {
    if (!visible || !autohide) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;

      const target = e.target;
      const el = resolvedRef.current;
      if (el && !el.contains(target) && !anchorRef?.current?.contains(target)) {
        consumePress(e);
        onClosed?.();
      }
    };

    // Not the press that opened it.
    const timeout = setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown, true);
    }, 0);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [visible, autohide, onClosed, resolvedRef, anchorRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    const contents = resolvedRef.current?.querySelector(":scope > .gtk-contents");
    if (e.defaultPrevented || !contents) return;
    // Escape pops down any popover with the focus (gtk_popover_key_pressed());
    // an autohide one gets it as an escape layer.
    if (e.key === "Escape" && !autohide) {
      e.preventDefault();
      onClosed?.();
      return;
    }
    // Tab and Shift+Tab cycle around an autohide popover (gtk_popover_focus()).
    if (e.key !== "Tab" || !autohide || e.ctrlKey || e.altKey || e.metaKey) return;
    const focusable = tabbables(contents);
    const [first, last] = [focusable[0], focusable.at(-1)];
    const current = document.activeElement;
    if (!first || !last) e.preventDefault();
    else if (e.shiftKey ? current === first || !contents.contains(current) : current === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  };

  if (!visible) return null;

  const classes = ["gtk-popover", "background"];
  if (className) classes.push(className);

  // position: fixed so the popover never causes document scrollbars
  // (matching GTK's separate-surface rendering). Actual coordinates
  // are computed imperatively in updateLayout before paint.
  const positionStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 1000,
    top: 0,
    left: 0,
    ...style,
  };

  const content = (
    <div
      ref={resolvedRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-position={position}
      style={positionStyle}
      {...rest}
      onKeyDown={handleKeyDown}
    >
      {hasArrow && <div ref={arrowRef} className="gtk-arrow" />}
      {/* The contents are a bin layout (gtk_popover_init()). */}
      <div className="gtk-contents gtk-bin-layout">{children}</div>
    </div>
  );

  // Portaled out of the provider, the popover needs its scope (reset, font, theme).
  if (portal === true) {
    return createPortal(<GtkProviderBoundary>{content}</GtkProviderBoundary>, document.body);
  }
  if (portal instanceof HTMLElement) {
    return createPortal(<GtkProviderBoundary>{content}</GtkProviderBoundary>, portal);
  }
  return content;
});
