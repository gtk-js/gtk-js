import type { GtkOrientation } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import type { AdwLengthUnit } from "../types.ts";

export interface AdwClampProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum allocated size. Default: 600. */
  maximumSize?: number;
  /** Size above which the child starts being clamped, smoothly. Default: 400. */
  tighteningThreshold?: number;
  /** Unit for size values. Default: "sp". */
  unit?: AdwLengthUnit;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  children?: ReactNode;
}

/** adw_length_unit_to_px() at the default text scaling factor. */
function toPx(value: number, unit: AdwLengthUnit): number {
  return unit === "pt" ? (value * 96) / 72 : value;
}

/**
 * child_size_from_clamp() in adw-clamp-layout.c: the size given to the child
 * for `forSize` available pixels. Up to the tightening threshold the child
 * gets everything; from there it approaches the maximum size on an ease-out
 * cubic curve, reaching it when 3× the remaining distance is available.
 */
export function clampChildSize(
  forSize: number,
  maximumSize = 600,
  tighteningThreshold = 400,
): { size: number; sizeClass: "small" | "medium" | "large" } {
  const lower = Math.min(tighteningThreshold, maximumSize);
  const max = Math.max(lower, maximumSize);
  const upper = lower + 3 * (max - lower); // ADW_EASE_OUT_TAN_CUBIC
  let size: number;
  if (forSize <= lower) size = forSize;
  else if (forSize >= upper) size = Math.ceil(max);
  else {
    const progress = (forSize - lower) / (upper - lower);
    size = Math.floor(lower + (max - lower) * (1 - (1 - progress) ** 3));
  }
  const sizeClass =
    size >= Math.ceil(max) ? "large" : size <= Math.ceil(lower) ? "small" : "medium";
  return { size, sizeClass };
}

/**
 * AdwClamp — Constrains the size of its child, centering it.
 *
 * Like AdwClampLayout, the child (the clamp's direct child, so theme
 * selectors such as `clamp > box` match) is allocated the eased size from
 * clampChildSize() along the clamp's orientation, including its margins, and
 * gets the `.small`, `.medium` or `.large` style class.
 *
 * CSS node:
 *   clamp
 *     └── [child]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Clamp.html
 * @see upstream/libadwaita/src/adw-clamp-layout.c
 */
export const AdwClamp = forwardRef<HTMLDivElement, AdwClampProps>(function AdwClamp(
  {
    maximumSize = 600,
    tighteningThreshold = 400,
    unit = "sp",
    orientation = "horizontal",
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const horizontal = orientation === "horizontal";

  const allocate = useCallback(() => {
    const clamp = containerRef.current;
    const child = clamp?.firstElementChild as HTMLElement | null | undefined;
    if (!clamp || !child) return;
    const cs = getComputedStyle(clamp);
    const available = horizontal
      ? clamp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      : clamp.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const { size, sizeClass } = clampChildSize(
      available,
      toPx(maximumSize, unit),
      toPx(tighteningThreshold, unit),
    );
    // GTK allocations include the child's margins (and, being content-box
    // here, its border and padding): subtract them to get the CSS size.
    const ccs = getComputedStyle(child);
    const extra = (a: string, b: string) =>
      ["margin", "border", "padding"].reduce(
        (sum, box) =>
          sum +
          parseFloat(ccs.getPropertyValue(`${box}-${a}${box === "border" ? "-width" : ""}`)) +
          parseFloat(ccs.getPropertyValue(`${box}-${b}${box === "border" ? "-width" : ""}`)),
        0,
      );
    const cssSize = `${Math.max(0, size - (horizontal ? extra("left", "right") : extra("top", "bottom")))}px`;
    if (horizontal) child.style.width = cssSize;
    else child.style.height = cssSize;
    for (const c of ["small", "medium", "large"]) child.classList.toggle(c, c === sizeClass);
  }, [horizontal, maximumSize, tighteningThreshold, unit]);

  // Children can change on any render.
  useLayoutEffect(allocate);

  useLayoutEffect(() => {
    const clamp = containerRef.current;
    if (!clamp) return;
    const observer = new ResizeObserver(allocate);
    observer.observe(clamp);
    return () => observer.disconnect();
  }, [allocate]);

  const setRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const classes = ["gtk-clamp"];
  if (className) classes.push(className);

  const clampStyle: CSSProperties = {
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
    // Always centered along the orientation; the child fills the other axis.
    justifyContent: "center",
    alignItems: "stretch",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  return (
    <div ref={setRef} className={classes.join(" ")} style={clampStyle} {...rest}>
      {children}
    </div>
  );
});
