import { describe, expect, test } from "vite-plus/test";
import { adwEase, easeOutCubic, lerp } from "./easing.ts";

describe("adwEase", () => {
  test("follows CSS ease, which ADW_EASE is", () => {
    // Reference values of cubic-bezier(0.25, 0.1, 0.25, 1).
    expect(adwEase(0)).toBe(0);
    expect(adwEase(1)).toBe(1);
    expect(adwEase(0.25)).toBeCloseTo(0.4085, 3);
    expect(adwEase(0.5)).toBeCloseTo(0.8024, 3);
    expect(adwEase(0.75)).toBeCloseTo(0.9604, 3);
  });

  test("is monotonic", () => {
    let last = 0;
    for (let i = 1; i <= 100; i++) {
      const value = adwEase(i / 100);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
  });
});

test("easeOutCubic", () => {
  expect(easeOutCubic(0)).toBe(0);
  expect(easeOutCubic(0.5)).toBe(0.875);
  expect(easeOutCubic(1)).toBe(1);
});

test("lerp", () => {
  expect(lerp(0.95, 1, 0)).toBe(0.95);
  expect(lerp(0.95, 1, 1)).toBe(1);
});
