/**
 * Whether animations are off: GtkSettings:gtk-enable-animations, which the
 * web gets from the user's reduced-motion preference.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** ease_out_cubic() in gtkprogresstracker.c: 1 - (1 - t)³. */
export function easeOutCubic(t: number): number {
  return (t - 1) ** 3 + 1;
}

/**
 * easeOutCubic() as a CSS timing function, for animations the browser runs:
 * 1 - (1 - t)³ is exactly the cubic Bézier with control points (1/3, 1) and
 * (2/3, 1). Stylesheets use it as var(--gtk-ease-out-cubic) (reset.css).
 */
export const EASE_OUT_CUBIC = "cubic-bezier(0.3333333, 1, 0.6666667, 1)";
