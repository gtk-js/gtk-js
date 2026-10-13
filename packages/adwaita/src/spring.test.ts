import { describe, expect, test } from "bun:test";
import {
  DIALOG_SPRING,
  DIALOG_SPRING_EPSILON,
  NAVIGATION_SPRING,
  springDamping,
  springDuration,
  springValue,
} from "./spring.ts";

describe("spring", () => {
  test("damping is derived from the damping ratio like adw_spring_params_new()", () => {
    // critical damping = 2 * sqrt(mass * stiffness)
    expect(springDamping(NAVIGATION_SPRING)).toBeCloseTo(2 * Math.sqrt(1000), 6);
    expect(springDamping(DIALOG_SPRING)).toBeCloseTo(0.62 * 2 * Math.sqrt(500), 6);
  });

  test("the navigation spring is critically damped: monotonic, no overshoot", () => {
    let previous = 0;
    for (let t = 0; t <= 0.4; t += 0.005) {
      const v = springValue(NAVIGATION_SPRING, 0, 1, 0, t);
      expect(v).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
      previous = v;
    }
  });

  test("navigation transitions settle in about a quarter second", () => {
    const d = springDuration(NAVIGATION_SPRING, 0, 1, 0);
    expect(d).toBeGreaterThan(0.15);
    expect(d).toBeLessThan(0.35);
  });

  test("the dialog spring overshoots slightly, then settles", () => {
    let max = 0;
    for (let t = 0; t <= 1; t += 0.002) max = Math.max(max, springValue(DIALOG_SPRING, 0, 1, 0, t));
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThan(1.1);
    const d = springDuration(DIALOG_SPRING, 0, 1, 0, false, DIALOG_SPRING_EPSILON);
    expect(d).toBeGreaterThan(0.1);
    expect(d).toBeLessThan(0.5);
  });

  test("clamped springs stop the first time they reach the target", () => {
    const d = springDuration(DIALOG_SPRING, 1, 0, 0, true, DIALOG_SPRING_EPSILON);
    expect(springValue(DIALOG_SPRING, 1, 0, 0, d)).toBeLessThanOrEqual(DIALOG_SPRING_EPSILON);
    expect(d).toBeLessThan(springDuration(DIALOG_SPRING, 1, 0, 0, false, DIALOG_SPRING_EPSILON));
  });
});
