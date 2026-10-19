import type { Browser } from "playwright";
import { expect, test } from "vite-plus/test";
import { debugLog } from "./debug.ts";

const GTK_TEST_TIMEOUT = 30_000;

function isPageClosedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Target page, context or browser has been closed/i.test(error.message);
}

export interface WidgetSnapshot {
  width: number;
  height: number;
  padding: Sides;
  border_radius: Corners;
  background_color: Color | null;
  border_widths: Sides;
  border_colors: SideColors;
  color: Color | null;
  font_family: string | null;
  font_weight: number | null;
  shadows: ShadowInfo[];
  inset_shadows: InsetShadowInfo[];
  opacity: number;
  /** Position of a child's border box in its parent's content box (children only). */
  x?: number;
  y?: number;
  css_name?: string;
  css_classes?: string[];
  children?: WidgetSnapshot[];
}

export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Corners {
  top_left: number;
  top_right: number;
  bottom_right: number;
  bottom_left: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface SideColors {
  top: Color | null;
  right: Color | null;
  bottom: Color | null;
  left: Color | null;
}

interface ShadowInfo {
  color: Color;
  dx: number;
  dy: number;
  spread: number;
  blur_radius: number;
}

interface InsetShadowInfo {
  color: Color;
  dx: number;
  dy: number;
  spread: number;
  blur_radius: number;
}

interface CompareResult {
  failures: { property: string; native: unknown; web: unknown }[];
}

const nativeSnapshotCache = new Map<string, Promise<WidgetSnapshot>>();

function parseColor(value: string): Color | null {
  if (value === "transparent" || value === "rgba(0, 0, 0, 0)") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  // color(srgb r g b / a) — already 0-1 sRGB floats (may include negatives for wide-gamut)
  const srgb = value.match(
    /color\(srgb\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)(?:\s*\/\s*([-\d.e+]+))?\)/,
  );
  if (srgb) {
    return {
      r: parseFloat(srgb[1]),
      g: parseFloat(srgb[2]),
      b: parseFloat(srgb[3]),
      a: srgb[4] != null ? parseFloat(srgb[4]) : 1.0,
    };
  }
  // oklab(L a b / alpha) — convert to sRGB via OKLab→LMS→linear sRGB→gamma sRGB.
  //
  // IMPORTANT: We replicate GTK's exact apply_gamma(), which does NOT special-case
  // negative linear sRGB values — they fall through to the linear 12.92*v branch.
  // The CSS Color 4 spec (and libraries like culori) instead use sign(v)*gamma(|v|)
  // for negatives. Both are valid extensions of the sRGB transfer function to
  // out-of-gamut values, but they produce different results for wide-gamut colors
  // (e.g. destructive red with negative green). We must match GTK since it's our
  // source of truth.
  //
  // GTK apply_gamma (no negative handling):
  //   https://gitlab.gnome.org/GNOME/gtk/-/blob/5957885ec/gtk/gtkcolorutils.c#L340-346
  // GTK oklab→linear sRGB matrices:
  //   https://gitlab.gnome.org/GNOME/gtk/-/blob/5957885ec/gtk/gtkcolorutils.c#L358-376
  // GTK skips gamut mapping entirely (FIXME in source):
  //   https://gitlab.gnome.org/GNOME/gtk/-/blob/5957885ec/gtk/gtkcsscolor.c#L659
  const oklab = value.match(
    /oklab\(([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)(?:\s*\/\s*([-\d.e+]+))?\)/,
  );
  if (oklab) {
    const L = parseFloat(oklab[1]),
      a = parseFloat(oklab[2]),
      b = parseFloat(oklab[3]);
    const alpha = oklab[4] != null ? parseFloat(oklab[4]) : 1.0;
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_,
      m = m_ * m_ * m_,
      s = s_ * s_ * s_;
    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const gamma = (c: number) => (c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c);
    return { r: gamma(lr), g: gamma(lg), b: gamma(lb), a: alpha };
  }
  // rgba(r, g, b, a) or rgb(r, g, b) — 0-255 integers
  const rgba = value.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(",").map((s) => parseFloat(s.trim()));
    return {
      r: parts[0] / 255,
      g: parts[1] / 255,
      b: parts[2] / 255,
      a: parts.length > 3 ? parts[3] : 1.0,
    };
  }
  return null;
}

/**
 * Parse a CSS box-shadow string into separate shadow objects.
 * Format: <color> <dx> <dy> <blur> [spread] [inset], ... (browser computed style order)
 * Native GTK ShadowNode has: color, dx, dy, radius (blur).
 * Native GTK InsetShadowNode has: color, dx, dy, spread, blur_radius.
 */
function parseBoxShadow(value: string): {
  shadows: ShadowInfo[];
  inset_shadows: InsetShadowInfo[];
} {
  const shadows: ShadowInfo[] = [];
  const inset_shadows: InsetShadowInfo[] = [];

  if (!value || value === "none") return { shadows, inset_shadows };

  // Split on commas that are NOT inside parentheses (e.g., rgba(...))
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    // Browsers may place "inset" at start OR end of computed box-shadow value.
    const isInset = /\binset\b/.test(part);
    const cleaned = part.replace(/\binset\b/, "").trim();

    // Extract color — find the last color-like token (rgb/rgba/color/oklab or named color)
    // CSS computed style always gives the color first, then the numbers
    const colorMatch = cleaned.match(/^((?:rgba?\([^)]+\)|color\([^)]+\)|oklab\([^)]+\)))\s+(.*)/);
    if (!colorMatch) continue;

    const color = parseColor(colorMatch[1]);
    if (!color) continue;

    const nums = colorMatch[2].split(/\s+/).map((s) => parseFloat(s));
    const dx = nums[0] || 0;
    const dy = nums[1] || 0;
    const blur = nums[2] || 0;
    const spread = nums[3] || 0;

    if (isInset) {
      inset_shadows.push({ color, dx, dy, spread, blur_radius: blur });
    } else {
      shadows.push({ color, dx, dy, spread, blur_radius: blur });
    }
  }

  return { shadows, inset_shadows };
}

export function getNativeSnapshot(caseName: string): Promise<WidgetSnapshot> {
  const cached = nativeSnapshotCache.get(caseName);
  if (cached) return cached;

  const promise = (async () => {
    debugLog("native", `fetch start case=${caseName} port=${globalThis.__nativeServerPort}`);
    const response = await fetch(
      `http://127.0.0.1:${globalThis.__nativeServerPort}/${encodeURIComponent(caseName)}`,
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Native snapshot failed for ${caseName} (HTTP ${response.status}):\n${body}`);
    }

    debugLog("native", `fetch complete case=${caseName}`);
    return (await response.json()) as WidgetSnapshot;
  })();

  nativeSnapshotCache.set(caseName, promise);
  return promise;
}

export async function extractWebStyles(
  browser: Browser,
  caseName: string,
  childSelector?: string,
): Promise<WidgetSnapshot> {
  const browserName = browser.browserType().name();
  const page = globalThis.__testPages[browserName];
  const rootSelector = `[data-case="${caseName}"] [data-testid='target']`;
  const selector = childSelector ? `${rootSelector} ${childSelector}` : rootSelector;

  try {
    debugLog("web", `read case=${caseName} browser=${browserName}`);
    await page.locator(rootSelector).waitFor({ state: "attached" });
    debugLog("web", `selector ready case=${caseName} browser=${browserName}`);
    interface RawElementData {
      width: number;
      height: number;
      padding: Sides;
      border_radius: Corners;
      background_color: string;
      border_widths: Sides;
      border_colors: { top: string; right: string; bottom: string; left: string };
      color: string;
      font_family: string;
      font_weight: number;
      box_shadow: string;
      opacity: number;
      x?: number;
      y?: number;
      css_classes: string[];
      tag_name: string;
      children: RawElementData[];
    }

    const raw: RawElementData = await page.locator(selector).evaluate((el: HTMLElement) => {
      function extractElement(
        element: HTMLElement,
        origin?: { x: number; y: number },
      ): RawElementData {
        const cs = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        // Children are placed relative to this element's content box, like
        // GTK widget coordinates.
        const content = {
          x: rect.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
          y: rect.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop),
        };
        const children: RawElementData[] = [];
        for (const child of element.children) {
          // Like the native side, which only snapshots visible widgets.
          if (child instanceof HTMLElement && getComputedStyle(child).display !== "none") {
            children.push(extractElement(child, content));
          }
        }
        return {
          x: origin && rect.left - origin.x,
          y: origin && rect.top - origin.y,
          width: rect.width,
          height: rect.height,
          padding: {
            top: parseFloat(cs.paddingTop),
            right: parseFloat(cs.paddingRight),
            bottom: parseFloat(cs.paddingBottom),
            left: parseFloat(cs.paddingLeft),
          },
          border_radius: {
            top_left: parseFloat(cs.borderTopLeftRadius),
            top_right: parseFloat(cs.borderTopRightRadius),
            bottom_right: parseFloat(cs.borderBottomRightRadius),
            bottom_left: parseFloat(cs.borderBottomLeftRadius),
          },
          background_color: cs.backgroundColor,
          border_widths: {
            top: parseFloat(cs.borderTopWidth),
            right: parseFloat(cs.borderRightWidth),
            bottom: parseFloat(cs.borderBottomWidth),
            left: parseFloat(cs.borderLeftWidth),
          },
          border_colors: {
            top: cs.borderTopColor,
            right: cs.borderRightColor,
            bottom: cs.borderBottomColor,
            left: cs.borderLeftColor,
          },
          color: cs.color,
          font_family: cs.fontFamily.replace(/['"]/g, "").split(",")[0].trim(),
          font_weight: parseInt(cs.fontWeight),
          box_shadow: cs.boxShadow,
          opacity: parseFloat(cs.opacity),
          css_classes: Array.from(element.classList),
          tag_name: element.tagName.toLowerCase(),
          children,
        };
      }
      return extractElement(el);
    });

    function parseRawSnapshot(r: RawElementData): WidgetSnapshot {
      const boxShadow = parseBoxShadow(r.box_shadow);
      const cssNameClass = r.css_classes.find((c) => c.startsWith("gtk-") || c.startsWith("adw-"));
      const cssName = cssNameClass
        ? cssNameClass.replace(/^gtk-/, "").replace(/^adw-/, "")
        : r.tag_name;

      return {
        width: r.width,
        height: r.height,
        padding: r.padding,
        border_radius: r.border_radius,
        background_color: parseColor(r.background_color),
        border_widths: r.border_widths,
        border_colors: {
          top: parseColor(r.border_colors.top),
          right: parseColor(r.border_colors.right),
          bottom: parseColor(r.border_colors.bottom),
          left: parseColor(r.border_colors.left),
        },
        color: parseColor(r.color),
        font_family: r.font_family,
        font_weight: r.font_weight,
        shadows: boxShadow.shadows,
        inset_shadows: boxShadow.inset_shadows,
        opacity: r.opacity,
        x: r.x,
        y: r.y,
        css_name: cssName,
        css_classes: r.css_classes,
        children: r.children.map(parseRawSnapshot),
      };
    }

    return parseRawSnapshot(raw);
  } catch (error) {
    if (isPageClosedError(error)) {
      throw error;
    }
    throw error;
  }
}

export const DEFAULT_COLOR_TOLERANCE = 1 / 255;
export const DEFAULT_NUMBER_TOLERANCE = 0.5;

export function normalizeTransparent(c: Color | null): Color | null {
  if (c !== null && c.a === 0) return null;
  return c;
}

function colorsMatch(
  a: Color | null,
  b: Color | null,
  tolerance = DEFAULT_COLOR_TOLERANCE,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance &&
    Math.abs(a.a - b.a) <= tolerance
  );
}

function numbersMatch(a: number, b: number, tolerance = DEFAULT_NUMBER_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

function checkSides(
  prefix: string,
  native: Sides,
  web: Sides,
  check: (property: string, n: number, w: number) => void,
) {
  for (const side of ["top", "right", "bottom", "left"] as const) {
    check(`${prefix}.${side}`, native[side], web[side]);
  }
}

export function compare(native: WidgetSnapshot, web: WidgetSnapshot): CompareResult {
  const failures: CompareResult["failures"] = [];

  function checkNumber(property: string, n: number, w: number) {
    if (!numbersMatch(n, w)) {
      failures.push({ property, native: n, web: w });
    }
  }

  function checkColor(property: string, n: Color | null, w: Color | null) {
    if (!colorsMatch(n, w)) {
      failures.push({ property, native: n, web: w });
    }
  }

  // Padding + transparent-border inset normalization.
  // Some widgets (e.g., GtkSwitch) use CSS transparent borders to emulate GTK
  // padding behavior with absolute positioning. When border widths differ and
  // both sides have transparent (or zero) border, compare padding + border_width
  // as a combined inset instead of comparing them separately.
  const sides = ["top", "right", "bottom", "left"] as const;
  function isBorderTransparent(colors: SideColors, side: (typeof sides)[number]): boolean {
    const c = colors[side];
    return c === null || c.a === 0;
  }
  function needsInsetNormalization(side: (typeof sides)[number]): boolean {
    const nBorder = native.border_widths[side];
    const wBorder = web.border_widths[side];
    if (numbersMatch(nBorder, wBorder)) return false;
    // Only normalize when combined insets match (a true padding↔border swap)
    // and both borders are transparent. This avoids false positives where one
    // side genuinely adds a border the other doesn't have (e.g., GtkSpinner).
    const nInset = native.padding[side] + nBorder;
    const wInset = web.padding[side] + wBorder;
    if (!numbersMatch(nInset, wInset)) return false;
    return (
      (nBorder === 0 || isBorderTransparent(native.border_colors, side)) &&
      (wBorder === 0 || isBorderTransparent(web.border_colors, side))
    );
  }

  const normalizeInset = sides.some(needsInsetNormalization);
  if (normalizeInset) {
    for (const side of sides) {
      if (needsInsetNormalization(side)) {
        const nInset = native.padding[side] + native.border_widths[side];
        const wInset = web.padding[side] + web.border_widths[side];
        checkNumber(`inset.${side}`, nInset, wInset);
      } else {
        checkNumber(`padding.${side}`, native.padding[side], web.padding[side]);
        checkNumber(`border_widths.${side}`, native.border_widths[side], web.border_widths[side]);
      }
    }
  } else {
    checkSides("padding", native.padding, web.padding, checkNumber);
    checkSides("border_widths", native.border_widths, web.border_widths, checkNumber);
  }

  // GTK clamps border-radius to min(width,height)/2 at paint time,
  // but browsers keep the literal CSS value (e.g. 9999px from Adwaita SCSS).
  const halfMinNative = Math.min(native.width, native.height) / 2;
  const halfMinWeb = Math.min(web.width, web.height) / 2;
  function checkRadius(property: string, n: number, w: number) {
    // If both values are >= their own element's halfMin, both sides are "fully round"
    // (border-radius: 50% on different-sized elements produces different pixel values
    // but the same visual result). Theme-agnostic: works for any theme that uses 50%.
    if (n >= halfMinNative - 0.5 && w >= halfMinWeb - 0.5) return;
    // If the raw values are already equal, the radius is correct on both sides —
    // no need to clamp. (Clamping would differ when one element is unusually small,
    // e.g. a widget whose web layout hasn't been fully replicated yet.)
    if (numbersMatch(n, w)) return;
    if (!numbersMatch(Math.min(n, halfMinNative), Math.min(w, halfMinWeb))) {
      failures.push({ property, native: n, web: w });
    }
  }
  // Skip border_radius when native background is transparent — GTK only emits a
  // RoundedClipNode when there's visible content to clip. No public API exists to
  // read computed border-radius outside render nodes.
  const nativeBgVisible = native.background_color !== null && native.background_color.a > 0;
  if (nativeBgVisible) {
    for (const corner of ["top_left", "top_right", "bottom_right", "bottom_left"] as const) {
      checkRadius(
        `border_radius.${corner}`,
        native.border_radius[corner],
        web.border_radius[corner],
      );
    }
  }

  checkColor(
    "background_color",
    normalizeTransparent(native.background_color),
    normalizeTransparent(web.background_color),
  );

  checkColor("color", native.color, web.color);

  // Cantarell was renamed to Adwaita Sans in GTK 47+
  function normalizeFontFamily(f: string) {
    return f.toLowerCase().replace("adwaita sans", "cantarell");
  }
  // A generic family (the monospace font's default) is resolved by fontconfig
  // like Pango's "Monospace" alias, so native reports the font it picked.
  const genericFamily = ["monospace", "sans-serif", "serif"].includes(web.font_family ?? "");
  if (native.font_family && web.font_family && !genericFamily) {
    if (normalizeFontFamily(native.font_family) !== normalizeFontFamily(web.font_family)) {
      failures.push({ property: "font_family", native: native.font_family, web: web.font_family });
    }
  }

  if (native.font_weight != null && web.font_weight != null) {
    checkNumber("font_weight", native.font_weight, web.font_weight);
  }

  checkNumber("opacity", native.opacity, web.opacity);

  // Shadow comparison
  const maxShadows = Math.max(native.shadows.length, web.shadows.length);
  for (let i = 0; i < maxShadows; i++) {
    const ns = native.shadows[i];
    const ws = web.shadows[i];
    if (!ns || !ws) {
      failures.push({
        property: `shadows[${i}]`,
        native: ns ?? null,
        web: ws ?? null,
      });
      continue;
    }
    checkColor(`shadows[${i}].color`, ns.color, ws.color);
    checkNumber(`shadows[${i}].dx`, ns.dx, ws.dx);
    checkNumber(`shadows[${i}].dy`, ns.dy, ws.dy);
    checkNumber(`shadows[${i}].spread`, ns.spread, ws.spread);
    checkNumber(`shadows[${i}].blur_radius`, ns.blur_radius, ws.blur_radius);
  }

  const maxInsetShadows = Math.max(native.inset_shadows.length, web.inset_shadows.length);
  for (let i = 0; i < maxInsetShadows; i++) {
    const ns = native.inset_shadows[i];
    const ws = web.inset_shadows[i];
    if (!ns || !ws) {
      failures.push({
        property: `inset_shadows[${i}]`,
        native: ns ?? null,
        web: ws ?? null,
      });
      continue;
    }
    checkColor(`inset_shadows[${i}].color`, ns.color, ws.color);
    checkNumber(`inset_shadows[${i}].dx`, ns.dx, ws.dx);
    checkNumber(`inset_shadows[${i}].dy`, ns.dy, ws.dy);
    checkNumber(`inset_shadows[${i}].spread`, ns.spread, ws.spread);
    checkNumber(`inset_shadows[${i}].blur_radius`, ns.blur_radius, ws.blur_radius);
  }

  return { failures };
}

/** Find a child in a widget tree by CSS name (e.g., "progress", "trough", "check").
 *  Searches breadth-first. Returns the nth match (default: first). */
export function findChild(tree: WidgetSnapshot, cssName: string, index = 0): WidgetSnapshot {
  const queue = [...(tree.children ?? [])];
  let found = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.css_name === cssName) {
      if (found === index) return node;
      found++;
    }
    if (node.children) queue.push(...node.children);
  }
  throw new Error(`Child with css_name="${cssName}" (index ${index}) not found in tree`);
}

export type GtkTestCallback = (native: WidgetSnapshot, web: WidgetSnapshot) => void;

export interface GtkTestOptions {
  /** CSS selector for a child element within [data-testid='target'] to extract styles from.
   *  Use for container widgets where the visual element is a child (e.g. GtkMenuButton's inner toggle button). */
  childSelector?: string;
}

export function gtkTest(
  caseName: string,
  cbOrOpts?: GtkTestCallback | GtkTestOptions,
  cb?: GtkTestCallback,
) {
  const opts: GtkTestOptions = typeof cbOrOpts === "function" ? {} : (cbOrOpts ?? {});
  const callback = typeof cbOrOpts === "function" ? cbOrOpts : cb;
  const browsers = globalThis.__testBrowsers;
  for (const [browserName, browser] of Object.entries(browsers)) {
    test.concurrent(
      `${caseName} (${browserName})`,
      async () => {
        debugLog("test", `start case=${caseName} browser=${browserName}`);
        const [native, web] = await Promise.all([
          getNativeSnapshot(caseName),
          extractWebStyles(browser, caseName, opts?.childSelector),
        ]);
        try {
          if (callback) {
            callback(native, web);
          } else {
            const result = compare(native, web);
            if (result.failures.length > 0) {
              console.error("Failures:", JSON.stringify(result.failures, null, 2));
            }
            expect(result.failures).toEqual([]);
          }
        } catch (err) {
          console.error("Native:", JSON.stringify(native, null, 2));
          console.error("Web:", JSON.stringify(web, null, 2));
          throw err;
        } finally {
          debugLog("test", `end case=${caseName} browser=${browserName}`);
        }
      },
      GTK_TEST_TIMEOUT,
    );
  }
}

export function gtkTestExpectFailure(caseName: string, expectedFailProperties: string[]) {
  const browsers = globalThis.__testBrowsers;
  for (const [browserName, browser] of Object.entries(browsers)) {
    test.concurrent(
      `${caseName} (${browserName}) [expected failure]`,
      async () => {
        debugLog("test", `start case=${caseName} browser=${browserName} expected-failure`);
        const nativeCaseName = caseName.replace(/-wrong-.*$/, "");
        const [native, web] = await Promise.all([
          getNativeSnapshot(nativeCaseName),
          extractWebStyles(browser, caseName),
        ]);
        const result = compare(native, web);
        expect(result.failures.length).toBeGreaterThan(0);
        for (const prop of expectedFailProperties) {
          expect(result.failures.some((f) => f.property.startsWith(prop))).toBe(true);
        }
        debugLog("test", `end case=${caseName} browser=${browserName} expected-failure`);
      },
      GTK_TEST_TIMEOUT,
    );
  }
}
