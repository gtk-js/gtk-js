import { forwardRef, type HTMLAttributes, isValidElement, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

/** An overlay with its GtkOverlayLayoutChild properties. */
export interface GtkOverlayChildProps {
  /** The overlay widget, placed by its own halign and valign. */
  child: ReactNode;
  /** Whether the overlay counts for the GtkOverlay's size, like the main child. Default: false. */
  measure?: boolean;
  /** Whether to clip the overlay to the GtkOverlay's area. Default: false. */
  clipOverlay?: boolean;
}

export interface GtkOverlayProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The main content child (rendered first, determines base size). */
  child?: ReactNode;
  /** Overlay children rendered on top: widgets, or `{ child, measure, clipOverlay }`. */
  overlays?: (ReactNode | GtkOverlayChildProps)[];
  children?: ReactNode;
}

/**
 * GtkOverlay — A container that places children on top of each other.
 *
 * CSS node: overlay
 *
 * The child and the overlays share one grid cell, each placed in it by its
 * own halign and valign, as gtk_overlay_get_child_position() does (see
 * layout.css). They're wrapped only to tell them apart: the wrappers take
 * no part in the layout, except that an overlay without measure gets its
 * own layer over the overlay, so it doesn't size it.
 *
 * @see https://docs.gtk.org/gtk4/class.Overlay.html
 */
export const GtkOverlay = forwardRef<HTMLDivElement, GtkOverlayProps>(function GtkOverlay(
  { child, overlays, children, halign, valign, hexpand, vexpand, className, ...rest },
  ref,
) {
  const classes = ["gtk-overlay"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      {child && <div className="gtk-overlay-child">{child}</div>}
      {overlays?.map((overlay, i) => {
        const { child, measure, clipOverlay } = isChildProps(overlay)
          ? overlay
          : { child: overlay };
        return (
          // Only the main child counts for the overlay's expand (gtk_overlay_compute_expand()).
          <div
            key={i}
            className="gtk-overlay-child"
            data-expand-ignored=""
            data-measure={measure ? "" : undefined}
            data-clip-overlay={clipOverlay ? "" : undefined}
          >
            {child}
          </div>
        );
      })}
      {children}
    </div>
  );
});

function isChildProps(overlay: ReactNode | GtkOverlayChildProps): overlay is GtkOverlayChildProps {
  return (
    typeof overlay === "object" &&
    overlay !== null &&
    !isValidElement(overlay) &&
    "child" in overlay
  );
}
