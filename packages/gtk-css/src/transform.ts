import postcss, { type Plugin } from "postcss";
import type { CompileOptions } from "./compile.ts";
import { ALL_SELECTORS } from "./selectors.ts";

/**
 * Pre-processes raw sassc output to remove GTK-specific syntax that
 * isn't valid CSS and would prevent PostCSS from parsing.
 *
 * This is a text-based pass that runs BEFORE PostCSS parsing.
 */
export function preprocess(rawCSS: string, options?: CompileOptions): string {
  const lines = rawCSS.split("\n");
  const { scheme, accentColor } = options ?? {};

  // Pass 1: Collect @define-color values, separating light (top-level) from
  // dark (inside @media (prefers-color-scheme: dark)).
  // Light values are used as defaults when resolving @name references.
  const accentSeed = accentColor ?? "#3584e4";
  const lightColors = new Map<string, string>([
    // Runtime-only colors set by adw-style-manager.c, never in stylesheet
    ["accent_bg_color", accentSeed],
    ["accent_fg_color", "white"],
  ]);
  const darkColors = new Map<string, string>([
    ["accent_bg_color", accentSeed],
    ["accent_fg_color", "white"],
  ]);

  let insideDarkMedia = false;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track whether we're inside a @media (prefers-color-scheme: dark) block
    if (trimmed.includes("prefers-color-scheme: dark")) {
      insideDarkMedia = true;
      braceDepth = 0;
    }
    if (insideDarkMedia) {
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }
      if (braceDepth <= 0 && trimmed.includes("}")) {
        insideDarkMedia = false;
      }
    }

    // Collect @define-color declarations
    const defineMatches = trimmed.matchAll(/@define-color\s+(\S+)\s+([^;]+);/g);
    for (const m of defineMatches) {
      if (insideDarkMedia) {
        darkColors.set(m[1]!, m[2]!);
      } else {
        lightColors.set(m[1]!, m[2]!);
        if (!darkColors.has(m[1]!)) {
          darkColors.set(m[1]!, m[2]!);
        }
      }
    }
  }

  // Resolve @name references within a color value using the given color map
  function resolveColorRef(value: string, colors: Map<string, string>, depth = 0): string {
    if (depth > 10) return value; // prevent infinite recursion
    return value.replace(/@([a-z][a-z0-9]*(?:_[a-z0-9]+)*)/g, (_m, name: string) => {
      const resolved = colors.get(name);
      if (resolved) return resolveColorRef(resolved, colors, depth + 1);
      return `var(--${name.replace(/_/g, "-")})`;
    });
  }

  // Pass 2: Strip @define-color lines and resolve @name references.
  const output: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();

    // Strip @define-color lines
    if (trimmed.startsWith("@define-color ")) {
      continue;
    }

    // Handle @define-color inside @media blocks
    if (trimmed.includes("@define-color ")) {
      const cleaned = line.replace(/@define-color\s+\S+\s+[^;]+;\s*/g, "");
      const inner = cleaned.replace(/@media\s*\([^)]+\)\s*\{\s*\}/, "").trim();
      if (inner === "" || inner === "}" || cleaned.trim() === "}") {
        if (cleaned.trim() === "}") {
          output.push(cleaned);
        }
        continue;
      }
      output.push(cleaned);
      continue;
    }

    output.push(line);
  }

  let result = output.join("\n");

  // Convert remaining GTK @color_name references to resolved values.
  // Uses light colors as default since they appear at the top level.
  // Must NOT match @media, @keyframes, @import, etc. — those have no underscores.
  result = result.replace(/@([a-z][a-z0-9]*(?:_[a-z0-9]+)+)/g, (_match, name: string) => {
    const defined = lightColors.get(name);
    if (defined) {
      return resolveColorRef(defined, lightColors);
    }
    return `var(--${name.replace(/_/g, "-")})`;
  });

  // Collect per-scheme color variable differences
  const darkOverrides: string[] = [];
  for (const [name, darkVal] of darkColors) {
    const lightVal = lightColors.get(name);
    const resolvedDark = resolveColorRef(darkVal, darkColors);
    const resolvedLight = lightVal ? resolveColorRef(lightVal, lightColors) : null;
    if (resolvedDark !== resolvedLight) {
      darkOverrides.push(`    --${name.replace(/_/g, "-")}: ${resolvedDark};`);
    }
  }

  if (scheme === "dark") {
    // Dark-only output: rewrite base :root variables to dark values, emit nothing else
    if (darkOverrides.length > 0) {
      result += `\n:root {\n${darkOverrides.join("\n")}\n}\n`;
    }
  } else if (scheme === "light") {
    // Light-only output: no dark overrides at all — light values are already the base
  } else {
    // Default: emit both @media and [data-color-scheme] overrides (auto behavior)
    if (darkOverrides.length > 0) {
      result += `\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkOverrides.join("\n")}\n  }\n}\n`;
      result += `\n[data-gtk-provider][data-color-scheme="dark"] {\n${darkOverrides.join("\n")}\n}\n`;
    }

    const lightOverrides = [...lightColors.entries()]
      .filter(([name]) => darkColors.has(name))
      .map(
        ([name, val]) => `  --${name.replace(/_/g, "-")}: ${resolveColorRef(val, lightColors)};`,
      );
    if (lightOverrides.length > 0) {
      result += `\n[data-gtk-provider][data-color-scheme="light"] {\n${lightOverrides.join("\n")}\n}\n`;
    }
  }

  return result;
}

/**
 * Builds a regex that matches bare GTK selectors as whole words in a CSS selector string.
 * Matches `button` but not `.button` or `#button` or `-button`.
 */
function buildSelectorRegex(): RegExp {
  // Sort by length descending so longer names match first (e.g. "toggle-group" before "toggle")
  const names = Object.keys(ALL_SELECTORS).sort((a, b) => b.length - a.length);
  // Match bare names that are:
  // - At the start of the selector, or preceded by whitespace, >, +, ~, or comma
  // - NOT preceded by . # - or another letter (which would mean it's a class, id, or part of another word)
  const pattern = names.map((n) => n.replace(/-/g, "\\-")).join("|");
  return new RegExp(`(?<![.#\\w-])(${pattern})(?=[.#:\\[\\s>,+~){]|$)`, "g");
}

const selectorRegex = buildSelectorRegex();

/**
 * PostCSS plugin: Remap bare GTK widget selectors to .gtk-* class selectors.
 */
const remapSelectors: Plugin = {
  postcssPlugin: "gtk-remap-selectors",
  Rule(rule) {
    const original = rule.selector;
    const remapped = original.replace(selectorRegex, (match) => {
      return ALL_SELECTORS[match] ?? match;
    });
    if (remapped !== original) {
      rule.selector = remapped;
    }
  },
};

/**
 * PostCSS plugin: Remap GTK-specific pseudo-classes to data attributes.
 */
const remapPseudoClasses: Plugin = {
  postcssPlugin: "gtk-remap-pseudo-classes",
  Rule(rule) {
    let sel = rule.selector;

    // :backdrop → window-level propagating state.
    // In upstream GTK, GTK_STATE_FLAG_BACKDROP propagates to ALL descendants
    // (via GTK_STATE_FLAGS_DO_SET_PROPAGATE in gtkwidget.c:488-489).
    // So ".gtk-headerbar:backdrop" means "headerbar in an unfocused window".
    // We set [data-backdrop] only on the .gtk-window element and rewrite
    // selectors to use ancestor matching for descendants.
    sel = sel
      .split(",")
      .map((s) => {
        s = s.trim();
        if (!s.includes(":backdrop")) return s;
        if (/\.gtk-window[\w.-]*:backdrop/.test(s)) {
          // Selector targets the window itself — apply attribute directly
          return s.replace(/:backdrop/g, "[data-backdrop]");
        }
        // Selector targets a descendant — prepend window ancestor
        return `.gtk-window[data-backdrop] ${s.replace(/:backdrop/g, "")}`;
      })
      .join(", ");

    // :drop(active) → [data-drop-active]
    sel = sel.replace(/:drop\(active\)/g, "[data-drop-active]");

    // :selected → [aria-selected="true"]
    sel = sel.replace(/:selected/g, '[aria-selected="true"]');

    // :checked → [data-checked] (GTK uses checked state for toggles/spinners)
    sel = sel.replace(/:checked/g, "[data-checked]");

    // :indeterminate → [data-indeterminate] (web <span> never matches native :indeterminate)
    sel = sel.replace(/:indeterminate/g, "[data-indeterminate]");

    // :visited → [data-visited] (browsers restrict :visited styling; use data attribute)
    sel = sel.replace(/:visited/g, "[data-visited]");

    // :disabled → [data-disabled] (<span> doesn't support :disabled natively)
    sel = sel.replace(/:disabled/g, "[data-disabled]");

    if (sel !== rule.selector) {
      rule.selector = sel;
    }
  },
};

/**
 * PostCSS plugin: Handle -gtk-* vendor properties.
 */
const handleGtkProperties: Plugin = {
  postcssPlugin: "gtk-handle-properties",
  Declaration(decl) {
    // Strip GTK3-style uppercase widget properties: -GtkWidget-*, -GtkDialog-*, etc.
    if (/^-Gtk[A-Z]/.test(decl.prop)) {
      decl.remove();
      return;
    }

    if (!decl.prop.startsWith("-gtk-")) return;

    switch (decl.prop) {
      case "-gtk-icon-transform":
        // -gtk-icon-transform → transform (just strip the -gtk- prefix)
        decl.prop = "transform";
        break;

      case "-gtk-icon-shadow":
        // -gtk-icon-shadow → filter: drop-shadow(...)
        decl.prop = "filter";
        decl.value = decl.value
          .split(",")
          .map((shadow) => `drop-shadow(${shadow.trim()})`)
          .join(" ");
        break;

      case "-gtk-icon-size":
        // Convert to a CSS custom property that components can read
        decl.prop = "--gtk-icon-size";
        break;

      case "-gtk-icon-palette":
      case "-gtk-icon-source":
      case "-gtk-icon-style":
      case "-gtk-icon-filter":
      case "-gtk-icon-weight":
      case "-gtk-dpi":
      case "-gtk-secondary-caret-color":
        // Remove — handled by React components or not applicable on web
        decl.remove();
        break;

      default:
        // Unknown -gtk- property — convert to CSS custom property as fallback
        decl.prop = `--${decl.prop.slice(1)}`;
        break;
    }
  },
};

/**
 * PostCSS plugin: Replace CSS image() function with linear-gradient() fallback.
 * image(color) → linear-gradient(color, color)
 */
/**
 * Extract the content of a balanced parenthesized expression starting at `start`.
 * `start` should point to the opening `(`. Returns the content between parens
 * and the index after the closing `)`.
 */
function extractBalancedParens(
  str: string,
  start: number,
): { content: string; end: number } | null {
  if (str[start] !== "(") return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === "(") depth++;
    if (str[i] === ")") depth--;
    if (depth === 0) {
      return { content: str.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

/**
 * Split a string by commas, respecting nested parentheses.
 * e.g. "rgba(0, 0, 0, 0.87), 0.15" → ["rgba(0, 0, 0, 0.87)", "0.15"]
 */
function splitArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    if (s[i] === ")") depth--;
    if (s[i] === "," && depth === 0) {
      args.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(s.slice(start).trim());
  return args;
}

/** Parse a hex color (#RGB, #RRGGBB, #RRGGBBAA) to [r, g, b] or null. */
function parseHex(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-fA-F]+)$/);
  if (!m) return null;
  const h = m[1]!;
  if (h.length === 3) {
    return [parseInt(h[0]! + h[0]!, 16), parseInt(h[1]! + h[1]!, 16), parseInt(h[2]! + h[2]!, 16)];
  }
  if (h.length === 6 || h.length === 8) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

/** Named CSS colors used in GTK themes. */
const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  transparent: [0, 0, 0],
};

/** Try to resolve a color string to RGB. Returns null for dynamic values. */
function resolveRGB(color: string): [number, number, number] | null {
  const lower = color.toLowerCase();
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower]!;
  return parseHex(color);
}

/**
 * Convert a GTK alpha(color, opacity) call to web CSS.
 * - alpha(#hex, 0.5)       → rgba(r, g, b, 0.5)
 * - alpha(currentColor, 0.5) → color-mix(in srgb, currentColor 50%, transparent)
 * - alpha(color)            → color (single-arg form is identity in GTK)
 */
function convertAlpha(content: string): string {
  const args = splitArgs(content);
  if (args.length === 1) return args[0]!; // single-arg: identity
  if (args.length !== 2) {
    throw new Error(`gtk-css: unexpected alpha() arguments: alpha(${content})`);
  }

  const color = args[0]!;
  const opacity = args[1]!;
  const opacityNum = parseFloat(opacity);

  // Special case: named color "transparent"
  if (color.toLowerCase() === "transparent") return "transparent";

  const rgb = resolveRGB(color);
  if (rgb) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
  }

  // Dynamic color (currentColor, var(), rgba(), etc.)
  const pct = isNaN(opacityNum) ? opacity : `${Math.round(opacityNum * 100)}%`;
  return `color-mix(in srgb, ${color} ${pct}, transparent)`;
}

/**
 * Convert a GTK mix(color1, color2, factor) call to web CSS.
 * GTK: mix(c1, c2, f) = f of c2 blended into c1.
 * Web: color-mix(in srgb, c2 <f*100>%, c1)
 */
function convertMix(content: string): string {
  const args = splitArgs(content);
  if (args.length !== 3) {
    throw new Error(`gtk-css: unexpected mix() arguments: mix(${content})`);
  }

  const color1 = args[0]!;
  const color2 = args[1]!;
  const factor = args[2]!;

  // Special case: mixing with transparent preserves transparency
  if (color1.toLowerCase() === "transparent" && color2.toLowerCase() === "transparent") {
    return "transparent";
  }

  const factorNum = parseFloat(factor);
  const pct = isNaN(factorNum) ? factor : `${Math.round(factorNum * 100)}%`;
  return `color-mix(in srgb, ${color2} ${pct}, ${color1})`;
}

/**
 * Convert a GTK shade(color, factor) call to web CSS.
 * factor > 1 = lighten (multiply RGB channels), factor < 1 = darken.
 * For hex colors: pre-compute. For dynamic colors: approximate with color-mix.
 */
function convertShade(content: string): string {
  const args = splitArgs(content);
  if (args.length !== 2) {
    throw new Error(`gtk-css: unexpected shade() arguments: shade(${content})`);
  }

  const color = args[0]!;
  const factor = parseFloat(args[1]!);
  if (isNaN(factor)) {
    throw new Error(`gtk-css: non-numeric shade() factor: shade(${content})`);
  }

  // Special case: transparent is rgba(0,0,0,0) — shading it still produces transparent
  if (color.toLowerCase() === "transparent") return "transparent";

  const rgb = resolveRGB(color);
  if (rgb) {
    // Pre-compute: multiply each channel by factor, clamp to 0-255
    const r = Math.min(255, Math.max(0, Math.round(rgb[0] * factor)));
    const g = Math.min(255, Math.max(0, Math.round(rgb[1] * factor)));
    const b = Math.min(255, Math.max(0, Math.round(rgb[2] * factor)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Dynamic color: approximate with color-mix (uses srgb; fixColorMixGamut converts to oklab later)
  if (factor >= 1) {
    // Lighten: mix with white. shade(c, 1.2) ≈ 20% toward white
    const pct = Math.round((1 - 1 / factor) * 100);
    return `color-mix(in srgb, ${color}, white ${pct}%)`;
  }
  // Darken: mix with black. shade(c, 0.8) ≈ 20% toward black
  const pct = Math.round((1 - factor) * 100);
  return `color-mix(in srgb, ${color}, black ${pct}%)`;
}

/**
 * Replace all occurrences of a GTK color function in a CSS value string.
 * Uses balanced-paren matching so nested functions (e.g. alpha(rgba(...), 0.5)) work.
 */
function replaceColorFunction(
  val: string,
  funcName: string,
  converter: (content: string) => string,
): string {
  let result = "";
  let i = 0;
  const needle = funcName + "(";
  const needleLen = needle.length;

  while (i < val.length) {
    const match = val.indexOf(needle, i);
    if (match === -1) {
      result += val.slice(i);
      break;
    }

    // Guard: must not be preceded by a letter or hyphen (part of another function name)
    if (match > 0 && /[a-z-]/i.test(val[match - 1]!)) {
      result += val.slice(i, match + needleLen);
      i = match + needleLen;
      continue;
    }

    // Extract balanced parens
    const parenStart = match + funcName.length;
    const parens = extractBalancedParens(val, parenStart);
    if (!parens) {
      result += val.slice(i, match + needleLen);
      i = match + needleLen;
      continue;
    }

    result += val.slice(i, match);
    result += converter(parens.content);
    i = parens.end;
  }

  return result;
}

/**
 * PostCSS plugin: Convert GTK-specific color functions to web CSS equivalents.
 * - alpha(color, opacity) → rgba() or color-mix()
 * - mix(color1, color2, factor) → color-mix()
 * - shade(color, factor) → pre-computed rgb() or color-mix()
 *
 * Must run BEFORE fixColorMixGamut (which converts color-mix srgb→oklab).
 */
const convertGtkColorFunctions: Plugin = {
  postcssPlugin: "gtk-convert-color-functions",
  Declaration(decl) {
    const val = decl.value;
    if (!val.includes("alpha(") && !val.includes("mix(") && !val.includes("shade(")) return;

    let result = val;
    if (result.includes("alpha(")) result = replaceColorFunction(result, "alpha", convertAlpha);
    if (result.includes("shade(")) result = replaceColorFunction(result, "shade", convertShade);
    if (result.includes("mix(")) result = replaceColorFunction(result, "mix", convertMix);

    if (result !== val) {
      decl.value = result;
    }
  },
};

const replaceImageFunction: Plugin = {
  postcssPlugin: "gtk-replace-image-function",
  Declaration(decl) {
    if (!decl.value.includes("image(")) return;

    // GTK's image(color) creates a solid-color image layer.
    // Convert to linear-gradient(color, color) which is the web equivalent.
    // This preserves layering behavior: background-image layers ON TOP of
    // background-color, so hover overlays work correctly.
    const result = replaceColorFunction(
      decl.value,
      "image",
      (content) => `linear-gradient(${content}, ${content})`,
    );
    if (result !== decl.value) {
      decl.value = result;
    }
  },
};

/**
 * PostCSS plugin: Fix transition properties that reference -gtk-icon-transform.
 */
const fixGtkTransitionRefs: Plugin = {
  postcssPlugin: "gtk-fix-transition-refs",
  Declaration(decl) {
    if (decl.prop.startsWith("transition") && decl.value.includes("-gtk-icon-transform")) {
      decl.value = decl.value.replace(/-gtk-icon-transform/g, "transform");
    }
  },
};

/**
 * PostCSS plugin: Remove -gtk-recolor() function references.
 */
const removeGtkRecolor: Plugin = {
  postcssPlugin: "gtk-remove-recolor",
  Declaration(decl) {
    if (decl.value.includes("-gtk-recolor(") || decl.value.includes("-gtk-icontheme(")) {
      decl.remove();
    }
  },
};

/**
 * PostCSS plugin: Remove -gtk-scaled() declarations (not resolvable at runtime).
 * Asset embedding is handled at build time in compile.ts via makeGtkAssetPlugin.
 */
const removeGtkAssetFunctions: Plugin = {
  postcssPlugin: "gtk-remove-asset-functions",
  Declaration(decl) {
    if (decl.value.includes("-gtk-scaled(")) {
      decl.remove();
    }
  },
};

/**
 * PostCSS plugin: Rewrite color-mix(in srgb, ...) to color-mix(in oklab, ...).
 *
 * GTK's CSS engine does NOT apply gamut mapping when converting colors to sRGB
 * for color-mix interpolation:
 *   https://gitlab.gnome.org/GNOME/gtk/-/blob/5957885ec/gtk/gtkcsscolor.c#L659
 *   (FIXME comment: "Gamut mapping goes here")
 *
 * Browsers per CSS spec DO gamut-map, which clamps out-of-sRGB-gamut values
 * (e.g. negative green from oklab-derived destructive colors). This produces
 * visibly different results for wide-gamut colors like the destructive red.
 *
 * Switching the interpolation space to oklab avoids the issue: oklab values are
 * always in-gamut, so no gamut mapping is triggered, matching GTK's behavior.
 */
const COLOR_MIX_SRGB_RE = /color-mix\(in srgb\b/g;
const fixColorMixGamut: Plugin = {
  postcssPlugin: "gtk-fix-color-mix-gamut",
  Declaration(decl) {
    if (decl.value.includes("color-mix(in srgb")) {
      decl.value = decl.value.replace(COLOR_MIX_SRGB_RE, "color-mix(in oklab");
    }
  },
};

/**
 * PostCSS plugin: Convert .gtk-switch padding to transparent border.
 *
 * In native GTK, padding on the switch reduces the child allocation — the slider
 * knob is inset from the track edge. With CSS absolute positioning (used in
 * layout.css), the containing block is the padding edge (inside border, outside
 * padding), so padding does NOT shrink the space for absolutely-positioned children.
 *
 * Border DOES shrink it: the containing block for position:absolute is the
 * padding edge, which is inside the border. So converting padding to transparent
 * border achieves the same visual inset while correctly constraining the slider.
 */
const fixSwitchPadding: Plugin = {
  postcssPlugin: "gtk-fix-switch-padding",
  Declaration(decl) {
    if (decl.prop !== "padding") return;
    if (!decl.parent || decl.parent.type !== "rule") return;
    const rule = decl.parent;
    if (!rule.selector.includes(".gtk-switch")) return;
    if (rule.selector.includes(">")) return;

    // Replace padding with transparent border of the same width
    decl.prop = "border";
    decl.value = `${decl.value} solid transparent`;
  },
};

/**
 * The complete GTK → web CSS PostCSS transformation pipeline.
 * Pass a custom asset plugin to replace -gtk-scaled() with embedded data URIs.
 */
export function buildGtkToWeb(assetPlugin?: Plugin) {
  return postcss([
    remapSelectors,
    remapPseudoClasses,
    handleGtkProperties,
    fixGtkTransitionRefs,
    convertGtkColorFunctions,
    replaceImageFunction,
    fixColorMixGamut,
    removeGtkRecolor,
    assetPlugin ?? removeGtkAssetFunctions,
    fixSwitchPadding,
  ]);
}

/** Default pipeline — removes -gtk-scaled() declarations. */
export const gtkToWeb = buildGtkToWeb();
