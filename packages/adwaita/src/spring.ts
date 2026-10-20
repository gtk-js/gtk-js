/**
 * Spring physics matching AdwSpringAnimation / AdwSpringParams.
 *
 * A port of upstream's analytic damped-harmonic-oscillator solution
 * (`oscillate()`), duration estimate (`calculate_duration()`) and clamped
 * first-zero search (`get_first_zero()`), so curves and durations match
 * native libadwaita animations.
 *
 * @see upstream/libadwaita/src/adw-spring-animation.c
 * @see upstream/libadwaita/src/adw-spring-params.c
 */

export interface SpringParams {
  /** Damping ratio: 1 = critically damped, < 1 underdamped (bouncy), > 1 overdamped. */
  dampingRatio: number;
  mass: number;
  stiffness: number;
}

/** AdwNavigationView's transition spring: `adw_spring_params_new (1, 1, 1000)`. */
export const NAVIGATION_SPRING: SpringParams = { dampingRatio: 1, mass: 1, stiffness: 1000 };

/** AdwFloatingSheet's open/close spring: `adw_spring_params_new (0.62, 1, 500)`, epsilon 0.01. */
export const DIALOG_SPRING: SpringParams = { dampingRatio: 0.62, mass: 1, stiffness: 500 };
export const DIALOG_SPRING_EPSILON = 0.01;

/** AdwBottomSheet's open/close spring: `adw_spring_params_new (0.8, 1, 400)`, epsilon 0.0001. */
export const BOTTOM_SHEET_SPRING: SpringParams = { dampingRatio: 0.8, mass: 1, stiffness: 400 };
export const BOTTOM_SHEET_SPRING_EPSILON = 0.0001;

const DEFAULT_EPSILON = 0.001;
const DELTA = 0.001;
const MAX_ITERATIONS = 20000;
const FLT_EPSILON = 1.1920929e-7;

/** `adw_spring_params_new()`: damping = ratio × critical damping (2√(m·k)). */
export function springDamping(params: SpringParams): number {
  return params.dampingRatio * 2 * Math.sqrt(params.mass * params.stiffness);
}

interface Spring {
  params: SpringParams;
  from: number;
  to: number;
  velocity: number;
  epsilon: number;
}

/** Port of `oscillate()`: position at `t` seconds. */
function oscillate(s: Spring, t: number): number {
  const b = springDamping(s.params);
  const m = s.params.mass;
  const k = s.params.stiffness;
  const v0 = s.velocity;
  const beta = b / (2 * m);
  const omega0 = Math.sqrt(k / m);
  const x0 = s.from - s.to;
  const envelope = Math.exp(-beta * t);

  // Critically damped
  if (Math.abs(beta - omega0) <= FLT_EPSILON * Math.max(1, Math.abs(beta), Math.abs(omega0))) {
    return s.to + envelope * (x0 + (beta * x0 + v0) * t);
  }
  // Underdamped
  if (beta < omega0) {
    const omega1 = Math.sqrt(omega0 * omega0 - beta * beta);
    return (
      s.to +
      envelope * (x0 * Math.cos(omega1 * t) + ((beta * x0 + v0) / omega1) * Math.sin(omega1 * t))
    );
  }
  // Overdamped
  const omega2 = Math.sqrt(beta * beta - omega0 * omega0);
  return (
    s.to +
    envelope * (x0 * Math.cosh(omega2 * t) + ((beta * x0 + v0) / omega2) * Math.sinh(omega2 * t))
  );
}

/** Port of `get_first_zero()`: first time (s) the spring reaches its target. */
function firstZero(s: Spring): number {
  let i = 1;
  let y = oscillate(s, i / 1000);
  while (
    (s.to - s.from > Number.EPSILON && s.to - y > s.epsilon) ||
    (s.from - s.to > Number.EPSILON && y - s.to > s.epsilon)
  ) {
    if (i > MAX_ITERATIONS) return 0;
    i += 1;
    y = oscillate(s, i / 1000);
  }
  return i / 1000;
}

/** Port of `calculate_duration()`, in seconds (Infinity for undamped springs). */
function calculateDuration(s: Spring, clamp: boolean): number {
  const damping = springDamping(s.params);
  const { mass, stiffness } = s.params;
  const beta = damping / (2 * mass);

  if (beta <= Number.EPSILON) return Number.POSITIVE_INFINITY;

  if (clamp) {
    if (Math.abs(s.to - s.from) <= Number.EPSILON) return 0;
    return firstZero(s);
  }

  const omega0 = Math.sqrt(stiffness / mass);
  // Envelope estimate; exact enough for critically damped and oscillating springs.
  let x0 = -Math.log(s.epsilon) / beta;
  if (Math.abs(beta - omega0) <= FLT_EPSILON * Math.max(1, beta, omega0) || beta < omega0) {
    return x0;
  }

  // Overdamped: refine with Newton's method on the oscillation itself.
  let y0 = oscillate(s, x0);
  let m = (oscillate(s, x0 + DELTA) - y0) / DELTA;
  let x1 = (s.to - y0 + m * x0) / m;
  let y1 = oscillate(s, x1);
  let i = 0;
  while (Math.abs(s.to - y1) > s.epsilon) {
    if (i > 1000) return 0;
    x0 = x1;
    y0 = y1;
    m = (oscillate(s, x0 + DELTA) - y0) / DELTA;
    x1 = (s.to - y0 + m * x0) / m;
    y1 = oscillate(s, x1);
    i++;
  }
  return x1;
}

/** Position at time `t` (seconds) of a spring moving from `from` to `to`. */
export function springValue(
  params: SpringParams,
  from: number,
  to: number,
  initialVelocity: number,
  t: number,
): number {
  return oscillate({ params, from, to, velocity: initialVelocity, epsilon: DEFAULT_EPSILON }, t);
}

/** Estimated duration (seconds) of a spring animation, like AdwSpringAnimation:estimated-duration. */
export function springDuration(
  params: SpringParams,
  from: number,
  to: number,
  initialVelocity: number,
  clamp = false,
  epsilon = DEFAULT_EPSILON,
): number {
  if (from === to) return 0;
  return calculateDuration({ params, from, to, velocity: initialVelocity, epsilon }, clamp);
}

let slowdown = 1;

/**
 * Slow all animations down by `factor`, like GTK Inspector's "Slowdown"
 * setting. Useful for inspecting and stress-testing transitions.
 */
export function setAnimationSlowdown(factor: number): void {
  slowdown = factor > 0 ? factor : 1;
}

/** The factor set by {@link setAnimationSlowdown}. */
export function animationSlowdown(): number {
  return slowdown;
}

/** Whether the user asked for reduced motion (GTK's `gtk-enable-animations`). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface SpringAnimationHandle {
  /** Jump to the end and fire `onDone`. */
  skip(): void;
  /** Stop without firing `onDone`. */
  cancel(): void;
}

/**
 * Run a spring animation on requestAnimationFrame, calling `onValue` every
 * frame and `onDone` once settled.
 */
export function animateSpring(options: {
  params: SpringParams;
  from: number;
  to: number;
  initialVelocity?: number;
  clamp?: boolean;
  epsilon?: number;
  onValue: (value: number) => void;
  onDone: () => void;
}): SpringAnimationHandle {
  const {
    params,
    from,
    to,
    initialVelocity = 0,
    clamp = false,
    epsilon,
    onValue,
    onDone,
  } = options;
  const duration = prefersReducedMotion()
    ? 0
    : springDuration(params, from, to, initialVelocity, clamp, epsilon);
  let frame: number | null = null;
  let finished = false;
  let start: number | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    onValue(to);
    onDone();
  };

  const tick = (now: number) => {
    if (finished) return;
    if (start === null) start = now;
    const t = (now - start) / 1000 / slowdown;
    if (t >= duration) {
      finish();
      return;
    }
    let value = springValue(params, from, to, initialVelocity, t);
    if (clamp) value = from < to ? Math.min(value, to) : Math.max(value, to);
    onValue(value);
    frame = requestAnimationFrame(tick);
  };

  if (!Number.isFinite(duration) || duration <= 0) {
    // Defer so callers can finish their own state updates first.
    queueMicrotask(finish);
  } else {
    onValue(from);
    frame = requestAnimationFrame(tick);
  }

  return {
    skip: finish,
    cancel: () => {
      finished = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
