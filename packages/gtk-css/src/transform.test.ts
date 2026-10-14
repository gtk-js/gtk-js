import { describe, expect, test } from "bun:test";
import { gtkToWeb } from "./transform.ts";

async function transform(css: string) {
  const result = await gtkToWeb.process(css, { from: undefined });
  return result.css;
}

describe("remapSelectors", () => {
  test("label links: link → .gtk-link, not the link class of button.link", async () => {
    const out = await transform("link, button.link { color: blue; } link:hover { color: red; }");
    expect(out).toContain(":where(.gtk-link):not(_),");
    expect(out).toContain(":where(.gtk-button):not(_).link");
    expect(out).toContain(":where(.gtk-link):not(_):hover");
  });

  test("node names keep the specificity of type selectors", async () => {
    const out = await transform(
      "list.boxed-list > row { outline-color: transparent; } row.entry.focused { outline-color: blue; } window:not(.solid-csd) row { color: red; }",
    );
    // GTK: (0,1,2) < (0,2,1), so the focus ring wins although it comes first.
    expect(out).toContain(":where(.gtk-list):not(_).boxed-list > :where(.gtk-row):not(_)");
    expect(out).toContain(":where(.gtk-row):not(_).entry.focused");
    expect(out).toContain(":where(.gtk-window):not(_):not(.solid-csd) :where(.gtk-row):not(_)");
  });
});

describe("remapPseudoClasses", () => {
  test(":checked → [data-checked]", async () => {
    const out = await transform(".gtk-button:checked { color: red; }");
    expect(out).toContain(".gtk-button[data-checked]");
    expect(out).not.toContain(":checked");
  });

  test(":visited → [data-visited]", async () => {
    const out = await transform(".gtk-button.link:visited { color: blue; }");
    expect(out).toContain(".gtk-button.link[data-visited]");
    expect(out).not.toContain(":visited");
  });

  test(":backdrop → [data-backdrop]", async () => {
    const out = await transform(".gtk-window:backdrop { opacity: 0.5; }");
    expect(out).toContain(".gtk-window[data-backdrop]");
    expect(out).not.toContain(":backdrop");
  });

  test(":drop(active) → [data-drop-active]", async () => {
    const out = await transform(".gtk-row:drop(active) { background: blue; }");
    expect(out).toContain(".gtk-row[data-drop-active]");
    expect(out).not.toContain(":drop(active)");
  });

  test(":selected → [aria-selected]", async () => {
    const out = await transform(".gtk-row:selected { background: blue; }");
    expect(out).toContain('[aria-selected="true"]');
    expect(out).not.toContain(":selected");
  });
});

describe("convertGtkColorFunctions", () => {
  describe("alpha()", () => {
    test("hex color → rgba()", async () => {
      const out = await transform(".x { color: alpha(#242424, 0.25); }");
      expect(out).toContain("rgba(36, 36, 36, 0.25)");
      expect(out).not.toContain("alpha(");
    });

    test("3-digit hex → rgba()", async () => {
      const out = await transform(".x { color: alpha(#fff, 0.5); }");
      expect(out).toContain("rgba(255, 255, 255, 0.5)");
    });

    test("named color black → rgba()", async () => {
      const out = await transform(".x { color: alpha(black, 0.8); }");
      expect(out).toContain("rgba(0, 0, 0, 0.8)");
    });

    test("named color white → rgba()", async () => {
      const out = await transform(".x { color: alpha(white, 0.5); }");
      expect(out).toContain("rgba(255, 255, 255, 0.5)");
    });

    test("currentColor → color-mix()", async () => {
      const out = await transform(".x { color: alpha(currentColor, 0.06); }");
      expect(out).toContain("color-mix(in oklab, currentColor 6%, transparent)");
      expect(out).not.toContain("alpha(");
    });

    test("single arg (identity) → passthrough", async () => {
      const out = await transform(".x { color: alpha(black); }");
      expect(out).toContain("color: black");
      expect(out).not.toContain("alpha(");
    });

    test("nested in linear-gradient()", async () => {
      const out = await transform(
        ".x { background-image: linear-gradient(alpha(#242424, 0.25), alpha(#242424, 0.35)); }",
      );
      expect(out).toContain("rgba(36, 36, 36, 0.25)");
      expect(out).toContain("rgba(36, 36, 36, 0.35)");
      expect(out).not.toContain("alpha(");
    });

    test("multiple in one declaration", async () => {
      const out = await transform(
        ".x { box-shadow: inset 0 0 0 1px alpha(currentColor, 0.04), inset 0 1px alpha(currentColor, 0.05); }",
      );
      expect(out).not.toContain("alpha(");
      expect(out).toContain(
        "color-mix(in oklab, var(--gtk-current-color, currentColor) 4%, transparent)",
      );
      expect(out).toContain(
        "color-mix(in oklab, var(--gtk-current-color, currentColor) 5%, transparent)",
      );
    });

    test("rgba() arg → color-mix()", async () => {
      const out = await transform(".x { color: alpha(rgba(0, 0, 0, 0.08), 0.75); }");
      expect(out).toContain("color-mix(in oklab, rgba(0, 0, 0, 0.08) 75%, transparent)");
      expect(out).not.toContain("alpha(");
    });

    test("does not match inside another function name", async () => {
      // "get-alpha(" should not be matched
      const out = await transform(".x { color: get-alpha(test); }");
      expect(out).toContain("get-alpha(test)");
    });

    test("unexpected arg count throws", async () => {
      expect(transform(".x { color: alpha(a, b, c); }")).rejects.toThrow();
    });
  });

  describe("mix()", () => {
    test("two hex colors → color-mix()", async () => {
      const out = await transform(".x { color: mix(#FFFFFF, #0860F2, 0.75); }");
      expect(out).toContain("color-mix(in oklab, #0860F2 75%, #FFFFFF)");
      expect(out).not.toMatch(/(?<!color-)mix\(/);
    });

    test("hex + rgba → color-mix()", async () => {
      const out = await transform(
        ".x { background-color: mix(#FFFFFF, rgba(0, 0, 0, 0.87), 0.15); }",
      );
      expect(out).toContain("color-mix(in oklab, rgba(0, 0, 0, 0.87) 15%, #FFFFFF)");
      expect(out).not.toMatch(/(?<!color-)mix\(/);
    });

    test("unexpected arg count throws", async () => {
      expect(transform(".x { color: mix(a, b); }")).rejects.toThrow();
    });
  });

  describe("shade()", () => {
    test("lighten hex → pre-computed rgb()", async () => {
      const out = await transform(".x { color: shade(#5e5c64, 1.2); }");
      // 94*1.2=113, 92*1.2=110, 100*1.2=120
      expect(out).toContain("rgb(113, 110, 120)");
      expect(out).not.toContain("shade(");
    });

    test("darken hex → pre-computed rgb()", async () => {
      const out = await transform(".x { color: shade(#27a66c, 0.95); }");
      // 39*0.95=37, 166*0.95=158, 108*0.95=103
      expect(out).toContain("rgb(37, 158, 103)");
      expect(out).not.toContain("shade(");
    });

    test("clamps to 255", async () => {
      const out = await transform(".x { color: shade(#f9e2a7, 1.07); }");
      // 249*1.07=255(clamped), 226*1.07=242, 167*1.07=179
      expect(out).toContain("rgb(255, 242, 179)");
    });

    test("dynamic color lighten → color-mix with white", async () => {
      const out = await transform(".x { color: shade(var(--c), 1.2); }");
      expect(out).toContain("color-mix(in oklab, var(--c), white");
      expect(out).not.toContain("shade(");
    });

    test("dynamic color darken → color-mix with black", async () => {
      const out = await transform(".x { color: shade(var(--c), 0.8); }");
      expect(out).toContain("color-mix(in oklab, var(--c), black");
      expect(out).not.toContain("shade(");
    });

    test("unexpected arg count throws", async () => {
      expect(transform(".x { color: shade(a); }")).rejects.toThrow();
    });

    test("non-numeric factor throws", async () => {
      expect(transform(".x { color: shade(#fff, abc); }")).rejects.toThrow();
    });
  });
});

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

describe("initial fonts", () => {
  test("font: initial → the GTK default font", async () => {
    const out = await transform("popover.background { font: initial; }");
    expect(out).toContain("font-family: var(--gtk-font-family, Cantarell, sans-serif)");
    expect(out).toContain("font-size: var(--gtk-font-size, 11pt)");
    expect(out).toContain("font-weight: normal");
    expect(out).toContain("font-variant-caps: normal");
    // Not part of GTK's font shorthand: an inherited line height is kept.
    expect(out).not.toContain("line-height");
    expect(out).not.toContain("font: initial");
  });
});

describe(":disabled", () => {
  test("matches native :disabled elements and [data-disabled] ones", async () => {
    const out = await transform(
      "button:disabled { opacity: 0.5; } button:not(:disabled):hover { color: red; }",
    );
    expect(out).toContain(":where(.gtk-button):not(_):is([data-disabled], :disabled)");
    expect(out).toContain(":where(.gtk-button):not(_):not(:is([data-disabled], :disabled)):hover");
    // Applied once, even though PostCSS revisits changed rules.
    expect(out).not.toContain(":is([data-disabled], :is(");
  });
});

describe("currentColor", () => {
  test("other properties read the color through --gtk-current-color", async () => {
    const out = await transform(
      "switch { background-color: alpha(currentColor, 0.15); transition: background 200ms; } switch:checked { color: var(--accent-fg-color); background-color: var(--accent-bg-color); }",
    );
    expect(out).toContain(
      "background-color: color-mix(in oklab, var(--gtk-current-color, currentColor) 15%, transparent)",
    );
    expect(out).toMatch(
      /color: var\(--accent-fg-color\);\s*--gtk-current-color: var\(--accent-fg-color\)/,
    );
    // Applied once, even though PostCSS revisits changed declarations.
    expect(out.match(/--gtk-current-color/g)).toHaveLength(2);
  });

  test("a color that depends on currentColor leaves the property to fall back", async () => {
    const out = await transform(
      ".dim { color: alpha(currentColor, 0.55); } .plain { color: inherit !important; }",
    );
    expect(out).toContain("color: color-mix(in oklab, currentColor 55%, transparent)");
    expect(out).toContain("--gtk-current-color: initial");
    expect(out).toContain("--gtk-current-color: inherit !important");
  });
});

describe("background-image overlays", () => {
  test("image(color) overlays fade with the background transition", async () => {
    const out = await transform(
      "button { transition: background 200ms ease-out, box-shadow 200ms ease-out; } button:hover { background-image: image(alpha(currentColor, 0.1)); } button.two { background-image: image(red), image(blue); }",
    );
    expect(out).toContain(
      "--gtk-background-overlay: color-mix(in oklab, var(--gtk-current-color, currentColor) 10%, transparent)",
    );
    expect(out).toContain(
      "background-image: linear-gradient(var(--gtk-background-overlay), var(--gtk-background-overlay))",
    );
    expect(out).toContain(
      "transition: background 200ms ease-out, box-shadow 200ms ease-out, --gtk-background-overlay 200ms ease-out",
    );
    expect(out).toMatch(/^@property --gtk-background-overlay \{/);
    // Kept, transparent, outside the hover state so the overlay fades out too.
    expect(out).toContain(":where(:where(.gtk-button):not(_)) {");
    // Layered images stay images.
    expect(out).toContain(
      "background-image: linear-gradient(red, red), linear-gradient(blue, blue)",
    );
  });
});
