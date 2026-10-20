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
