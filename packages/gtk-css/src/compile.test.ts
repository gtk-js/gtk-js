import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import postcss from "postcss";
import { afterAll, describe, expect, test } from "vite-plus/test";
import { compileGtkCSS } from "./compile.ts";

describe("compileGtkCSS", () => {
  const dir = mkdtempSync(join(tmpdir(), "gtk-css-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("embeds a recolored -gtk-icon-source, resolved against the stylesheet", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"/>';
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets/check-symbolic.svg"), svg);
    writeFileSync(
      join(dir, "theme.scss"),
      `check:checked { -gtk-icon-source: -gtk-recolor(url("assets/check-symbolic.svg")); }`,
    );
    const css = await compileGtkCSS(join(dir, "theme.scss"));
    const b64 = Buffer.from(svg).toString("base64");
    expect(css).toContain(`--gtk-icon-source: url("data:image/svg+xml;base64,${b64}")`);
  });

  test("embeds images where assetMap puts them, -gtk-scaled() as image-set()", async () => {
    const png = (n: number) => Buffer.from([0x89, 0x50, 0x4e, 0x47, n]);
    mkdirSync(join(dir, "installed"));
    for (const [name, n] of [
      ["slider.png", 1],
      ["slider@2.png", 2],
      ["line.png", 3],
    ] as const) {
      writeFileSync(join(dir, "installed", name), png(n));
    }
    writeFileSync(
      join(dir, "mapped.scss"),
      `scale slider { background-image: -gtk-scaled(url("assets/slider.png"), url("assets/slider@2.png")); }
       row:selected { background-image: url("assets/line.png"), image(white); }`,
    );
    const assetMap = new Map(
      ["slider.png", "slider@2.png", "line.png"].map((n) => [
        `assets/${n}`,
        join(dir, "installed", n),
      ]),
    );
    const css = await compileGtkCSS(join(dir, "mapped.scss"), { assetMap });
    const uri = (n: number) => `url("data:image/png;base64,${png(n).toString("base64")}")`;
    expect(css).toContain(`background-image: image-set(${uri(1)} 1x, ${uri(2)} 2x)`);
    expect(css).toContain(`background-image: ${uri(3)}, linear-gradient(white, white)`);
  });

  test("puts libadwaita's stylesheet under a theme for libadwaita apps, in its colors", async () => {
    const libadwaita = join(dir, "libadwaita");
    mkdirSync(libadwaita);
    writeFileSync(join(libadwaita, "_palette.scss"), "$blue_3: #3584e4;");
    writeFileSync(
      join(libadwaita, "_colors.scss"),
      `@define-color window_bg_color #fafafb;
       @define-color sidebar_bg_color #ebebed;
       :root { --window-bg-color: @window_bg_color; --sidebar-bg-color: @sidebar_bg_color; }`,
    );
    writeFileSync(
      join(libadwaita, "default.scss"),
      `$contrast: 'normal';
       @import 'palette';
       @import 'colors';
       dialog.alert .message-area { padding-top: 32px; }
       button { padding: 3px; background-color: var(--window-bg-color); }`,
    );
    writeFileSync(
      join(dir, "for-libadwaita.scss"),
      `@define-color window_bg_color #f5f5f5;
       @define-color sidebar_bg_color #f0f0f0;
       button { padding: 6px; }`,
    );

    const css = await compileGtkCSS(join(dir, "for-libadwaita.scss"), {
      scheme: "light",
      libadwaita,
    });
    const root = postcss.parse(css);
    // The layer order comes first, as in GtkProvider's reset.
    expect(root.first?.toString()).toBe("@layer gtk-reset, gtk-libadwaita");

    const layer = root.nodes.find((n) => n.type === "atrule" && n.params === "gtk-libadwaita");
    const unlayered = root.nodes
      .filter((n) => n.type === "rule")
      .map(String)
      .join("\n");
    // libadwaita styles what the theme doesn't, below it whatever the specificity...
    expect(String(layer)).toContain("padding-top: 32px");
    expect(String(layer)).toContain("padding: 3px");
    expect(String(layer)).toContain("--window-bg-color: #fafafb");
    // ...and draws with the theme's colors, as CSS written for libadwaita does.
    expect(unlayered).toContain("padding: 6px");
    expect(unlayered).toContain("--window-bg-color: #f5f5f5");
    expect(unlayered).toContain("--sidebar-bg-color: #f0f0f0");
    expect(unlayered).not.toContain("#fafafb");
  });

  test("fails on an image that isn't there", async () => {
    writeFileSync(
      join(dir, "missing.scss"),
      `radio:checked { -gtk-icon-source: -gtk-recolor(url("assets/missing-symbolic.svg")); }`,
    );
    await expect(compileGtkCSS(join(dir, "missing.scss"))).rejects.toThrow(
      "Theme image not found: assets/missing-symbolic.svg",
    );
  });
});
