import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkLevelBar } from "./level-bar.tsx";

const blocks = (html: string) => [...html.matchAll(/class="gtk-block ([^"]*)"/g)].map((m) => m[1]);

describe("GtkLevelBar", () => {
  test("the level class compares the value with the offsets, like update_level_style_classes()", () => {
    // 1 of 5 is at the "full" offset (1.0), 3 of 5 above every offset.
    expect(blocks(renderToStaticMarkup(<GtkLevelBar value={1} maxValue={5} />))[0]).toBe(
      "filled full",
    );
    expect(blocks(renderToStaticMarkup(<GtkLevelBar value={3} maxValue={5} />))[0]).toBe("filled");
    expect(blocks(renderToStaticMarkup(<GtkLevelBar value={0.5} />))[0]).toBe("filled high");
    // Offsets above the maximum are moved to it.
    expect(blocks(renderToStaticMarkup(<GtkLevelBar value={0.5} maxValue={0.5} />))[0]).toBe(
      "filled full",
    );
  });

  test("an inverted continuous bar fills the value from the end", () => {
    const html = renderToStaticMarkup(<GtkLevelBar value={0.3} inverted />);
    expect(blocks(html)).toEqual(["empty", "filled high"]);
    expect(html).toContain('style="width:30%;justify-self:end"');
  });

  test("disabled sets data-disabled", () => {
    expect(renderToStaticMarkup(<GtkLevelBar value={0.5} disabled />)).toMatch(
      /class="gtk-levelbar[^"]*"[^>]*data-disabled="true"/,
    );
  });
});
