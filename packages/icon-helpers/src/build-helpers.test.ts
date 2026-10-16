import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, relative } from "path";
import { afterAll, expect, test } from "vite-plus/test";
import { buildIconComponents, findSvgFiles, missingIconSource } from "./build-helpers";

const root = mkdtempSync(join(tmpdir(), "icon-helpers-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function writeSvg(path: string, d: string) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
}

test("findSvgFiles lists files in name order on every file system", () => {
  const theme = join(root, "sorted");
  // Created out of order: readdir returns creation or hash order on some file systems.
  writeSvg(join(theme, "status/b-symbolic.svg"), "M 2");
  writeSvg(join(theme, "places/c-symbolic.svg"), "M 3");
  writeSvg(join(theme, "places/a-symbolic.svg"), "M 1");

  expect(findSvgFiles(theme).map((file) => relative(theme, file))).toEqual([
    "places/a-symbolic.svg",
    "places/c-symbolic.svg",
    "status/b-symbolic.svg",
  ]);
});

test("buildIconComponents takes a clashing icon from the first directory", async () => {
  const theme = join(root, "clash");
  writeSvg(join(theme, "status/folder-symbolic.svg"), "M 2");
  writeSvg(join(theme, "places/folder-symbolic.svg"), "M 1");
  const out = join(root, "out");

  const exports = await buildIconComponents(
    [join(theme, "places"), join(theme, "status")],
    out,
    "@gtk-js/icon-helpers",
  );

  expect(exports).toEqual(['export { Folder } from "./icons/folder.ts";']);
  expect(readFileSync(join(out, "folder.ts"), "utf8")).toContain('"d":"M 1"');
});

test("missingIconSource inlines a full-color SVG and embeds other images as data URLs", () => {
  const svg = `<svg viewBox="0 0 128 128"><path fill="#f6f5f4" d="M 0"/></svg>`;
  const fromSvg = missingIconSource("image-missing.svg", new TextEncoder().encode(svg));
  expect(fromSvg).toContain(`createGtkIconFromSvg("image-missing", ${JSON.stringify(svg)})`);
  expect(fromSvg).toContain("export const MissingIcon");

  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const fromPng = missingIconSource("image-missing.png", png);
  expect(fromPng).toContain(
    `createGtkIconFromUrl("image-missing", "data:image/png;base64,iVBORw==")`,
  );
});
