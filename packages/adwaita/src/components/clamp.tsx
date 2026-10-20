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
import { lengthUnitToPx } from "../length-unit.ts";
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

/**
 * child_size_from_clamp() in adw-clamp-layout.c: the size given to the child
 * for `forSize` available pixels. Up to the tightening threshold the child
 * gets everything; from there it approaches the maximum size on an ease-out
 * cubic curve, reaching it when 3× the remaining distance is available.
 * Neither the threshold nor the maximum size go below the child's minimum
 * size.
 */
export function clampChildSize(
  forSize: number,
  maximumSize = 600,
  tighteningThreshold = 400,
  childMinimum = 0,
): { size: number; sizeClass: "small" | "medium" | "large" } {
  const lower = Math.max(Math.min(tighteningThreshold, maximumSize), childMinimum);
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
function applySizeClass(child: Element, sizeClass: string) {
  for (const c of ["small", "medium", "large"]) child.classList.toggle(c, c === sizeClass);
}

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
    // GTK allocations include the child's margins (and, being content-box
    // here, its border and padding): subtract them to get the CSS size.
    const ccs = getComputedStyle(child);
    const [a, b] = horizontal ? ["left", "right"] : ["top", "bottom"];
    const extra = ["margin", "border", "padding"].reduce((sum, box) => {
      const suffix = box === "border" ? "-width" : "";
      return (
        sum +
        parseFloat(ccs.getPropertyValue(`${box}-${a}${suffix}`)) +
        parseFloat(ccs.getPropertyValue(`${box}-${b}${suffix}`))
      );
    }, 0);
    // The child's minimum size along the orientation (gtk_widget_measure()):
    // its min-content size, in whole pixels.
    const dimension = horizontal ? "width" : "height";
    child.style[dimension] = "min-content";
    const minimum = Math.ceil(parseFloat(ccs[dimension]) + extra);
    const { size, sizeClass } = clampChildSize(
      available,
      lengthUnitToPx(maximumSize, unit),
      lengthUnitToPx(tighteningThreshold, unit),
      minimum,
    );
    child.style[dimension] = `${Math.max(0, size - extra)}px`;
    applySizeClass(child, sizeClass);
    // The clamp is never smaller than its child's minimum size
    // (clamp_size_from_child()).
    clamp.style[horizontal ? "minWidth" : "minHeight"] = `${minimum}px`;
    // adw_clamp_layout_allocate() centers the child at (size - child size) / 2
    // in whole pixels: an odd pixel left over goes after the child (to its
    // right, in RTL too), not half a pixel to each side (see layout.css).
    const leftover = available - size;
    clamp.style.setProperty(
      "--gtk-clamp-remainder",
      `${leftover - 2 * Math.floor(leftover / 2)}px`,
    );
    clamp.style.setProperty(
      "--gtk-clamp-remainder-order",
      horizontal && cs.direction === "rtl" ? "-1" : "0",
    );
  }, [horizontal, maximumSize, tighteningThreshold, unit]);

  // Children can change on any render.
  useLayoutEffect(allocate);

  useLayoutEffect(() => {
    const clamp = containerRef.current;
    if (!clamp) return;
    const observer = new ResizeObserver(allocate);
    observer.observe(clamp);
    // Allocate again when the child is replaced or its content changes, which
    // can change its minimum size, and put back the size class, which isn't
    // in the child's className: React drops it when that changes.
    const mutations = new MutationObserver(allocate);
    mutations.observe(clamp, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["class"],
    });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
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
    // allocate() sets the minimum size along the orientation.
    [horizontal ? "minHeight" : "minWidth"]: 0,
    ...style,
  };

  return (
    <div ref={setRef} className={classes.join(" ")} style={clampStyle} {...rest}>
      {children}
    </div>
  );
});
