/**
 * libadwaita's easing curves (adw-easing.c), for timed animations.
 */

/** ADW_EASE as a CSS timing function, for animations the browser runs. */
export const ADW_EASE_CSS = "cubic-bezier(0.25, 0.1, 0.25, 1)";

function bezier(t: number, p1: number, p2: number): number {
  const omt = 1 - t;
  return 3 * omt * omt * t * p1 + 3 * omt * t * t * p2 + t * t * t;
}

/** ease_cubic_bezier(): the curve's y for x = `p`, found by bisection like upstream. */
function cubicBezier(p: number, x1: number, y1: number, x2: number, y2: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let min = 0;
  let max = 1;
  for (let i = 0; i < 30; i++) {
    const guess = (min + max) / 2;
    if (p < bezier(guess, x1, x2)) max = guess;
    else min = guess;
  }
  return bezier((min + max) / 2, y1, y2);
}

/** ADW_EASE: cubic bezier (0.25, 0.1), (0.25, 1.0), like CSS `ease`. */
export function adwEase(t: number): number {
  return cubicBezier(t, 0.25, 0.1, 0.25, 1);
}

/** ADW_EASE_OUT_CUBIC. */
export function easeOutCubic(t: number): number {
  return (t - 1) ** 3 + 1;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
