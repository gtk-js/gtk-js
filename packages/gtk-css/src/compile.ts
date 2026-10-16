import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { type Plugin } from "postcss";
import { buildGtkToWeb, preprocess } from "./transform.ts";

export interface CompileOptions {
  /**
   * Filter output to a single color scheme.
   * - "light": strip dark media queries and [data-color-scheme="dark"] rules
   * - "dark": use dark color values as base, strip all [data-color-scheme] rules
   * - omit: emit both (current behavior — @media + [data-color-scheme] overrides)
   */
  scheme?: "light" | "dark";
  /**
   * Override the default accent color (#3584e4) baked into the compiled CSS.
   * Useful when a theme has a fixed accent per variant.
   */
  accentColor?: string;
  /**
   * Maps virtual URL paths (as used in CSS url()) to absolute filesystem paths.
   * When provided, -gtk-scaled(url('path.png'), ...) declarations are replaced
   * with embedded base64 data URIs by reading from the mapped filesystem path.
   *
   * Build this from the theme's gtk.gresource.xml — each <file> entry's virtual
   * path maps to the corresponding physical file on disk.
   *
   * Example: { "windows-assets/titlebutton-close.png": "/abs/path/to/titlebutton-close.png" }
   */
  assetMap?: Map<string, string>;
}

function makeGtkAssetPlugin(assetMap: Map<string, string>): Plugin {
  return {
    postcssPlugin: "gtk-embed-asset-functions",
    Declaration(decl) {
      if (!decl.value.includes("-gtk-scaled(")) return;
      const scaledMatch = decl.value.match(/-gtk-scaled\(\s*url\(['"]?([^'")\s]+)['"]?\)/);
      if (!scaledMatch || !scaledMatch[1]) {
        decl.remove();
        return;
      }
      const virtualPath = scaledMatch[1];
      const absPath = assetMap.get(virtualPath);
      if (!absPath) {
        throw new Error(`Asset not found in assetMap: ${virtualPath}`);
      }
      const b64 = readFileSync(absPath).toString("base64");
      decl.value = `url('data:image/png;base64,${b64}')`;
    },
  };
}

/**
 * Compiles a GTK/libadwaita SCSS file to web-compatible CSS.
 *
 * Uses sassc (the C implementation of Sass) to match upstream's build system,
 * then runs text preprocessing + PostCSS transforms to convert GTK-specific
 * CSS to web-compatible CSS.
 */
export async function compileGtkCSS(scssPath: string, options?: CompileOptions): Promise<string> {
  // Step 1: Compile SCSS → raw CSS using sassc (matches upstream)
  const result = spawnSync("sassc", ["-t", "expanded", scssPath], { maxBuffer: 256 * 1024 * 1024 });

  if (result.status !== 0) {
    const reason =
      result.error?.message ??
      (result.signal != null ? `killed by ${result.signal}` : `exit ${result.status}`);
    throw new Error(`sassc compilation failed (${reason}):\n${result.stderr?.toString()}`);
  }

  const rawCSS = result.stdout.toString();

  // Step 2: Text preprocessing — strip @define-color and other non-CSS syntax
  const preprocessed = preprocess(rawCSS, options);

  // Step 3: PostCSS transforms — remap selectors, pseudo-classes, properties
  const assetPlugin = options?.assetMap ? makeGtkAssetPlugin(options.assetMap) : undefined;
  const pipeline = buildGtkToWeb(assetPlugin);
  const transformed = await pipeline.process(preprocessed, { from: scssPath });

  return transformed.css;
}
