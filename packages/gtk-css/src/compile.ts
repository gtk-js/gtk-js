import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { dirname, extname, join, resolve } from "path";
import { type Plugin } from "postcss";
import { GTK_LAYERS } from "./theme.ts";
import { buildGtkToWeb, preprocess } from "./transform.ts";

export interface CompileOptions {
  /**
   * Filter output to a single color scheme.
   * - "light": strip dark media queries
   * - "dark": use dark color values as base, unwrap dark media queries, strip
   *   light ones
   * - omit: emit both, the dark values behind `@media (prefers-color-scheme: dark)`
   */
  scheme?: "light" | "dark";
  /**
   * Override the default accent color (#3584e4) baked into the compiled CSS.
   * Useful when a theme has a fixed accent per variant.
   */
  accentColor?: string;
  /**
   * Maps the theme's url() paths to absolute filesystem paths, for themes whose
   * images aren't where the url()s point from the SCSS, e.g. ones a theme's
   * install script copies next to its gtk.css or bundles in its gresource.
   * Paths missing from the map are resolved against the SCSS file's directory.
   *
   * Example: { "windows-assets/titlebutton-close.png": "/abs/path/to/titlebutton-close.png" }
   */
  assetMap?: Map<string, string>;
  /**
   * libadwaita's stylesheet directory, for a GTK theme made for libadwaita
   * apps. GTK loads such a theme over libadwaita's stylesheet, as the user's
   * gtk.css (GTK_STYLE_PROVIDER_PRIORITY_USER over libadwaita's _THEME), so
   * libadwaita styles what the theme doesn't, and the theme outranks it
   * whatever the specificity. That stylesheet, built for the same scheme, goes
   * first in the `gtk-libadwaita` cascade layer (GTK_LAYERS). Its custom
   * properties (`--window-bg-color: @window_bg_color`, …) are added to the
   * theme's CSS too, with the theme's named colors: libadwaita draws with
   * them, and so does CSS written for it (`var(--sidebar-bg-color)`).
   */
  libadwaita?: string;
}

/**
 * Embeds the theme's images as data URIs: the stylesheet is injected as text,
 * so a relative url() would resolve against the page. GTK resolves it against
 * the stylesheet (gtk_css_parser_resolve_url()). -gtk-scaled(), whose images
 * GTK picks by the display's scale (gtk_css_image_scaled_compute()), becomes
 * image-set(). A missing image fails the build instead of leaving a widget
 * undrawn.
 */
function makeGtkAssetPlugin(scssDir: string, assetMap?: Map<string, string>): Plugin {
  const embed = (path: string) => {
    const absPath = assetMap?.get(path) ?? resolve(scssDir, path);
    if (!existsSync(absPath)) throw new Error(`Theme image not found: ${path} (${absPath})`);
    const type = extname(absPath) === ".svg" ? "image/svg+xml" : "image/png";
    return `url("data:${type};base64,${readFileSync(absPath).toString("base64")}")`;
  };
  return {
    postcssPlugin: "gtk-embed-assets",
    Declaration(decl) {
      if (!decl.value.includes("url(") && !decl.value.includes("-gtk-scaled(")) return;
      const value = decl.value.replace(
        /-gtk-scaled\(\s*(url\([^()]*\)(?:\s*,\s*url\([^()]*\))*)\s*\)/g,
        (_, images: string) =>
          `image-set(${images
            .split(/\s*,\s*/)
            .map((image, i) => `${image} ${i + 1}x`)
            .join(", ")})`,
      );
      // Other -gtk-scaled() images, e.g. recolored ones, have no web equivalent.
      if (value.includes("-gtk-scaled(")) {
        decl.remove();
        return;
      }
      decl.value = value.replace(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g, (url, _, path: string) =>
        /^[a-z][a-z0-9+.-]*:/i.test(path) ? url : embed(path),
      );
    },
  };
}

/** Runs sassc with `args`, on `input` when given (`-s`). */
function sassc(args: string[], input?: string): string {
  const result = spawnSync("sassc", ["-t", "expanded", ...args], {
    input,
    maxBuffer: 256 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const reason =
      result.error?.message ??
      (result.signal != null ? `killed by ${result.signal}` : `exit ${result.status}`);
    throw new Error(`sassc compilation failed (${reason}):\n${result.stderr?.toString()}`);
  }

  return result.stdout.toString();
}

/**
 * libadwaita's custom properties (_colors.scss's `:root` rules), without its
 * named colors: they're resolved from the theme's.
 */
export function libadwaitaCustomProperties(stylesheetDir: string): string {
  // default.scss's own setting, which _colors.scss reads.
  const css = sassc(
    ["-s", "-I", stylesheetDir],
    "$contrast: 'normal';\n@import 'palette';\n@import 'colors';\n",
  );
  return css.replace(/@define-color\s+\S+\s+[^;]+;\s*/g, "").replace(/@media[^{]*\{\s*\}\s*/g, "");
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
  let rawCSS = sassc([scssPath]);
  if (options?.libadwaita) rawCSS += `\n${libadwaitaCustomProperties(options.libadwaita)}`;

  // Step 2: Text preprocessing — strip @define-color and other non-CSS syntax
  const preprocessed = preprocess(rawCSS, options);

  // Step 3: PostCSS transforms — remap selectors, pseudo-classes, properties
  const assetPlugin = makeGtkAssetPlugin(dirname(scssPath), options?.assetMap);
  const pipeline = buildGtkToWeb(assetPlugin, options?.scheme);
  const transformed = await pipeline.process(preprocessed, { from: scssPath });

  if (!options?.libadwaita) return transformed.css;
  const libadwaita = await compileGtkCSS(join(options.libadwaita, "default.scss"), {
    scheme: options.scheme,
  });
  return `${GTK_LAYERS}\n@layer gtk-libadwaita {\n${libadwaita}\n}\n${transformed.css}`;
}
