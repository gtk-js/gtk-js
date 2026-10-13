import { describe, expect, test } from "bun:test";
import { gtkToWeb } from "./transform.ts";

async function transform(css: string) {
  const result = await gtkToWeb.process(css, { from: undefined });
  return result.css;
}

describe("border-spacing", () => {
  test("one value → both spacing properties", async () => {
    const out = await transform("box { border-spacing: 6px; }");
    expect(out).toContain("--gtk-border-spacing-x: 6px");
    expect(out).toContain("--gtk-border-spacing-y: 6px");
    expect(out).not.toContain("border-spacing:");
  });

  test("two values → horizontal then vertical", async () => {
    const out = await transform("grid { border-spacing: 4px 12px; }");
    expect(out).toContain("--gtk-border-spacing-x: 4px");
    expect(out).toContain("--gtk-border-spacing-y: 12px");
  });
});
