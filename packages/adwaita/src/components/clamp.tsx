import { type GtkOrientation, observeSize, scheduleLayout } from "@gtk-js/gtk4";
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
 * clampChildSize() along the clamp's orientation, including its margins (in
 * CSS, see layout.css), and gets the `.small`, `.medium` or `.large` style
 * class.
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

  const lower = Math.min(
    lengthUnitToPx(tighteningThreshold, unit),
    lengthUnitToPx(maximumSize, unit),
  );
  const range = Math.max(0, lengthUnitToPx(maximumSize, unit) - lower);

  // The child's minimum size, kept until its content may have changed, as
  // GTK keeps a widget's measurements until it queues a resize: a new size
  // for the clamp alone doesn't measure the child again.
  const minimumRef = useRef<number | null>(null);

  // The child's size is CSS (layout.css), so it's right before hydration too.
  // Once mounted, the allocation also takes the child's minimum size and
  // GTK's whole-pixel centering into account, and sets the style classes,
  // which CSS can't do. It runs in the layout pass: this reads, and returns
  // the writes.
  const allocate = useCallback((): (() => void) | undefined => {
    const clamp = containerRef.current;
    const child = clamp?.firstElementChild as HTMLElement | null | undefined;
    if (!clamp || !child) return undefined;
    const cs = getComputedStyle(clamp);
    const [a, b] = horizontal ? ["left", "right"] : ["top", "bottom"];
    const edges = (style: CSSStyleDeclaration, boxes: string[]) =>
      boxes.reduce((sum, box) => {
        const suffix = box === "border" ? "-width" : "";
        return (
          sum +
          parseFloat(style.getPropertyValue(`${box}-${a}${suffix}`)) +
          parseFloat(style.getPropertyValue(`${box}-${b}${suffix}`))
        );
      }, 0);
    const dimension = horizontal ? "width" : "height";
    // The clamp's content size, unrounded: clientWidth rounds to a whole
    // pixel, and in a parent that gives the clamp a fractional size (a grid
    // track, a percentage) the child would take the fraction on top of its
    // size from the spacers below.
    const available =
      parseFloat(cs[dimension]) -
      (cs.boxSizing === "border-box" ? edges(cs, ["border", "padding"]) : 0);
    // GTK allocations include the child's margins (and, being content-box
    // here, its border and padding).
    const ccs = getComputedStyle(child);
    const extra = edges(ccs, ["margin", "border", "padding"]);
    // The child's minimum size along the orientation (gtk_widget_measure()):
    // its min-content size, in whole pixels, measured out of the flex layout.
    let minimum = minimumRef.current;
    if (minimum === null) {
      const { flex, [dimension]: size0 } = child.style;
      child.style.flex = "none";
      child.style[dimension] = "min-content";
      minimum = Math.ceil(parseFloat(ccs[dimension]) + extra);
      child.style.flex = flex;
      child.style[dimension] = size0;
      minimumRef.current = minimum;
    }
    const { size, sizeClass } = clampChildSize(available, lower + range, lower, minimum);
    // adw_clamp_layout_allocate() centers the child at (size - child size) / 2
    // in whole pixels: an odd pixel left over goes after the child (to its
    // right, in RTL too), not half a pixel to each side. The ::before and
    // ::after spacers (layout.css) take the leftover, the one on the right
    // also any fraction of a pixel, so the child gets exactly `size`.
    const leftover = Math.max(0, available - size);
    const left = Math.floor(leftover / 2);
    const rtl = horizontal && cs.direction === "rtl";
    return () => {
      applySizeClass(child, sizeClass);
      // The clamp is never smaller than its child's minimum size
      // (clamp_size_from_child()).
      clamp.style[horizontal ? "minWidth" : "minHeight"] = `${minimum}px`;
      clamp.style.setProperty("--adw-clamp-before", `${rtl ? leftover - left : left}px`);
      clamp.style.setProperty("--adw-clamp-after", `${rtl ? left : leftover - left}px`);
    };
  }, [horizontal, lower, range]);

  // Children can change on any render, so they're measured again.
  const remeasure = useCallback(() => {
    minimumRef.current = null;
    scheduleLayout(allocate);
  }, [allocate]);
  useLayoutEffect(remeasure);

  useLayoutEffect(() => {
    const clamp = containerRef.current;
    if (!clamp) return;
    const unobserve = observeSize(clamp, () => scheduleLayout(allocate));
    // Allocate again when the child is replaced or its content changes, which
    // can change its minimum size, and put back the size class, which isn't
    // in the child's className: React drops it when that changes.
    const mutations = new MutationObserver(remeasure);
    mutations.observe(clamp, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["class"],
    });
    return () => {
      unobserve();
      mutations.disconnect();
    };
  }, [allocate, remeasure]);

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
    ...({ "--adw-clamp-lower": `${lower}px`, "--adw-clamp-range": `${range}px` } as CSSProperties),
    ...style,
  };

  return (
    <div ref={setRef} className={classes.join(" ")} style={clampStyle} {...rest}>
      {children}
    </div>
  );
});
