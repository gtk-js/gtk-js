import { describe, expect, test } from "vite-plus/test";
import { weighGtkNodeClasses } from "./specificity.ts";

describe("weighGtkNodeClasses", () => {
  test("weighs node classes like type selectors, in selectors only", () => {
    const out = weighGtkNodeClasses(
      "/* .gtk-label { */ .gtk-scale > .gtk-trough, .x .gtk-label { min-height: 4px; background: var(--gtk-spacing); }",
    );
    expect(out).toContain(":where(.gtk-scale):not(_) > :where(.gtk-trough):not(_)");
    expect(out).toContain(".x :where(.gtk-label):not(_)");
    expect(out).toContain("var(--gtk-spacing)");
    expect(out).not.toContain("/*");
  });

  test("keeps layout manager classes and at-rules as they are", () => {
    const css =
      "@property --gtk-spacing { syntax: '<length>'; inherits: false; initial-value: 0px; }\n" +
      ".gtk-box-layout.horizontal > .gtk-center-layout-start { flex: 1; }";
    expect(weighGtkNodeClasses(css)).toBe(css);
  });
});
