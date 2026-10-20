import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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
      `check:checked { -gtk-icon-source: -gtk-recolor(url("assets/check-symbolic.svg")); }
       radio:checked { -gtk-icon-source: -gtk-recolor(url("assets/missing-symbolic.svg")); }`,
    );
    const css = await compileGtkCSS(join(dir, "theme.scss"));
    const b64 = Buffer.from(svg).toString("base64");
    expect(css).toContain(`--gtk-icon-source: url("data:image/svg+xml;base64,${b64}")`);
    // An image that isn't there is dropped.
    expect(css).not.toContain("missing-symbolic");
  });
});
