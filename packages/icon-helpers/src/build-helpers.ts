/**
 * Shared helpers for building GTK icon packages.
 * Used by all icon packages under icons/.
 */

import { mkdirSync, readdirSync, statSync } from "fs";
import { readFile, writeFile } from "fs/promises";

// Attributes to strip (GTK/namespace-specific or invalid as React props)
const STRIP_ATTR_PREFIXES = ["gpa:", "xmlns:", "xml:", "cc:", "dc:", "rdf:"];
// style: CSS strings aren't valid React style props (React requires objects)
// filter/enableBackground/color: reference SVG defs or are non-standard SVG attrs
const STRIP_ATTRS = new Set([
  "id",
  "class",
  "xmlns",
  "style",
  "filter",
  "enableBackground",
  "color",
]);

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

interface SvgChild {
  tag: string;
  attrs: Record<string, string>;
}

export function parseSvgChildren(svg: string): SvgChild[] {
  const children: SvgChild[] = [];

  const tagRegex = /<(path|circle|rect|ellipse|line|polyline|polygon)\s([^>]*?)\/?\s*>/g;
  let match;

  while ((match = tagRegex.exec(svg)) !== null) {
    const tag = match[1]!;
    const attrString = match[2]!;
    const attrs: Record<string, string> = {};

    const attrRegex = /([a-zA-Z][a-zA-Z0-9:_-]*)\s*=\s*"([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const name = attrMatch[1]!;
      const value = attrMatch[2]!;

      if (STRIP_ATTRS.has(name)) continue;
      if (STRIP_ATTR_PREFIXES.some((p) => name.startsWith(p))) continue;

      if (name === "fill" && value !== "none") {
        attrs[name] = "currentColor";
        continue;
      }

      if (name === "stroke" && value !== "none") {
        attrs[name] = "currentColor";
        continue;
      }

      // Convert kebab-case attrs to camelCase for React
      const reactName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      attrs[reactName] = value;
    }

    children.push({ tag, attrs });
  }

  return children;
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

/**
 * Build icon components from a directory of SVGs.
 *
 * @param iconsDir - directory (or directories, earlier ones win on name clashes)
 *   containing SVG files (can be nested)
 * @param outDir - output directory for generated .ts files
 * @param createGtkIconImport - import path for createGtkIcon
 * @returns sorted array of export statements for index.ts
 */
export async function buildIconComponents(
  iconsDir: string | string[],
  outDir: string,
  createGtkIconImport: string,
): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });

  const svgFiles = (Array.isArray(iconsDir) ? iconsDir : [iconsDir]).flatMap(findSvgFiles);
  const seenNames = new Set<string>();

  // Phase 1: filter duplicates and invalid identifiers (no I/O)
  const toProcess: { filePath: string; kebabName: string; pascalName: string }[] = [];
  for (const filePath of svgFiles) {
    const iconName = filePath.split("/").pop()!.replace(".svg", "");
    const kebabName = toKebabCase(iconName);
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
      const svg = await readFile(filePath, "utf8");
      const children = parseSvgChildren(svg);
      if (children.length === 0) return null;

      const childrenLiteral = JSON.stringify(children.map((c) => [c.tag, c.attrs]));
      const code = `import { createGtkIcon } from "${createGtkIconImport}";\n\nexport const ${pascalName} = createGtkIcon("${kebabName}", ${childrenLiteral});\n`;

      await writeFile(`${outDir}/${kebabName}.ts`, code);
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
 * Build a complete icon package from a directory of SVGs.
 * Writes generated components to src/icons/ and an index to src/index.ts.
 *
 * @param iconsDir - directory (or directories) containing SVG files (can be nested)
 * @param pkgDir - root directory of the icon package (contains src/)
 * @param missingIcon - the theme's full-color image-missing, exported as `MissingIcon`
 */
export async function buildIconPackage(
  iconsDir: string | string[],
  pkgDir: string,
  missingIcon?: string,
): Promise<void> {
  const outDir = `${pkgDir}/src/icons`;
  const indexPath = `${pkgDir}/src/index.ts`;

  const exports = await buildIconComponents(iconsDir, outDir, "@gtk-js/icon-helpers");
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
