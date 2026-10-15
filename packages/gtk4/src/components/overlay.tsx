import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlign, type GtkAlignProps } from "../types.ts";

export interface GtkOverlayChildProps {
  /** Whether this overlay child contributes to size measurement. Default: false. */
  measure?: boolean;
  /** Whether to clip this child to parent bounds. Default: false. */
  clipOverlay?: boolean;
  /** Horizontal alignment. */
  halign?: GtkAlign;
  /** Vertical alignment. */
  valign?: GtkAlign;
}

export interface GtkOverlayProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The main content child (rendered first, determines base size). */
  child?: ReactNode;
  /** Overlay children rendered on top. */
  overlays?: ReactNode[];
  children?: ReactNode;
}

/**
 * GtkOverlay — A container that places children on top of each other.
 *
 * CSS node: overlay
 *
 * Uses CSS Grid with all children in the same cell for stacking.
 *
 * @see https://docs.gtk.org/gtk4/class.Overlay.html
 */
export const GtkOverlay = forwardRef<HTMLDivElement, GtkOverlayProps>(function GtkOverlay(
  { child, overlays, children, halign, valign, hexpand, vexpand, className, style, ...rest },
  ref,
) {
  const classes = ["gtk-overlay"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={{
        display: "grid",
        gridTemplate: "1fr / 1fr",
        ...style,
      }}
      {...rest}
    >
      {child && <div style={{ gridColumn: 1, gridRow: 1 }}>{child}</div>}
      {overlays?.map((overlay, i) => (
        // Only the main child counts for the overlay's expand (gtk_overlay_compute_expand()).
        <div
          key={i}
          data-expand-ignored=""
          style={{ gridColumn: 1, gridRow: 1, pointerEvents: "none" }}
        >
          <div style={{ pointerEvents: "auto" }}>{overlay}</div>
        </div>
      ))}
      {children}
    </div>
  );
});
