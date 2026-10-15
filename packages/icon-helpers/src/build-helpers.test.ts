import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, relative } from "path";
import { buildIconComponents, findSvgFiles } from "./build-helpers";

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
