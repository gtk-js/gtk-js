import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useEscapeLayer } from "../escape-layers.ts";
import { alignAttrs, type GtkAlignProps, type GtkPositionType } from "../types.ts";

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
   * Element the arrow should point to. Defaults to the popover's
   * offsetParent (the nearest positioned ancestor).
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

/** The arrow's depth: TAIL_HEIGHT, plus the contents' border it covers. */
const ARROW_DEPTH = TAIL_HEIGHT + 1;

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

/** The arrow as [along the edge, from the tip] points: base, tip, base. */
function arrowTriangle({ initial, tip, final }: ReturnType<typeof arrowGap>): Triangle {
  return [
    [initial, ARROW_DEPTH],
    [tip, 0],
    [final, ARROW_DEPTH],
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
  const onBase = ({ n, c }: typeof left): Point => [(c - n[1] * ARROW_DEPTH) / n[0], ARROW_DEPTH];
  const det = left.n[0] * right.n[1] - left.n[1] * right.n[0];
  const tip: Point = det
    ? [
        (left.c * right.n[1] - left.n[1] * right.c) / det,
        (left.n[0] * right.c - left.c * right.n[0]) / det,
      ]
    : t;
  return [onBase(left), tip, onBase(right)];
}

/**
 * GtkPopover — A floating popup attached to a widget.
 *
 * Uses position: fixed to avoid causing document scrollbars (matching
 * GTK's separate-surface behavior). Centers on the anchor, flips to the
 * other side when the preferred one has no room (GDK_ANCHOR_FLIP), then
 * slides along the cross-axis to stay within the viewport (GDK_ANCHOR_SLIDE).
 * Like gdk_surface_layout_popup_helper(), only its shadow may leave the
 * viewport. The arrow points at the anchor's center (arrowGap()).
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
    ...rest
  },
  ref,
) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const resolvedRef = (ref as RefObject<HTMLDivElement | null>) ?? popoverRef;

  // Position the popover relative to the anchor using fixed coordinates.
  // Runs on every render and via ResizeObserver for CSS-only changes.
  const updateLayout = useCallback(() => {
    const popEl = resolvedRef.current;
    if (!popEl) return;

    // Anchor: explicit pointingTo, or the element the popover is rendered inside
    const anchorEl = pointingTo?.current ?? popEl.parentElement;
    if (!anchorEl || !(anchorEl instanceof HTMLElement)) return;

    const anchorRect = anchorEl.getBoundingClientRect();

    // Measure popover's natural size (reset position so size isn't constrained)
    popEl.style.left = "0";
    popEl.style.top = "0";
    popEl.style.transform = "none";
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

    if (side === "bottom") {
      x = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
      y = anchorRect.bottom;
    } else if (side === "top") {
      x = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
      y = anchorRect.top - popHeight;
    } else if (side === "right") {
      x = anchorRect.right;
      y = anchorRect.top + anchorRect.height / 2 - popHeight / 2;
    } else {
      x = anchorRect.left - popWidth;
      y = anchorRect.top + anchorRect.height / 2 - popHeight / 2;
    }

    // Slide: keep within viewport (GTK's GDK_ANCHOR_SLIDE)
    if (isVertical) {
      if (x + popWidth > viewW) x = viewW - popWidth;
      if (x < 0) x = 0;
    } else {
      if (y + popHeight > viewH) y = viewH - popHeight;
      if (y < 0) y = 0;
    }

    popEl.style.left = `${x}px`;
    popEl.style.top = `${y}px`;
    popEl.style.transform = "";

    if (hasArrow && arrowRef.current) {
      const contents = popEl.querySelector(".gtk-contents");
      const contentsStyle = contents ? getComputedStyle(contents) : null;
      const shadow = shadowExtents(contentsStyle?.boxShadow ?? "none");
      const [start, end, anchorStart, anchorSize] = isVertical
        ? [shadow.left, shadow.right, anchorRect.left - x, anchorRect.width]
        : [shadow.top, shadow.bottom, anchorRect.top - y, anchorRect.height];
      const gap = arrowGap(
        Math.round(anchorStart) + Math.trunc(Math.round(anchorSize) / 2),
        isVertical ? popWidth : popHeight,
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
              ? [u, ARROW_DEPTH - v]
              : side === "right"
                ? [v, u]
                : [ARROW_DEPTH - v, u];
        return `${px}px ${py}px`;
      };
      const polygon = (points: Triangle) => `polygon(${points.map(toBox).join(", ")})`;
      const outer = arrowTriangle(gap);
      arrowRef.current.style.clipPath = polygon(outer);
      arrowRef.current.style.setProperty("--gtk-arrow-fill", polygon(insetTriangle(outer, stroke)));
    }
  }, [position, hasArrow, pointingTo, resolvedRef]);

  // Position on mount/update and observe size changes (theme switches
  // change CSS without triggering a React re-render of this component).
  useLayoutEffect(() => {
    if (!visible) return;
    updateLayout();

    const popEl = resolvedRef.current;
    if (!popEl) return;

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
    // Follow the anchor when anything scrolls or the window resizes, as GTK
    // moves a popover with its parent.
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [visible, updateLayout, resolvedRef]);

  // Escape closes the topmost popover or dialog only.
  useEscapeLayer(visible && autohide, resolvedRef, () => onClosed?.());

  // Handle click outside
  useEffect(() => {
    if (!visible || !autohide) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return;

      const target = e.target;
      const el = resolvedRef.current;
      if (el && !el.contains(target) && !anchorRef?.current?.contains(target)) {
        onClosed?.();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [visible, autohide, onClosed, resolvedRef, anchorRef]);

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
    >
      {hasArrow && <div ref={arrowRef} className="gtk-arrow" />}
      <div className="gtk-contents">{children}</div>
    </div>
  );

  if (portal === true) {
    return createPortal(content, document.body);
  }
  if (portal instanceof HTMLElement) {
    return createPortal(content, portal);
  }
  return content;
});
