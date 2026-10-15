// Unit tests — no Playwright/cargo preload needed.
import { describe, expect, test } from "bun:test";
import { clampChildSize } from "./clamp.tsx";

// Expected values follow child_size_from_clamp() in adw-clamp-layout.c:
// lower = 400, max = 600, upper = lower + 3 · (max − lower) = 1000.
describe("clampChildSize", () => {
  test("gives the child everything up to the tightening threshold", () => {
    expect(clampChildSize(320)).toEqual({ size: 320, sizeClass: "small" });
    expect(clampChildSize(400)).toEqual({ size: 400, sizeClass: "small" });
  });

  test("eases out towards the maximum size", () => {
    // progress 0.25: 400 + 200 · (1 − 0.75³) = 515.625
    expect(clampChildSize(550)).toEqual({ size: 515, sizeClass: "medium" });
    // progress 0.75: 400 + 200 · (1 − 0.25³) = 596.875
    expect(clampChildSize(850)).toEqual({ size: 596, sizeClass: "medium" });
  });

  test("reaches the maximum size at 3× the remaining distance", () => {
    expect(clampChildSize(1000)).toEqual({ size: 600, sizeClass: "large" });
    expect(clampChildSize(1600)).toEqual({ size: 600, sizeClass: "large" });
  });

  test("honours custom sizes", () => {
    // lower 300, max 360, upper 480; progress 0.5: 300 + 60 · 0.875 = 352.5
    expect(clampChildSize(390, 360, 300)).toEqual({ size: 352, sizeClass: "medium" });
    // A threshold above the maximum size is capped by it.
    expect(clampChildSize(500, 360, 400)).toEqual({ size: 360, sizeClass: "large" });
  });
});
