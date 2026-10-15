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
const VIEWPORT_MARGIN = 4;

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

/**
 * GtkPopover — A floating popup attached to a widget.
 *
 * Uses position: fixed to avoid causing document scrollbars (matching
 * GTK's separate-surface behavior). Centers on the anchor, then slides
 * along the cross-axis to stay within the viewport (GDK_ANCHOR_SLIDE).
 * The arrow dynamically points at the anchor's center, clamped to stay
 * within the popover's border-radius (gtk_popover_get_gap_coords).
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
    const isVertical = position === "top" || position === "bottom";

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

    if (position === "bottom") {
      x = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
      y = anchorRect.bottom;
    } else if (position === "top") {
      x = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
      y = anchorRect.top - popHeight;
    } else if (position === "right") {
      x = anchorRect.right;
      y = anchorRect.top + anchorRect.height / 2 - popHeight / 2;
    } else {
      x = anchorRect.left - popWidth;
      y = anchorRect.top + anchorRect.height / 2 - popHeight / 2;
    }

    // Slide: keep within viewport (GTK's GDK_ANCHOR_SLIDE)
    if (isVertical) {
      if (x < VIEWPORT_MARGIN) x = VIEWPORT_MARGIN;
      else if (x + popWidth > viewW - VIEWPORT_MARGIN) x = viewW - VIEWPORT_MARGIN - popWidth;
    } else {
      if (y < VIEWPORT_MARGIN) y = VIEWPORT_MARGIN;
      else if (y + popHeight > viewH - VIEWPORT_MARGIN) y = viewH - VIEWPORT_MARGIN - popHeight;
    }

    popEl.style.left = `${x}px`;
    popEl.style.top = `${y}px`;
    popEl.style.transform = "";

    // Arrow: point at anchor center, clamped to border-radius
    // (matches gtk_popover_get_gap_coords from gtkpopover.c)
    if (hasArrow && arrowRef.current) {
      const contentsEl = popEl.querySelector(".gtk-contents");
      const borderRadius = contentsEl
        ? parseFloat(getComputedStyle(contentsEl).borderTopLeftRadius) || 0
        : 0;
      const popSize = isVertical ? popWidth : popHeight;

      let anchorCenter: number;
      if (isVertical) {
        anchorCenter = anchorRect.left + anchorRect.width / 2 - x;
      } else {
        anchorCenter = anchorRect.top + anchorRect.height / 2 - y;
      }

      const offset = anchorCenter - TAIL_GAP_WIDTH / 2;
      const max = popSize - TAIL_GAP_WIDTH - borderRadius;
      const clamped = Math.max(borderRadius, Math.min(max, offset));
      arrowRef.current.style[isVertical ? "left" : "top"] = `${clamped}px`;
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
    const ro = new ResizeObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updateLayout();
      });
    });
    ro.observe(popEl);
    return () => ro.disconnect();
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
      {...alignAttrs(halign, valign)}
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
