import { expect, test } from "vite-plus/test";
import { getNativeSnapshot } from "../harness";

// Temporary diagnostics: what the monospace text resolves to on either side.
const strip = (n: any): any => ({
  css_name: n.css_name,
  w: n.width,
  h: n.height,
  font: n.font_family,
  children: (n.children ?? []).map(strip),
});

for (const [browserName] of Object.entries(globalThis.__testBrowsers)) {
  test(`zz-diag (${browserName})`, async () => {
    const page = globalThis.__testPages[browserName]!;
    const out: Record<string, unknown> = {};
    for (const c of ["source-view-tab-width", "source-view-wrap", "text-view-monospace"]) {
      out[`native ${c}`] = strip(await getNativeSnapshot(c));
      out[`web ${c}`] = await page.evaluate((c) => {
        const root = document.querySelector(`[data-case="${c}"] [data-testid='target']`) as HTMLElement;
        const view = (root.matches(".gtk-textview") ? root : root.querySelector(".gtk-textview")) as HTMLElement;
        const text = view?.querySelector("textarea") ?? (root as HTMLTextAreaElement);
        const css = getComputedStyle(text);
        const metrics = (font: string) => {
          const ctx = document.createElement("canvas").getContext("2d")!;
          ctx.font = font;
          const m = ctx.measureText("");
          return [ctx.font, m.fontBoundingBoxAscent, m.fontBoundingBoxDescent];
        };
        return {
          rootRect: root.getBoundingClientRect().height,
          textRect: text.getBoundingClientRect().height,
          family: css.fontFamily,
          size: css.fontSize,
          lineHeight: css.lineHeight,
          varLH: getComputedStyle(view).getPropertyValue("--gtk-textview-line-height"),
          rootLH: getComputedStyle(view).lineHeight,
          m1000: metrics(`${css.fontStyle} ${css.fontWeight} 1000px ${css.fontFamily}`),
          others: ["monospace", '"DejaVu Sans Mono"', '"Adwaita Mono"', '"Source Code Pro"', '"Noto Sans Mono"', '"Liberation Mono"'].map((f) => [f, metrics(`1000px ${f}`), document.fonts.check(`12px ${f}`)]),
          fontsStatus: document.fonts.status,
          ua: navigator.userAgent,
        };
      }, c);
    }
    expect(JSON.stringify(out)).toBe("");
  });
}
