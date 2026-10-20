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
 * A GTK node name as a selector with the specificity of a type selector:
 * `row` → `:where(.gtk-row):not(_)`.
 *
 * GTK counts node names like CSS type selectors (gtk_css_selector_compare()),
 * so `row.entry.focused` (two classes) beats `list.boxed-list > row` (one).
 * As plain classes both would weigh three classes and the later rule would win,
 * hiding an entry row's focus ring inside a boxed list. `:where()` drops the
 * class's weight and `:not(_)`, which every element matches, adds a type
 * selector's. Browsers still index the rule by the class.
 */
export function gtkNodeSelector(cls: string): string {
  return `:where(${cls}):not(_)`;
}

/**
 * PostCSS plugin: Remap bare GTK widget selectors to .gtk-* class selectors,
 * weighted like the type selectors they are in GTK (see gtkNodeSelector()).
 */
const remapSelectors: Plugin = {
  postcssPlugin: "gtk-remap-selectors",
  Rule(rule) {
    const original = rule.selector;
    const remapped = original.replace(selectorRegex, (match) => {
      const cls = ALL_SELECTORS[match];
      return cls ? gtkNodeSelector(cls) : match;
    });
    if (remapped !== original) {
      rule.selector = remapped;
    }
  },
};

/**
 * PostCSS plugin: GTK's `selection` node → the ::selection pseudo-element.
 *
 * GtkText and GtkLabel draw selected text through a `selection` child node
 * that takes their state (gtk_text_state_flags_changed()), so
 * `selection:focus-within` is the selection of a focused text. Pseudo-classes
 * can't follow ::selection, so the state moves to the element holding the
 * text: `text > selection:focus-within` → `text:focus-within::selection`.
 *
 * GTK draws the selection over the text, then the text again in the
 * selection's color: a transparent color leaves the text as it is. Browsers
 * draw the text over the selection in that color, so transparent would hide
 * it; it's dropped.
 */
const remapSelectionNode: Plugin = {
  postcssPlugin: "gtk-remap-selection-node",
  Rule(rule) {
    const mapped = rule.selectors.map(selectionPseudoElement);
    if (mapped.every((m) => !m)) return;
    const others = rule.selectors.filter((_, i) => !mapped[i]);
    if (others.length > 0) rule.cloneBefore({ selectors: others });
    rule.selectors = mapped.flatMap((m) => m ?? []);
    rule.each((node) => {
      if (node.type === "decl" && node.prop === "color" && node.value === "transparent") {
        node.remove();
      }
    });
  },
};

/** `text > selection:focus` → `text:focus::selection`; null for other selectors. */
function selectionPseudoElement(selector: string): string[] | null {
  const start = lastCompoundStart(selector);
  const compound = selector.slice(start);
  if (!/^selection(?![\w-])/.test(compound)) return null;
  const state = compound.slice("selection".length);
  const parent = selector.slice(0, start).trimEnd();
  // The node is a child of the text...
  if (!parent) return [`${state}::selection`];
  if (parent.endsWith(">")) return [`${parent.slice(0, -1).trimEnd()}${state}::selection`];
  if (/[+~]$/.test(parent)) return null;
  // ...which is the ancestor, or a descendant of it.
  return [`${parent}${state}::selection`, `${parent} *${state}::selection`];
}

/**
 * PostCSS plugin: Remap GTK-specific pseudo-classes to data attributes.
 */
const remapPseudoClasses: Plugin = {
  postcssPlugin: "gtk-remap-pseudo-classes",
  Rule(rule) {
    let sel = rule.selector;

    // :backdrop → [data-backdrop]
    sel = sel.replace(/:backdrop/g, "[data-backdrop]");

    // :drop(active) → [data-drop-active]
    sel = sel.replace(/:drop\(active\)/g, "[data-drop-active]");

    // :selected → [aria-selected="true"], or [data-selected] where ARIA has no
    // selected state (a menu's active item, GtkModelButton)
    sel = sel.replace(/:selected/g, ':is([aria-selected="true"], [data-selected])');

    // :checked → [data-checked] (GTK uses checked state for toggles/spinners)
    sel = sel.replace(/:checked/g, "[data-checked]");

    // :indeterminate → [data-indeterminate] (web <span> never matches native :indeterminate)
    sel = sel.replace(/:indeterminate/g, "[data-indeterminate]");

    // :visited → [data-visited] (browsers restrict :visited styling; use data attribute)
    sel = sel.replace(/:visited/g, "[data-visited]");

    // :active → also [data-active]: browsers only make an element active while
    // it or a descendant is pressed, and GTK also sets the state itself (an
    // AdwSplitButton while one of its buttons is keyboard-activating).
    // (Idempotent, like :disabled below.)
    sel = sel.replace(/(?<!:is\():active(?![\w-])/g, ":is(:active, [data-active])");

    // :disabled → also [data-disabled]: widgets rendered as <span>/<div> can't
    // be :disabled, while real <button>/<input> elements are (and carry no
    // data attribute), so match either.
    // (Idempotent: PostCSS revisits rules whose selector changed.)
    sel = sel.replace(/(?<!\[data-disabled\], ):disabled/g, ":is([data-disabled], :disabled)");

    if (sel !== rule.selector) {
      rule.selector = sel;
    }
  },
};

/**
 * PostCSS plugin: A check button's check or radio is hovered and pressed with
 * the button.
 *
 * gtk_check_button_state_flags_changed() gives the indicator all of the check
 * button's state flags, so it shows :hover and :active while the pointer is
 * anywhere on the button, its label included. The indicator carries the
 * button's :checked, :indeterminate and :disabled itself; the pointer's states
 * also match through its parent. `:is()` keeps the selector's specificity.
 */
const INDICATOR_RE = /^:where\(\.gtk-(?:check|radio)\):not\(_\)/;
const POINTER_STATE_RE = /:(hover|active)(?![\w-])/g;
const mirrorIndicatorState: Plugin = {
  postcssPlugin: "gtk-mirror-indicator-state",
  Rule(rule) {
    const selectors = rule.selectors.map((selector) => {
      const start = lastCompoundStart(selector);
      const subject = selector.slice(start);
      // (Idempotent: PostCSS revisits rules whose selector changed.)
      if (!INDICATOR_RE.test(subject) || subject.includes(".gtk-checkbutton:")) return selector;
      const mirrored = subject.replace(
        POINTER_STATE_RE,
        (_, state: string) => `:is(:${state}, :where(.gtk-checkbutton:${state} > *))`,
      );
      return selector.slice(0, start) + mirrored;
    });
    if (selectors.some((s, i) => s !== rule.selectors[i])) rule.selectors = selectors;
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

    // border-spacing is how GTK themes set a box's spacing: GtkBoxLayout,
    // GtkCenterLayout and GtkGridLayout add it to their spacing (x between
    // columns, y between rows). On the web it only affects tables, so turn it
    // into custom properties the layout classes read (see layout.css).
    if (decl.prop === "border-spacing") {
      const [x = "0", y = x] = postcss.list.space(decl.value);
      decl.cloneBefore({ prop: "--gtk-border-spacing-x", value: x });
      decl.cloneBefore({ prop: "--gtk-border-spacing-y", value: y });
      decl.remove();
      return;
    }

    // `initial` fonts are GtkSettings:gtk-font-name in GTK (e.g. popovers use
    // `font: initial`), not the browser's initial (serif, 16px) font. The
    // provider root defines --gtk-font-family / --gtk-font-size. GTK's `font`
    // shorthand covers family, style, variant-caps, weight, stretch and size
    // (gtkcssshorthandpropertyimpl.c), not line-height.
    if (/^font(-family|-size)?$/.test(decl.prop) && decl.value.trim() === "initial") {
      if (decl.prop !== "font-size") {
        decl.cloneBefore({
          prop: "font-family",
          value: "var(--gtk-font-family, Cantarell, sans-serif)",
        });
      }
      if (decl.prop !== "font-family") {
        decl.cloneBefore({ prop: "font-size", value: "var(--gtk-font-size, 11pt)" });
      }
      if (decl.prop === "font") {
        for (const prop of ["font-style", "font-variant-caps", "font-weight", "font-stretch"]) {
          decl.cloneBefore({ prop, value: "normal" });
        }
      }
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

      case "-gtk-icon-source": {
        // A theme's own symbolic image, recolored to the node's color, like a
        // check's mark: kept for layout.css to paint (see --gtk-icon-source
        // there). Icon theme icons, -gtk-icontheme(), come from the
        // components' icon set instead.
        const url = recoloredImageUrl(decl.value);
        if (url || decl.value.trim() === "none") {
          decl.prop = "--gtk-icon-source";
          decl.value = url ?? "none";
        } else {
          decl.remove();
        }
        break;
      }

      case "-gtk-icon-palette":
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

/** The url() of `-gtk-recolor(url(…))`, a symbolic image in the node's colors; null otherwise. */
function recoloredImageUrl(value: string): string | null {
  return value.trim().match(/^-gtk-recolor\(\s*(url\([^()]*\))\s*\)$/)?.[1] ?? null;
}

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

/**
 * A solid-color background-image overlay, as layers that can transition.
 *
 * GTK cross-fades `background-image: image(color)` overlays (a button's hover
 * and pressed tints) over the widget's `background` transition: the old image
 * fades out as the new one fades in. Browsers can't interpolate images, so the
 * overlay would snap. It's drawn as two gradient layers of registered
 * properties instead, which transition: a color (`--gtk-background-overlay`),
 * and the widget's currentColor at an opacity (`--gtk-background-tint`), the
 * usual alpha(currentColor, …) overlay. Fading a percentage keeps that layer
 * on the widget's actual color, an app's included; a registered color can't
 * transition to a mix of currentColor. Between two overlays, one layer fades
 * out while the other fades in, like GTK's cross-fade.
 */
const OVERLAY = "--gtk-background-overlay";
const TINT = "--gtk-background-tint";
const TINT_COLOR = `color-mix(in oklab, currentColor var(${TINT}), transparent)`;
const OVERLAY_IMAGE = `linear-gradient(var(${OVERLAY}), var(${OVERLAY})), linear-gradient(${TINT_COLOR}, ${TINT_COLOR})`;

/** The opacity of an overlay that is currentColor at an opacity, like `10%`. */
function currentColorTint(color: string): string | null {
  return (
    color.match(/^color-mix\(in [\w-]+, currentcolor (\d+(?:\.\d+)?%), transparent\)$/i)?.[1] ??
    null
  );
}

/** The color of a `background-image` that is exactly one `image(color)`. */
function singleImageColor(value: string): string | null {
  const v = value.trim();
  if (!v.startsWith("image(")) return null;
  const parens = extractBalancedParens(v, "image".length);
  if (!parens || parens.end !== v.length) return null;
  const args = splitArgs(parens.content);
  return args.length === 1 && args[0] ? args[0] : null;
}

const replaceImageFunction: Plugin = {
  postcssPlugin: "gtk-replace-image-function",
  Declaration(decl) {
    if (!decl.value.includes("image(")) return;

    const overlay = decl.prop === "background-image" ? singleImageColor(decl.value) : null;
    if (overlay) {
      // resolveCurrentColor moves a currentColor overlay to the tint layer.
      decl.cloneBefore({ prop: OVERLAY, value: overlay });
      decl.cloneBefore({ prop: TINT, value: "0%" });
      decl.value = OVERLAY_IMAGE;
      return;
    }

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
 * PostCSS plugin: Fade background-image overlays like GTK (see OVERLAY).
 *
 * Wherever `background` (or all) transitions, the overlay's color and tint
 * transition the same way. Those widgets also keep the overlay gradients,
 * transparent, as a zero-specificity default, so they fade out again instead
 * of vanishing when the state that set them ends; any rule setting a
 * background-image wins.
 */
const TRANSITIONED_OVERLAY_RE = /^(background|background-image|all)$/;
const transitionBackgroundOverlay: Plugin = {
  postcssPlugin: "gtk-transition-background-overlay",
  prepare() {
    const selectors = new Set<string>();
    return {
      Declaration(decl) {
        if (!decl.prop.startsWith("transition") || decl.value.includes(OVERLAY)) return;
        const entries = splitArgs(decl.value);
        if (decl.prop === "transition") {
          const entry = entries.find((e) => TRANSITIONED_OVERLAY_RE.test(e.split(/\s+/)[0] ?? ""));
          if (!entry) return;
          decl.value = `${decl.value}, ${entry.replace(/^\S+/, OVERLAY)}, ${entry.replace(/^\S+/, TINT)}`;
        } else if (decl.prop === "transition-property") {
          if (!entries.some((e) => TRANSITIONED_OVERLAY_RE.test(e))) return;
          decl.value = `${decl.value}, ${OVERLAY}, ${TINT}`;
        } else {
          return;
        }
        if (decl.parent?.type !== "rule") return;
        for (const selector of (decl.parent as postcss.Rule).selectors) {
          if (!selector.includes("::")) selectors.add(selector);
        }
      },
      OnceExit(root) {
        if (!selectors.size) return;
        root.prepend(
          postcss.atRule({
            name: "property",
            params: OVERLAY,
            nodes: [
              postcss.decl({ prop: "syntax", value: '"<color>"' }),
              postcss.decl({ prop: "inherits", value: "false" }),
              postcss.decl({ prop: "initial-value", value: "transparent" }),
            ],
          }),
          postcss.atRule({
            name: "property",
            params: TINT,
            nodes: [
              postcss.decl({ prop: "syntax", value: '"<percentage>"' }),
              postcss.decl({ prop: "inherits", value: "false" }),
              postcss.decl({ prop: "initial-value", value: "0%" }),
            ],
          }),
          postcss.rule({
            selector: `:where(${[...selectors].join(", ")})`,
            nodes: [postcss.decl({ prop: "background-image", value: OVERLAY_IMAGE })],
          }),
        );
      },
    };
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
 * PostCSS plugin: Resolve currentColor like GTK, so transitions start from the
 * color the widget had.
 *
 * GTK resolves currentcolor to the widget's color before it transitions a
 * value (gtk_css_value_resolve(), gtkcssstyle.c), so a switch going from
 * `color-mix(currentColor 15%)` to the accent color starts from the gray track
 * it showed. Browsers keep currentColor unresolved in the computed value and
 * resolve it against the element's *new* color. When the same state change
 * also sets `color` (switch:checked, check:checked, button.osd:hover, …), the
 * transition jumps to the new color's mix first: a checked switch's track
 * blinks white for a frame.
 *
 * Every `color` declaration also sets `--gtk-current-color` to the same value.
 * On widgets whose own color changes with their state (a selector setting
 * `color` with a state pseudo-class on the widget itself, like switch:checked), other
 * properties, overlays included, read currentColor through it. A custom
 * property holding a concrete color is substituted at computed-value time, so
 * the transition starts from the old value. Where the theme's color itself
 * depends on currentColor, the property is left invalid and the fallback,
 * currentColor, applies as before.
 *
 * Everywhere else currentColor stays as it is, and follows a color set by app
 * CSS; an alpha(currentColor, …) overlay moves to the tint layer (see
 * OVERLAY). The property holds the theme's color, and plain CSS doesn't update
 * it: app CSS that changes the color of a widget whose color changes with its
 * state should set `--gtk-current-color` to the same color (CSS run through
 * gtkToWeb does). CSS can't otherwise start a transition from the old color.
 */
const CURRENT_COLOR_RE = /\bcurrentcolor\b/i;
const CURRENT_COLOR_ALL_RE = /\bcurrentcolor\b/gi;
const CURRENT_COLOR_VAR = "var(--gtk-current-color, currentColor)";
/** GTK's state pseudo-classes (gtkcssselector.c), unlike :not() or :first-child. */
const STATE_RE =
  /:(active|backdrop|checked|disabled|drop|focus|focus-visible|focus-within|hover|indeterminate|link|selected|visited)\b/;
const resolveCurrentColor: Plugin = {
  postcssPlugin: "gtk-resolve-current-color",
  prepare() {
    const stateColored = new WeakSet<postcss.Container>();
    return {
      // Before the selectors are remapped: GTK selectors are simple to read.
      Once(root) {
        const keys = new Set<string>();
        root.walkDecls("color", (decl) => {
          if (decl.parent?.type !== "rule") return;
          for (const selector of (decl.parent as postcss.Rule).selectors) {
            const subject = lastCompound(selector);
            if (STATE_RE.test(subject)) keys.add(compoundKey(subject));
          }
        });
        root.walkRules((rule) => {
          const colored = rule.selectors.filter((s) => keys.has(compoundKey(lastCompound(s))));
          if (colored.length === 0) return;
          // Only the selectors for such widgets read the property.
          const readsCurrentColor = rule.some(
            (node) =>
              node.type === "decl" && node.prop !== "color" && CURRENT_COLOR_RE.test(node.value),
          );
          if (readsCurrentColor && colored.length < rule.selectors.length) {
            rule.cloneAfter({ selectors: rule.selectors.filter((s) => !colored.includes(s)) });
            rule.selectors = colored;
          }
          stateColored.add(rule);
        });
      },
      Declaration(decl) {
        if (decl.value.includes("--gtk-current-color") || decl.value === OVERLAY_IMAGE) return;
        if (decl.prop.startsWith("--") && decl.prop !== OVERLAY) return;
        const parent = decl.parent;
        const resolved = !!parent && stateColored.has(parent);
        if (decl.prop === OVERLAY) {
          const tint = resolved ? null : currentColorTint(decl.value);
          if (tint) {
            parent?.each((node) => {
              if (node.type === "decl" && node.prop === TINT) node.value = tint;
            });
            decl.value = "transparent";
          } else if (CURRENT_COLOR_RE.test(decl.value)) {
            // A registered color can't transition to a mix of currentColor.
            decl.value = decl.value.replace(CURRENT_COLOR_ALL_RE, CURRENT_COLOR_VAR);
          }
          return;
        }
        if (decl.prop === "color") {
          const next = decl.next();
          if (next?.type === "decl" && next.prop === "--gtk-current-color") return;
          decl.cloneAfter({
            prop: "--gtk-current-color",
            value: CURRENT_COLOR_RE.test(decl.value) ? "initial" : decl.value,
          });
        } else if (resolved && CURRENT_COLOR_RE.test(decl.value)) {
          decl.value = decl.value.replace(CURRENT_COLOR_ALL_RE, CURRENT_COLOR_VAR);
        }
      },
    };
  },
};

/** The compound selector a selector matches, e.g. `switch:checked` in `row > switch:checked`. */
function lastCompound(selector: string): string {
  return selector.slice(lastCompoundStart(selector)).trim();
}

function lastCompoundStart(selector: string): number {
  let depth = 0;
  for (let i = selector.length - 1; i >= 0; i--) {
    const c = selector[i];
    if (c === ")" || c === "]") depth++;
    else if (c === "(" || c === "[") depth--;
    else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~")) return i + 1;
  }
  return 0;
}

/** A compound selector without its pseudo-classes: the widget, whatever its state. */
function compoundKey(compound: string): string {
  let key = "";
  let i = 0;
  while (i < compound.length) {
    if (compound[i] !== ":") {
      key += compound[i++];
      continue;
    }
    i++;
    while (i < compound.length && /[\w:-]/.test(compound[i] ?? "")) i++;
    if (compound[i] === "(") i = extractBalancedParens(compound, i)?.end ?? compound.length;
  }
  return key;
}

/**
 * The complete GTK → web CSS PostCSS transformation pipeline.
 * Pass a custom asset plugin to replace -gtk-scaled() with embedded data URIs.
 */
export function buildGtkToWeb(assetPlugin?: Plugin) {
  return postcss([
    remapSelectors,
    remapSelectionNode,
    remapPseudoClasses,
    mirrorIndicatorState,
    handleGtkProperties,
    fixGtkTransitionRefs,
    convertGtkColorFunctions,
    replaceImageFunction,
    transitionBackgroundOverlay,
    fixColorMixGamut,
    resolveCurrentColor,
    removeGtkRecolor,
    assetPlugin ?? removeGtkAssetFunctions,
  ]);
}

/** Default pipeline — removes -gtk-scaled() declarations. */
export const gtkToWeb = buildGtkToWeb();
