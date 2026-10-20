import { expect, test } from "vite-plus/test";
import { gtkAssert } from "../assert";
import { findChild, getNativeSnapshot } from "../harness";

// gtk_range_render_trough() draws the highlight and then the slider, so where
// they overlap (the highlight ends at the slider's center) the slider hides it.
// Each case samples the trough's middle line halfway across that overlap and
// expects the native slider's color, not the highlight's.
const CASES = ["scale-default", "scale-vertical", "scale-marks-inverted"];

for (const [browserName, page] of Object.entries(globalThis.__testPages)) {
  for (const name of CASES) {
    test(`scale-slider-paint ${name} (${browserName})`, async () => {
      const trough = page.locator(`[data-case="${name}"] [data-testid='target'] > .gtk-trough`);
      const point = await trough.evaluate((el) => {
        const t = el.getBoundingClientRect();
        const s = el.querySelector(".gtk-slider")!.getBoundingClientRect();
        const h = el.querySelector(".gtk-highlight")!.getBoundingClientRect();
        const horizontal = t.width > t.height;
        const [start, end] = horizontal
          ? [Math.max(s.left, h.left), Math.min(s.right, h.right)]
          : [Math.max(s.top, h.top), Math.min(s.bottom, h.bottom)];
        const along = (start + end) / 2;
        return {
          overlap: end - start,
          x: Math.floor((horizontal ? along : t.left + t.width / 2) - t.left),
          y: Math.floor((horizontal ? t.top + t.height / 2 : along) - t.top),
        };
      });
      expect(point.overlap).toBeGreaterThan(4);

      const png = (await trough.screenshot()).toString("base64");
      const pixel = await page.evaluate(
        async ({ png, x, y }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
          return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
        },
        { png, ...point },
      );

      const native = findChild(await getNativeSnapshot(name), "slider");
      gtkAssert.colorsClose(
        native.background_color,
        pixel,
        { tolerance: 2 / 255, reason: "screenshot color rounding" },
        "color under the slider",
      );
    });
  }
}
