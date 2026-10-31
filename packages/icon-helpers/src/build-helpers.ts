/**
 * Shared helpers for building GTK icon packages.
 * Used by all icon packages under icons/.
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
} from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, normalize } from "path";
import type { SvgNode } from "./createGtkIcon.tsx";

export type { SvgNode } from "./createGtkIcon.tsx";

// Attributes to strip (invalid as React props, or meaningless once recolored).
// Namespaced ones (inkscape:, sodipodi:, xlink:, …) are stripped too.
// style: CSS strings aren't valid React style props (React requires objects);
// its presentation properties are kept as attributes instead (STYLE_PROPS).
// filter/enableBackground/color: reference SVG defs or are non-standard SVG attrs
const STRIP_ATTRS = new Set([
  "id",
  "class",
  "xmlns",
  "style",
  "filter",
  "enable-background",
  "color",
]);

// style="" properties that are presentation attributes as well, kept as such.
const STYLE_PROPS = new Set([
  "opacity",
  "fill",
  "fill-opacity",
  "fill-rule",
  "clip-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "display",
  "visibility",
]);

const SHAPES = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon"]);

export function toPascalCase(str: string): string {
  return str
    .replace(/-symbolic$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

export function toKebabCase(str: string): string {
  return str
    .replace(/-symbolic$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/[-_]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase(); // normalize case so mixed-case duplicates are caught
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[m[1]!] = m[2] ?? m[3]!;
  }
  return attrs;
}

/**
 * An element's attributes as React props for a symbolic icon, or null when
 * it isn't drawn (display: none). Paint becomes currentColor, as GTK recolors
 * a symbolic icon with the widget's color.
 */
function toProps(attrs: Record<string, string>): Record<string, string> | null {
  const merged: Record<string, string> = { ...attrs };
  for (const decl of (attrs.style ?? "").split(";")) {
    const colon = decl.indexOf(":");
    if (colon < 0) continue;
    const name = decl.slice(0, colon).trim();
    // A style property wins over the attribute of the same name, as in CSS.
    if (STYLE_PROPS.has(name)) merged[name] = decl.slice(colon + 1).trim();
  }
  if (merged.display === "none" || merged.visibility === "hidden") return null;

  const props: Record<string, string> = {};
  for (const [name, value] of Object.entries(merged)) {
    if (STRIP_ATTRS.has(name) || name.includes(":")) continue;
    if (name === "display" || name === "visibility") continue;
    // Convert kebab-case attrs to camelCase for React
    const reactName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    props[reactName] =
      (name === "fill" || name === "stroke") && value !== "none" ? "currentColor" : value;
  }

  // A class picks the paint instead, from the theme's palette for the
  // classes that name one (gtk_svg's traditional symbolic icons,
  // gtk_css_palette_value_new_default()): set as style, which takes CSS
  // variables in every browser.
  const classes = (attrs.class ?? "").split(/\s+/).filter(Boolean);
  if (classes.length > 0) {
    const paint = (kind: "fill" | "stroke") => {
      for (const color of ["success", "warning", "error"]) {
        if (classes.includes(`${color}-${kind}`) || (kind === "fill" && classes.includes(color))) {
          return `var(--${color}-color, currentColor)`;
        }
      }
      if (kind === "fill" && classes.includes("transparent-fill")) return "none";
      if (kind === "fill" || classes.includes("foreground-stroke")) return "currentColor";
      return undefined;
    };
    const fill = paint("fill")!;
    const stroke = paint("stroke");
    delete props.fill;
    if (stroke) delete props.stroke;
    props.style = `fill: ${fill}${stroke ? `; stroke: ${stroke}` : ""}`;
  }
  return props;
}

/** An SVG's drawn shapes and groups, and the viewBox they're drawn in. */
export interface ParsedSvg {
  viewBox: string;
  children: SvgNode[];
}

/**
 * Parses an icon's SVG into what createGtkIcon() draws: its shapes, in the
 * groups that move (transform) and fade (opacity) them, and its viewBox
 * (from its width and height without one). Definitions, metadata, styles and
 * other elements a symbolic icon doesn't draw are left out.
 */
export function parseSvg(svg: string): ParsedSvg {
  let viewBox = "0 0 16 16";
  const root: SvgNode = ["svg", {}, []];
  // The open elements: null for one that isn't drawn, whose content is skipped.
  const stack: (SvgNode | null)[] = [];
  const add = (parent: SvgNode | null | undefined, node: SvgNode | null) => {
    // A group is kept only if it draws something.
    if (parent?.[2] && node && node !== root && (node[0] !== "g" || node[2]!.length > 0)) {
      parent[2].push(node);
    }
  };
  const tags =
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[?!][^>]*>|<(\/?)([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

  for (const [, closing, tag, attrSource, selfClosing] of svg.matchAll(tags)) {
    if (!tag) continue;
    if (closing) {
      const node = stack.pop() ?? null;
      add(stack[stack.length - 1], node);
      continue;
    }

    const parent = stack[stack.length - 1];
    let node: SvgNode | null = null;
    if (stack.length === 0) {
      if (tag === "svg") {
        const attrs = parseAttrs(attrSource!);
        const size = (value?: string) => (value ? parseFloat(value) : 16);
        viewBox = (attrs.viewBox ?? `0 0 ${size(attrs.width)} ${size(attrs.height)}`)
          .trim()
          .split(/[\s,]+/)
          .join(" ");
        node = root;
      }
    } else if (parent?.[2] && (tag === "g" || SHAPES.has(tag))) {
      // Inside the root or a group: a shape's own content (a <title>) isn't drawn.
      const props = toProps(parseAttrs(attrSource!));
      if (props) node = tag === "g" ? [tag, props, []] : [tag, props];
    }

    if (selfClosing) add(parent, node);
    else stack.push(node);
  }

  return { viewBox, children: root[2]! };
}

/**
 * Recursively find all .svg files in a directory, in name order so that name
 * clashes resolve the same way on every file system.
 */
export function findSvgFiles(dir: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(dir).sort()) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      results.push(...findSvgFiles(full));
    } else if (entry.endsWith(".svg")) {
      results.push(full);
    }
  }

  return results;
}

/** An icon to build: its name, and the SVG file drawn for it. */
export interface IconFile {
  name: string;
  path: string;
}

/**
 * Where icons come from: directories of SVG files, named after their files
 * (can be nested), and icons listed one by one. Earlier ones win on name clashes.
 */
export type IconSources = string | (string | IconFile)[];

interface ThemeDirectory {
  path: string;
  /** How far its icons are from the requested size, as GtkIconTheme measures it. */
  difference: number;
}

/**
 * GtkIconTheme's theme_dir_size_difference(): how far a directory's icons
 * are from `size`, at scale 1.
 */
function sizeDifference(keys: Map<string, string>, size: number): number {
  const dirSize = Number(keys.get("Size") ?? 0);
  const type = keys.get("Type") ?? "Threshold";
  if (type === "Fixed") return Math.abs(size - dirSize);
  if (type === "Scalable") {
    const min = Number(keys.get("MinSize") ?? dirSize);
    const max = Number(keys.get("MaxSize") ?? dirSize);
    return size < min ? min - size : size > max ? size - max : 0;
  }
  const threshold = Number(keys.get("Threshold") ?? 2);
  const min = dirSize - threshold;
  const max = dirSize + threshold;
  return size < min ? min - size : size > max ? size - max : 0;
}

/** index.theme's Directories, each with its keys. */
function themeDirectories(indexTheme: string): [string, Map<string, string>][] {
  const sections = new Map<string, Map<string, string>>();
  let current: Map<string, string> | undefined;
  for (const line of indexTheme.split("\n")) {
    const section = line.match(/^\[(.+)\]\s*$/);
    if (section) {
      current = new Map();
      sections.set(section[1]!, current);
      continue;
    }
    const entry = line.match(/^([\w-]+)\s*=\s*(.*?)\s*$/);
    if (entry && current) current.set(entry[1]!, entry[2]!);
  }
  const directories = sections.get("Icon Theme")?.get("Directories") ?? "";
  return directories
    .split(",")
    .filter(Boolean)
    .map((dir) => [dir, sections.get(dir) ?? new Map<string, string>()]);
}

const isSymbolic = (name: string) => /-symbolic(-ltr|-rtl)?$/.test(name);

/**
 * The icons of an icon theme as it's installed, from its source tree:
 * `themeDir` holds index.theme and its Directories. A theme whose install
 * script copies a second tree of aliases (symlinks, relative to the installed
 * directory) over the first, like the vinceliuice themes' `links/`, passes
 * it as `links`; an alias names the icon it links to, wherever that is.
 *
 * Each name is drawn from the directory GtkIconTheme picks for it at `size`
 * (theme_lookup_icon()): the nearest in size, the first of index.theme's
 * Directories among equals. With `symbolic`, only the symbolic icons, the
 * ones widgets ask for.
 */
export function iconThemeFiles(
  themeDir: string,
  {
    links,
    size = 16,
    symbolic = false,
  }: { links?: string; size?: number; symbolic?: boolean } = {},
): IconFile[] {
  const directories: ThemeDirectory[] = themeDirectories(
    readFileSync(join(themeDir, "index.theme"), "utf8"),
  )
    .filter(([, keys]) => Number(keys.get("Scale") ?? 1) === 1)
    .map(([path, keys]) => ({ path, difference: sizeDifference(keys, size) }));
  // Stable: index.theme's order among equals.
  directories.sort((a, b) => a.difference - b.difference);

  // The file an icon at `path` (relative to the installed theme) is, following aliases.
  const resolve = (path: string, depth = 0): string | null => {
    const file = join(themeDir, path);
    if (existsSync(file)) return file;
    if (!links || depth > 8) return null;
    const alias = join(links, path);
    let target: string;
    try {
      if (!lstatSync(alias).isSymbolicLink()) return alias;
      target = readlinkSync(alias);
    } catch {
      return null;
    }
    return resolve(normalize(join(path, "..", target)), depth + 1);
  };

  const files: IconFile[] = [];
  const seen = new Set<string>();
  for (const { path } of directories) {
    const names = new Set<string>();
    for (const root of links ? [themeDir, links] : [themeDir]) {
      const dir = join(root, path);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir)) {
        if (entry.endsWith(".svg")) names.add(entry.slice(0, -".svg".length));
      }
    }
    for (const name of [...names].sort()) {
      if (seen.has(name) || (symbolic && !isSymbolic(name))) continue;
      const file = resolve(join(path, `${name}.svg`));
      if (!file) continue;
      seen.add(name);
      files.push({ name, path: file });
    }
  }
  return files;
}

/** The icons of `sources`, in order: a directory's in name order. */
function iconFiles(sources: IconSources): IconFile[] {
  return (Array.isArray(sources) ? sources : [sources]).flatMap((source) =>
    typeof source === "string"
      ? findSvgFiles(source).map((path) => ({
          name: path.split("/").pop()!.replace(".svg", ""),
          path,
        }))
      : [source],
  );
}

/**
 * Source of an icon component: createGtkIcon() with the icon's shapes, and its
 * viewBox unless it's the default 16×16.
 */
export function iconSource(
  pascalName: string,
  kebabName: string,
  { viewBox, children }: ParsedSvg,
  createGtkIconImport: string,
): string {
  const args = [JSON.stringify(kebabName), JSON.stringify(children)];
  if (viewBox !== "0 0 16 16") args.push(JSON.stringify(viewBox));
  return `import { createGtkIcon } from "${createGtkIconImport}";\n\nexport const ${pascalName} = createGtkIcon(${args.join(", ")});\n`;
}

/**
 * Build icon components from SVGs.
 *
 * @param sources - directories (can be nested) or icons; earlier ones win on name clashes
 * @param outDir - output directory for generated .ts files
 * @param createGtkIconImport - import path for createGtkIcon
 * @returns sorted array of export statements for index.ts
 */
export async function buildIconComponents(
  sources: IconSources,
  outDir: string,
  createGtkIconImport: string,
): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });

  const seenNames = new Set<string>();

  // Phase 1: filter duplicates and invalid identifiers (no I/O)
  const toProcess: { filePath: string; kebabName: string; pascalName: string }[] = [];
  for (const { name, path: filePath } of iconFiles(sources)) {
    const kebabName = toKebabCase(name);
    const pascalName = toPascalCase(kebabName);

    if (seenNames.has(kebabName)) continue;
    seenNames.add(kebabName);

    // Skip icons whose names start with a digit (invalid JS identifiers)
    if (/^[0-9]/.test(pascalName)) continue;

    toProcess.push({ filePath, kebabName, pascalName });
  }

  // Phase 2: parallel read + write
  const results = await Promise.all(
    toProcess.map(async ({ filePath, kebabName, pascalName }) => {
      const parsed = parseSvg(await readFile(filePath, "utf8"));
      if (parsed.children.length === 0) return null;

      await writeFile(
        `${outDir}/${kebabName}.ts`,
        iconSource(pascalName, kebabName, parsed, createGtkIconImport),
      );
      return `export { ${pascalName} } from "./icons/${kebabName}.ts";`;
    }),
  );

  return results.filter((e): e is string => e !== null).sort();
}

/**
 * Source of the `MissingIcon` module: the full-color icon GtkIconTheme shows
 * for a name the theme doesn't have ("image-missing", never its symbolic
 * variant). An SVG is inlined; any other image is embedded as a data URL.
 */
export function missingIconSource(fileName: string, contents: Uint8Array): string {
  const helpers = `"@gtk-js/icon-helpers"`;
  if (fileName.endsWith(".svg")) {
    const svg = JSON.stringify(new TextDecoder().decode(contents));
    return `import { createGtkIconFromSvg } from ${helpers};\n\nexport const MissingIcon = createGtkIconFromSvg("image-missing", ${svg});\n`;
  }
  const type = fileName.endsWith(".png") ? "image/png" : "application/octet-stream";
  const url = `data:${type};base64,${Buffer.from(contents).toString("base64")}`;
  return `import { createGtkIconFromUrl } from ${helpers};\n\nexport const MissingIcon = createGtkIconFromUrl("image-missing", "${url}");\n`;
}

/**
 * Build a complete icon package from SVGs.
 * Writes generated components to src/icons/ (replacing what was there) and an
 * index to src/index.ts.
 *
 * @param sources - directories (can be nested) or icons; earlier ones win on name clashes
 * @param pkgDir - root directory of the icon package (contains src/)
 * @param missingIcon - the theme's full-color image-missing, exported as `MissingIcon`
 */
export async function buildIconPackage(
  sources: IconSources,
  pkgDir: string,
  missingIcon?: string,
): Promise<void> {
  const outDir = `${pkgDir}/src/icons`;
  const indexPath = `${pkgDir}/src/index.ts`;

  // Icons a theme no longer has don't linger.
  rmSync(outDir, { recursive: true, force: true });
  const exports = await buildIconComponents(sources, outDir, "@gtk-js/icon-helpers");
  if (missingIcon) {
    const contents = new Uint8Array(await readFile(missingIcon));
    await writeFile(`${outDir}/missing-icon.ts`, missingIconSource(missingIcon, contents));
    exports.push(`export { MissingIcon } from "./icons/missing-icon.ts";`);
  }

  await writeFile(
    indexPath,
    `export type { GtkIconProps, GtkIcon } from "@gtk-js/icon-helpers";\n\n${exports.join("\n")}\n`,
  );

  console.log(`Built ${exports.length} icon components`);
}
