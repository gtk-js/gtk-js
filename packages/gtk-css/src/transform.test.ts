import { describe, expect, test } from "vite-plus/test";
import { buildGtkToWeb, gtkToWeb, preprocess } from "./transform.ts";

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

  test("AdwIndicatorBin's mask node is a class, not the SVG element", async () => {
    const out = await transform(
      "indicatorbin > indicator, indicatorbin > mask { min-width: 6px; }",
    );
    expect(out).toContain(":where(.gtk-indicatorbin):not(_) > :where(.gtk-mask):not(_)");
  });

  test("libadwaita's carousel and indicator node names", async () => {
    const out = await transform(
      "carousel.card { border: none; } carouselindicatordots, carouselindicatorlines { color: red; }",
    );
    expect(out).toContain(":where(.gtk-carousel):not(_).card");
    expect(out).toContain(":where(.gtk-carouselindicatordots):not(_),");
    expect(out).toContain(":where(.gtk-carouselindicatorlines):not(_)");
  });
});

describe("remapStyleClasses", () => {
  test("GTK's .hidden is .gtk-hidden, apart from Tailwind's `hidden` utility", async () => {
    const out = await transform(
      "toggle-group > separator.hidden { opacity: 0; } tab.hidden-tab, .hiddenx { color: red; }",
    );
    expect(out).toContain(":where(.gtk-separator):not(_).gtk-hidden {");
    expect(out).not.toMatch(/(?<![\w-])\.hidden(?![\w-])/);
    // Only the class itself: other names that start with it stay.
    expect(out).toContain(".hidden-tab, .hiddenx");
  });
});

describe("text selection", () => {
  test("the selection node is ::selection, its state on the text", async () => {
    const out = await transform(
      "selection { background-color: gray; } selection:focus-within { background-color: blue; } label > selection:disabled { background-color: red; }",
    );
    expect(out).toContain("::selection {");
    expect(out).toContain(":focus-within::selection {");
    expect(out).toContain(
      ":where(.gtk-label):not(_):is([data-disabled], :disabled, [data-disabled] *, :disabled *)::selection {",
    );
    expect(out).not.toContain("gtk-selection");
  });

  test("a descendant selection is the text's or a descendant's", async () => {
    const out = await transform("entry selection:focus { color: white; }");
    expect(out).toContain(
      ":where(.gtk-entry):not(_):is([data-focus], :focus)::selection, :where(.gtk-entry):not(_) *:is([data-focus], :focus)::selection {",
    );
  });

  test("a transparent color keeps the text's, which browsers draw over the selection", async () => {
    const out = await transform("selection { background-color: gray; color: transparent; }");
    expect(out).toMatch(/::selection \{\s*background-color: gray;\s*\}/);
  });

  test("other selectors in the rule keep their declarations", async () => {
    const out = await transform("text > selection, row:selected { color: transparent; }");
    expect(out).toContain(':where(.gtk-row):not(_):is([aria-selected="true"], [data-selected]) {');
    expect(out).toContain("color: transparent");
    expect(out).toMatch(/:where\(\.gtk-text\):not\(_\)::selection \{\s*\}/);
  });
});

describe("text placeholder", () => {
  test("the placeholder node is the text's ::placeholder, apart from the rest of its rule", async () => {
    const out = await transform(".dimmed, entry > text > placeholder { opacity: 0.55; }");
    expect(out).toMatch(/\.dimmed \{\s*opacity: 0\.55;\s*\}/);
    expect(out).toMatch(
      /:where\(\.gtk-entry\):not\(_\) > :where\(\.gtk-text\):not\(_\)::placeholder \{\s*opacity: 0\.55;\s*\}/,
    );
    expect(out).not.toContain("gtk-placeholder");
  });
});

describe("remapPseudoClasses", () => {
  test(":checked → [data-checked]", async () => {
    const out = await transform(".gtk-button:checked { color: red; }");
    expect(out).toContain(".gtk-button[data-checked]");
    expect(out).not.toContain(":checked");
  });

  test(":active → also [data-active], once", async () => {
    const out = await transform(
      "splitbutton.flat:active { color: red; } button:not(:active):hover { color: blue; }",
    );
    // Both after #113's sensitivity guard.
    const sensitive = ":where(:not([data-disabled], :disabled, [data-disabled] *, :disabled *))";
    expect(out).toContain(
      `:where(.gtk-splitbutton):not(_).flat:is(:active, [data-active])${sensitive}`,
    );
    expect(out).toContain(
      `:not(:is(:active, [data-active])${sensitive}, [data-pressed]):hover${sensitive}`,
    );
    expect(out).not.toContain(":is(:is(");
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

  test(":active → :active or [data-pressed], with the same specificity", async () => {
    const out = await transform(
      "button:active, label { color: red; } button:not(:active):hover > image { color: blue; } row:drop(active) { color: green; }",
    );
    // #78 also matches :active as [data-active].
    expect(out).toContain(":where(.gtk-button):not(_):is(:active, [data-active])");
    expect(out).toContain(":where(.gtk-button):not(_)[data-pressed], :where(.gtk-label):not(_) {");
    expect(out).toMatch(
      /:where\(.gtk-button\):not\(_\):not\(:is\(:active.*?, \[data-pressed\]\):hover/,
    );
    expect(out).toContain(":where(.gtk-row):not(_)[data-drop-active]");
    // Applied once, even though PostCSS revisits changed rules.
    expect(out.match(/\[data-pressed\]/g)).toHaveLength(2);
  });

  test(":selected → [aria-selected] or [data-selected]", async () => {
    const out = await transform(".gtk-row:selected { background: blue; }");
    expect(out).toContain(':is([aria-selected="true"], [data-selected])');
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
      expect(out).toContain("color-mix(in srgb, currentColor 6%, transparent)");
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
      expect(out).toContain("color-mix(in srgb, currentColor 4%, transparent)");
      expect(out).toContain("color-mix(in srgb, currentColor 5%, transparent)");
    });

    test("rgba() arg → color-mix()", async () => {
      const out = await transform(".x { color: alpha(rgba(0, 0, 0, 0.08), 0.75); }");
      expect(out).toContain("color-mix(in srgb, rgba(0, 0, 0, 0.08) 75%, transparent)");
      expect(out).not.toContain("alpha(");
    });

    test("does not match inside another function name", async () => {
      // "get-alpha(" should not be matched
      const out = await transform(".x { color: get-alpha(test); }");
      expect(out).toContain("get-alpha(test)");
    });

    test("unexpected arg count throws", async () => {
      await expect(transform(".x { color: alpha(a, b, c); }")).rejects.toThrow();
    });
  });

  describe("mix()", () => {
    test("two hex colors → color-mix()", async () => {
      const out = await transform(".x { color: mix(#FFFFFF, #0860F2, 0.75); }");
      expect(out).toContain("color-mix(in srgb, #0860F2 75%, #FFFFFF)");
      expect(out).not.toMatch(/(?<!color-)mix\(/);
    });

    test("hex + rgba → color-mix()", async () => {
      const out = await transform(
        ".x { background-color: mix(#FFFFFF, rgba(0, 0, 0, 0.87), 0.15); }",
      );
      expect(out).toContain("color-mix(in srgb, rgba(0, 0, 0, 0.87) 15%, #FFFFFF)");
      expect(out).not.toMatch(/(?<!color-)mix\(/);
    });

    test("unexpected arg count throws", async () => {
      await expect(transform(".x { color: mix(a, b); }")).rejects.toThrow();
    });
  });

  test("color-mix() stays in sRGB, like GTK's interpolation", async () => {
    // _buttons.scss: .osd:hover and %opaque_button mix two opaque colors.
    const out = await transform(
      ".x { background-color: color-mix(in srgb, black 55.25%, currentColor 9.75%); } .y { background-image: image(color-mix(in srgb, white 15%, black)); color: mix(black, white, 0.5); }",
    );
    expect(out).toContain("color-mix(in srgb, black 55.25%, currentColor 9.75%)");
    expect(out).toContain("--gtk-background-overlay: color-mix(in srgb, white 15%, black)");
    expect(out).toContain("color: color-mix(in srgb, white 50%, black)");
    expect(out).not.toContain("oklab");
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
      expect(out).toContain("color-mix(in srgb, var(--c), white");
      expect(out).not.toContain("shade(");
    });

    test("dynamic color darken → color-mix with black", async () => {
      const out = await transform(".x { color: shade(var(--c), 0.8); }");
      expect(out).toContain("color-mix(in srgb, var(--c), black");
      expect(out).not.toContain("shade(");
    });

    test("unexpected arg count throws", async () => {
      await expect(transform(".x { color: shade(a); }")).rejects.toThrow();
    });

    test("non-numeric factor throws", async () => {
      await expect(transform(".x { color: shade(#fff, abc); }")).rejects.toThrow();
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

describe("border shorthands", () => {
  test("no width → GTK's initial width 0, not medium", async () => {
    const out = await transform(
      "a { border: none; } b { border-bottom: none; } c { border: hidden; } d { border-top: solid red; }",
    );
    expect(out).toContain("border: 0 none;");
    expect(out).toContain("border-bottom: 0 none;");
    expect(out).toContain("border: 0 hidden;");
    expect(out).toContain("border-top: 0 solid red;");
  });

  test("a width, var() or a CSS-wide keyword stays as written", async () => {
    const out = await transform(
      "a { border: 1px solid alpha(black, 0.1); } b { border-left: 0 none; } c { border: var(--b); } d { border-right: inherit; }",
    );
    expect(out).toContain("border: 1px solid");
    expect(out).toContain("border-left: 0 none;");
    expect(out).toContain("border: var(--b);");
    expect(out).toContain("border-right: inherit;");
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

describe("check and radio indicators", () => {
  test("a recolored -gtk-icon-source is kept for layout.css to paint", async () => {
    const out = await transform(
      'check:checked { -gtk-icon-source: -gtk-recolor(url("assets/check-symbolic.svg")); } check { -gtk-icon-source: none; }',
    );
    expect(out).toContain('--gtk-icon-source: url("assets/check-symbolic.svg")');
    expect(out).toContain("--gtk-icon-source: none");
    expect(out).not.toContain("-gtk-recolor");
  });

  test("a -gtk-scaled() of recolored images is kept, for compile.ts to embed", async () => {
    const css =
      'check:checked { -gtk-icon-source: -gtk-scaled(-gtk-recolor(url("a.svg")), -gtk-recolor(url("a@2.svg"))); }' +
      ' check:indeterminate { -gtk-icon-source: -gtk-scaled(url("b.png"), url("b@2.png")); }';
    // compile.ts's asset plugin replaces the default one, which drops -gtk-scaled().
    const keep = { postcssPlugin: "keep-assets" };
    const out = (await buildGtkToWeb(keep).process(css, { from: undefined })).css;
    expect(out).toContain('--gtk-icon-source: -gtk-scaled(url("a.svg"), url("a@2.svg"))');
    // Images that aren't recolored aren't symbolic icons.
    expect(out).not.toContain("b.png");
    expect(await transform(css)).not.toContain("icon-source");
  });

  test("icon theme icons are left to the components", async () => {
    const out = await transform(
      "expander { -gtk-icon-source: -gtk-icontheme('pan-end-symbolic'); } spinner { -gtk-icon-source: -gtk-icontheme('process-working-symbolic'); }",
    );
    expect(out).not.toContain("icon-source");
  });

  test("they're hovered and pressed with their check button", async () => {
    const out = await transform(
      "check:not(:checked):hover, radio:checked:active { color: red; } button:hover check { color: blue; }",
    );
    // Guarded by #113's sensitivity check; #78 also matches :active as [data-active].
    const s = ":where(:not([data-disabled], :disabled, [data-disabled] *, :disabled *))";
    expect(out).toContain(
      `:where(.gtk-check):not(_):not([data-checked]):is(:hover${s}, :where(.gtk-checkbutton:hover${s} > *))${s}`,
    );
    expect(out).toContain(
      `:where(.gtk-radio):not(_)[data-checked]:is(:is(:active${s}, :where(.gtk-checkbutton:is(:active, [data-active])${s} > *)), [data-active])${s}`,
    );
    // Only the indicator's own state is mirrored, once.
    expect(out).toContain(`:where(.gtk-button):not(_):hover${s} :where(.gtk-check):not(_) {`);
    expect(out).not.toContain(":is(:hover, :is(");
  });
});

describe("rem", () => {
  test("rem → multiples of the GTK default font size", async () => {
    const out = await transform("viewswitcher .narrow { font-size: 0.75rem; }");
    expect(out).toContain("font-size: calc(0.75 * var(--gtk-font-size, 11pt))");
    expect(out).not.toMatch(/\drem/);
  });

  test("every rem in a value, signs included", async () => {
    const out = await transform("box { margin: 1rem -.5rem calc(2px + 1.25rem) 0; }");
    expect(out).toContain(
      "margin: calc(1 * var(--gtk-font-size, 11pt)) calc(-.5 * var(--gtk-font-size, 11pt)) " +
        "calc(2px + calc(1.25 * var(--gtk-font-size, 11pt))) 0",
    );
  });

  test("other units and names containing rem are kept", async () => {
    const out = await transform("box { margin: 1em; transition: remove 1s; }");
    expect(out).toContain("margin: 1em");
    expect(out).toContain("transition: remove 1s");
  });
});

describe(":disabled", () => {
  test("matches native :disabled elements and [data-disabled] ones", async () => {
    const out = await transform(
      "button:disabled { opacity: 0.5; } button:not(:disabled):hover { color: red; }",
    );
    expect(out).toContain(
      ":where(.gtk-button):not(_):is([data-disabled], :disabled, [data-disabled] *, :disabled *) {",
    );
    expect(out).toContain(
      ":where(.gtk-button):not(_):not(:is([data-disabled], :disabled, [data-disabled] *, :disabled *)):hover:where(",
    );
    // Applied once, even though PostCSS revisits changed rules.
    expect(out.match(/\[data-disabled\], :disabled,/g)).toHaveLength(3);
  });

  test("descendants of an insensitive widget are insensitive", async () => {
    // gtk_widget_set_sensitive(FALSE) propagates to the subtree: a disabled
    // expander's label is label:disabled.
    const out = await transform("label:disabled { filter: opacity(0.5); }");
    expect(out).toContain(
      ":where(.gtk-label):not(_):is([data-disabled], :disabled, [data-disabled] *, :disabled *) {",
    );
  });

  test(":hover and :active never match insensitive widgets, with the same specificity", async () => {
    const out = await transform(
      "button:hover { color: red; } button:checked:active, modelbutton:hover > label { color: blue; }",
    );
    const sensitive = ":where(:not([data-disabled], :disabled, [data-disabled] *, :disabled *))";
    expect(out).toContain(`:where(.gtk-button):not(_):hover${sensitive} {`);
    expect(out).toContain(
      `:where(.gtk-button):not(_)[data-checked]:is(:active, [data-active])${sensitive},`,
    );
    expect(out).toContain(`:where(.gtk-modelbutton):not(_):hover${sensitive} > :where(.gtk-label)`);
  });
});

describe(":focus", () => {
  test("matches the focused element and [data-focus] ones, not :focus-visible or :focus-within", async () => {
    const out = await transform(
      "calendar > grid > label:focus { outline-width: 2px; } button:focus:focus-visible, row:focus-within { color: red; }",
    );
    expect(out).toContain(":where(.gtk-label):not(_):is([data-focus], :focus) {");
    expect(out).toContain(":where(.gtk-button):not(_):is([data-focus], :focus):focus-visible");
    expect(out).toContain(":where(.gtk-row):not(_):focus-within");
    // Applied once, even though PostCSS revisits changed rules.
    expect(out).not.toContain(":is([data-focus], :is(");
  });
});

describe("color scheme media queries", () => {
  // Like libadwaita's _colors.scss: dark @define-colors and plain custom
  // properties, each in its own @media (prefers-color-scheme: dark) block.
  const scss =
    "@define-color window_bg_color #fafafb;\n@media (prefers-color-scheme: dark) {\n  @define-color window_bg_color #222226;\n}\n:root {\n  --window-bg-color: @window_bg_color;\n  --active-toggle-bg-color: #ffffff;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --active-toggle-bg-color: rgb(255 255 255 / 20%);\n  }\n}\nwindow { background-color: @window_bg_color; }\n";

  async function compile(scheme?: "light" | "dark") {
    const result = await buildGtkToWeb(undefined, scheme).process(preprocess(scss, { scheme }), {
      from: undefined,
    });
    return result.css;
  }

  test("forced dark applies every dark block unconditionally, after the light values", async () => {
    const out = await compile("dark");
    expect(out).not.toContain("@media");
    expect(out).toMatch(
      /--active-toggle-bg-color: #ffffff;[^]*--active-toggle-bg-color: rgb\(255 255 255 \/ 20%\);/,
    );
    expect(out).toContain("--window-bg-color: #222226;");
  });

  test("forced light drops every dark block", async () => {
    const out = await compile("light");
    expect(out).not.toContain("@media");
    expect(out).not.toContain("rgb(255 255 255 / 20%)");
    expect(out).not.toContain("#222226");
  });

  test("auto keeps the dark blocks behind the media query", async () => {
    const out = await compile();
    expect(out).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\s*:root \{\s*--active-toggle-bg-color: rgb\(255 255 255 \/ 20%\);/,
    );
  });

  test("other color scheme queries throw instead of being misread", async () => {
    await expect(
      buildGtkToWeb(undefined, "dark").process(
        "@media (prefers-color-scheme: dark) and (min-width: 400px) { :root { --x: 1; } }",
        { from: undefined },
      ),
    ).rejects.toThrow("Unsupported color scheme media query");
  });
});

describe("named colors", () => {
  // Like libadwaita's _colors.scss: :root sets --window-bg-color from a named
  // color, but derives --accent-color in CSS from the accent AdwStyleManager
  // sets at runtime. @accent_color is a named color, not that custom property.
  const scss = [
    "@define-color accent_color oklab(from @accent_bg_color min(l, 0.5) a b);",
    "@define-color window_bg_color #fafafb;",
    "@media (prefers-color-scheme: dark) {",
    "  @define-color accent_color oklab(from @accent_bg_color max(l, 0.85) a b);",
    "  @define-color window_bg_color #222226;",
    "}",
    ":root {",
    "  --accent-bg-color: @accent_bg_color;",
    "  --accent-color: oklab(from var(--accent-bg-color) var(--standalone-color-oklab));",
    "  --window-bg-color: @window_bg_color;",
    "}",
  ].join("\n");

  test.each([
    ["forced dark", "dark"],
    ["auto", undefined],
  ] as const)("%s: properties set from named colors get their dark values, derived ones aren't baked", (_name, scheme) => {
    const out = preprocess(scss, { scheme });
    expect(out).toMatch(/--window-bg-color: #fafafb;[^]*--window-bg-color: #222226;/);
    expect(out.match(/--accent-color:.*/g)).toEqual([
      "--accent-color: oklab(from var(--accent-bg-color) var(--standalone-color-oklab));",
    ]);
    expect(out).not.toContain("data-color-scheme");
  });

  test("a theme's own accent replaces the default in both schemes", () => {
    // A theme with a fixed accent, built for dark (gtk-Dark.scss defines its
    // colors at the top level), keeps it in dark mode too.
    const fixed =
      "@define-color accent_bg_color #0860F2;\n:root {\n  --accent-bg-color: @accent_bg_color;\n}";
    for (const scheme of ["dark", "light", undefined] as const) {
      const out = preprocess(fixed, { scheme });
      expect(out).toContain("--accent-bg-color: #0860F2;");
      expect(out).not.toContain("#3584e4");
    }
  });

  test("a dark value outside :root throws instead of being applied to :root", () => {
    expect(() => preprocess(scss.replace(":root {", ".osd {"), { scheme: "dark" })).toThrow(
      "Dark value of --window-bg-color outside a top-level :root rule",
    );
  });
});

describe("currentColor", () => {
  test("other properties read the color through --gtk-current-color", async () => {
    const out = await transform(
      "switch { background-color: alpha(currentColor, 0.15); transition: background 200ms; } switch:checked { color: var(--accent-fg-color); background-color: var(--accent-bg-color); }",
    );
    expect(out).toContain(
      "background-color: color-mix(in srgb, var(--gtk-current-color, currentColor) 15%, transparent)",
    );
    expect(out).toMatch(
      /color: var\(--accent-fg-color\);\s*--gtk-current-color: var\(--accent-fg-color\)/,
    );
    // Applied once, even though PostCSS revisits changed declarations.
    expect(out.match(/--gtk-current-color/g)).toHaveLength(2);
  });

  test("widgets whose color doesn't change with their state keep currentColor", async () => {
    const out = await transform(
      "row:hover { background-color: alpha(currentColor, 0.03); } row.error { color: red; } row:hover { background-image: image(alpha(currentColor, 0.1)); }",
    );
    // Follows a color set by app CSS, overlays included.
    expect(out).toContain("background-color: color-mix(in srgb, currentColor 3%, transparent)");
    expect(out).toContain("--gtk-background-overlay: transparent; --gtk-background-tint: 10%");
    expect(out).toContain(
      "color-mix(in srgb, currentColor var(--gtk-background-tint), transparent)",
    );
  });

  test("a rule shared with such widgets only reads the property for them", async () => {
    const out = await transform(
      "menubutton > button:checked { color: inherit; } button.opaque:hover, menubutton > button:hover { background-image: image(alpha(currentColor, 0.1)); }",
    );
    expect(out).toMatch(
      /> :where\(.gtk-button\):not\(_\):hover:where\([^{]+\) \{ --gtk-background-overlay: color-mix\(in srgb, var\(--gtk-current-color, currentColor\) 10%/,
    );
    expect(out).toMatch(
      /:where\(.gtk-button\):not\(_\).opaque:hover:where\([^{]+\) \{ --gtk-background-overlay: transparent; --gtk-background-tint: 10%/,
    );
  });

  test("overlays of widgets whose color changes with their state fade from the old color", async () => {
    const out = await transform(
      "switch { transition: background 200ms; } switch:checked { color: white; } switch:checked:hover { background-image: image(alpha(currentColor, 0.1)); }",
    );
    expect(out).toContain(
      "--gtk-background-overlay: color-mix(in srgb, var(--gtk-current-color, currentColor) 10%, transparent); --gtk-background-tint: 0%",
    );
  });

  test("a color that depends on currentColor leaves the property to fall back", async () => {
    const out = await transform(
      ".dim { color: alpha(currentColor, 0.55); } .plain { color: inherit !important; }",
    );
    expect(out).toContain("color: color-mix(in srgb, currentColor 55%, transparent)");
    expect(out).toContain("--gtk-current-color: initial");
    expect(out).toContain("--gtk-current-color: inherit !important");
  });
});

describe("background-image overlays", () => {
  test("image(color) overlays fade with the background transition", async () => {
    const out = await transform(
      "button { transition: background 200ms ease-out, box-shadow 200ms ease-out; } button:hover { background-image: image(alpha(currentColor, 0.1)); } button:active { background-image: image(rgb(0 0 6 / 20%)); } button.two { background-image: image(red), image(blue); }",
    );
    // currentColor at an opacity fades as a percentage; other colors as colors.
    expect(out).toContain("--gtk-background-overlay: transparent; --gtk-background-tint: 10%");
    expect(out).toContain("--gtk-background-overlay: rgb(0 0 6 / 20%); --gtk-background-tint: 0%");
    expect(out).toContain(
      "background-image: linear-gradient(var(--gtk-background-overlay), var(--gtk-background-overlay)), linear-gradient(color-mix(in srgb, currentColor var(--gtk-background-tint), transparent), color-mix(in srgb, currentColor var(--gtk-background-tint), transparent))",
    );
    expect(out).toContain(
      "transition: background 200ms ease-out, box-shadow 200ms ease-out, --gtk-background-overlay 200ms ease-out, --gtk-background-tint 200ms ease-out",
    );
    expect(out).toMatch(/^@property --gtk-background-overlay \{/);
    expect(out).toContain("@property --gtk-background-tint {");
    // Kept, transparent, outside the hover state so the overlay fades out too.
    expect(out).toContain(":where(:where(.gtk-button):not(_)) {");
    // Layered images stay images.
    expect(out).toContain(
      "background-image: linear-gradient(red, red), linear-gradient(blue, blue)",
    );
  });
});
