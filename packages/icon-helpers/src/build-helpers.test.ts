import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, relative } from "path";
import { afterAll, expect, test } from "vite-plus/test";
import {
  buildIconComponents,
  buildIconPackage,
  findSvgFiles,
  iconThemeFiles,
  missingIconSource,
  parseSvg,
} from "./build-helpers";

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

test("parseSvg keeps the groups that move and fade shapes, and the icon's own grid", () => {
  // MacTahoe's 22px process-working-symbolic: its shapes are only in view through
  // the group's transform.
  const parsed = parseSvg(`<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
    <defs><style id="current-color-scheme">.ColorScheme-Text { color:#f2f2f2; }</style></defs>
    <g transform="translate(-754,-26)" class="ColorScheme-Text" fill="currentColor">
      <rect x="764.5" y="29" width="1" height="5" rx=".5"/>
      <rect transform="rotate(-90)" x="-37.5" y="757" width="1" height="5" opacity=".578"/>
    </g>
  </svg>`);
  expect(parsed.viewBox).toBe("0 0 22 22");
  expect(parsed.children).toEqual([
    [
      "g",
      { transform: "translate(-754,-26)", style: "fill: currentColor" },
      [
        ["rect", { x: "764.5", y: "29", width: "1", height: "5", rx: ".5" }],
        [
          "rect",
          {
            transform: "rotate(-90)",
            x: "-37.5",
            y: "757",
            width: "1",
            height: "5",
            opacity: ".578",
          },
        ],
      ],
    ],
  ]);
});

test("parseSvg keeps presentation properties from style, and leaves out what isn't drawn", () => {
  const parsed = parseSvg(`<svg viewBox="0, 0, 24, 24">
    <metadata><rdf:RDF><path d="M 9"/></rdf:RDF></metadata>
    <path d="M 1" style="opacity:0.35;fill:#363636;stroke-width:2" inkscape:connector-curvature="0"/>
    <path d="M 2" style="display:none"/>
    <g opacity="0.5"><path d="M 3" fill="none" stroke="#000"/></g>
    <g><title>empty</title></g>
  </svg>`);
  expect(parsed.viewBox).toBe("0 0 24 24");
  expect(parsed.children).toEqual([
    ["path", { d: "M 1", opacity: "0.35", fill: "currentColor", strokeWidth: "2" }],
    ["g", { opacity: "0.5" }, [["path", { d: "M 3", fill: "none", stroke: "currentColor" }]]],
  ]);
});

test("parseSvg paints classed parts from the theme's palette, as GTK does", () => {
  const parsed = parseSvg(`<svg width="16" height="16">
    <path class="warning" fill="#ff9601" d="M 1"/>
    <path class="error-stroke transparent-fill" d="M 2"/>
    <path class="ColorScheme-Text" fill="#363636" d="M 3"/>
  </svg>`);
  expect(parsed.children).toEqual([
    ["path", { d: "M 1", style: "fill: var(--warning-color, currentColor)" }],
    ["path", { d: "M 2", style: "fill: none; stroke: var(--error-color, currentColor)" }],
    ["path", { d: "M 3", style: "fill: currentColor" }],
  ]);
});

function writeTheme(dir: string, directories: Record<string, string>) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "index.theme"),
    [
      "[Icon Theme]",
      `Directories=${Object.keys(directories).join(",")}`,
      ...Object.entries(directories).flatMap(([name, keys]) => ["", `[${name}]`, keys]),
    ].join("\n"),
  );
}

test("iconThemeFiles takes each icon from the directory GtkIconTheme picks at its size", () => {
  const theme = join(root, "theme");
  writeTheme(theme, {
    "actions/16": "Size=16\nType=Fixed",
    "actions/22": "Size=22\nType=Fixed",
    "actions/symbolic": "Size=16\nMinSize=16\nMaxSize=512\nType=Scalable",
  });
  writeSvg(join(theme, "actions/22/process-working-symbolic.svg"), "M 22");
  writeSvg(join(theme, "actions/symbolic/process-working-symbolic.svg"), "M 16");
  writeSvg(join(theme, "actions/16/open-menu.svg"), "M full-color");
  writeSvg(join(theme, "actions/symbolic/open-menu-symbolic.svg"), "M symbolic");
  writeSvg(join(theme, "actions/22/view-list-symbolic.svg"), "M only-22");

  const icons = iconThemeFiles(theme, { symbolic: true });
  expect(icons.map(({ name, path }) => [name, relative(theme, path)])).toEqual([
    ["open-menu-symbolic", "actions/symbolic/open-menu-symbolic.svg"],
    ["process-working-symbolic", "actions/symbolic/process-working-symbolic.svg"],
    ["view-list-symbolic", "actions/22/view-list-symbolic.svg"],
  ]);
  // Without `symbolic`, the full-color icons too (the theme's image-missing).
  expect(iconThemeFiles(theme).map((icon) => icon.name)).toContain("open-menu");
});

test("iconThemeFiles merges in the aliases an install script copies over the theme", () => {
  const theme = join(root, "aliased");
  const links = join(root, "aliased-links");
  writeTheme(theme, {
    "actions/symbolic": "Size=16\nType=Scalable",
    "status/symbolic": "Size=16\nType=Scalable",
  });
  writeSvg(join(theme, "actions/symbolic/pane-hide-symbolic.svg"), "M pane");
  writeSvg(join(theme, "status/symbolic/network-wired-offline-symbolic.svg"), "M offline");
  mkdirSync(join(links, "actions/symbolic"), { recursive: true });
  mkdirSync(join(links, "status/symbolic"), { recursive: true });
  // Relative to where install.sh copies them, and an alias of an alias.
  symlinkSync("pane-hide-symbolic.svg", join(links, "actions/symbolic/sidebar-show-symbolic.svg"));
  symlinkSync(
    "../../status/symbolic/network-wired-offline-symbolic.svg",
    join(links, "actions/symbolic/network-offline-symbolic.svg"),
  );
  symlinkSync("network-offline-symbolic.svg", join(links, "actions/symbolic/offline-symbolic.svg"));
  symlinkSync("missing-symbolic.svg", join(links, "actions/symbolic/dangling-symbolic.svg"));

  const icons = iconThemeFiles(theme, { links, symbolic: true });
  expect(icons.map(({ name, path }) => [name, relative(theme, path)])).toEqual([
    ["network-offline-symbolic", "status/symbolic/network-wired-offline-symbolic.svg"],
    ["offline-symbolic", "status/symbolic/network-wired-offline-symbolic.svg"],
    ["pane-hide-symbolic", "actions/symbolic/pane-hide-symbolic.svg"],
    ["sidebar-show-symbolic", "actions/symbolic/pane-hide-symbolic.svg"],
    ["network-wired-offline-symbolic", "status/symbolic/network-wired-offline-symbolic.svg"],
  ]);
});

test("buildIconComponents writes an icon's own grid and groups for createGtkIcon", async () => {
  const theme = join(root, "grid");
  mkdirSync(theme, { recursive: true });
  writeFileSync(
    join(theme, "spinner-symbolic.svg"),
    `<svg width="22" height="22"><g transform="translate(1 1)"><path d="M 1"/></g></svg>`,
  );
  const out = join(root, "grid-out");
  await buildIconComponents(theme, out, "@gtk-js/icon-helpers");
  expect(readFileSync(join(out, "spinner.ts"), "utf8")).toContain(
    'createGtkIcon("spinner", [["g",{"transform":"translate(1 1)"},[["path",{"d":"M 1"}]]]], "0 0 22 22")',
  );
});

test("buildIconPackage drops icons the theme no longer has", async () => {
  const theme = join(root, "shrinking");
  writeSvg(join(theme, "kept-symbolic.svg"), "M 1");
  const pkg = join(root, "shrinking-pkg");
  mkdirSync(join(pkg, "src/icons"), { recursive: true });
  writeFileSync(join(pkg, "src/icons/gone.ts"), "export const Gone = null;");

  await buildIconPackage(theme, pkg);
  expect(existsSync(join(pkg, "src/icons/gone.ts"))).toBe(false);
  expect(existsSync(join(pkg, "src/icons/kept.ts"))).toBe(true);
});
