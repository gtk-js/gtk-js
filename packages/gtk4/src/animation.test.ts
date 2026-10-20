import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { EASE_OUT_CUBIC, easeOutCubic } from "./animation.ts";

describe("ease-out cubic", () => {
  test("is ease_out_cubic(): 1 - (1 - t)³", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(1)).toBe(1);
  });

  test("the CSS curve draws easeOutCubic()", () => {
    const [x1, y1, x2, y2] = /cubic-bezier\(([^)]*)\)/
      .exec(EASE_OUT_CUBIC)![1]!
      .split(",")
      .map(Number);
    const bezier = (s: number, p1: number, p2: number) =>
      3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s ** 2 * p2 + s ** 3;
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      expect(bezier(s, y1!, y2!)).toBeCloseTo(easeOutCubic(bezier(s, x1!, x2!)), 6);
    }
  });

  test("stylesheets get the same curve", () => {
    const resetCSS = readFileSync(new URL("./reset.css", import.meta.url), "utf8");
    expect(resetCSS).toContain(`--gtk-ease-out-cubic: ${EASE_OUT_CUBIC};`);
  });
});
