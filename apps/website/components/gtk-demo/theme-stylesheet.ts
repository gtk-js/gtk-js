// The docs site's theme as static stylesheet files (public/themes/, copied
// from the theme packages by scripts/copy-themes.ts), shared by the picker
// and by the <head> script that links the saved theme before the first paint.
// No React or theme package imports: the <head> script is two functions from
// here, serialized.

export type ThemeName = "adwaita" | "whitesur" | "mactahoe" | "fluent";

export const THEME_LABELS: Record<ThemeName, string> = {
  adwaita: "Adwaita",
  whitesur: "Big Sur",
  mactahoe: "Tahoe",
  fluent: "Fluent",
};

export const ADWAITA_ACCENT_PRESETS = [
  "#3584e4",
  "#9141ac",
  "#e66100",
  "#2ec27e",
  "#e01b24",
  "#f5c211",
];

/** Windows' accent colors (Settings > Personalization > Colors). */
export const FLUENT_ACCENT_PRESETS = [
  "#0078d4",
  "#0099bc",
  "#00b294",
  "#107c10",
  "#ffb900",
  "#f7630c",
  "#e74856",
  "#e3008c",
  "#881798",
  "#7a7574",
];

export interface ThemeChoice {
  themeName: ThemeName;
  colorScheme: "light" | "dark" | "auto";
  adwaitaAccent: string;
  fluentAccent: string;
}

export const DEFAULT_CHOICE: ThemeChoice = {
  themeName: "adwaita",
  colorScheme: "auto",
  adwaitaAccent: "#3584e4",
  fluentAccent: "#0078d4",
};

export const ALLOWED: { [K in keyof ThemeChoice]: readonly ThemeChoice[K][] } = {
  themeName: Object.keys(THEME_LABELS) as ThemeName[],
  colorScheme: ["light", "dark", "auto"],
  adwaitaAccent: ADWAITA_ACCENT_PRESETS,
  fluentAccent: FLUENT_ACCENT_PRESETS,
};

export const STORAGE_KEY = "gtk-js-docs-theme";

/** Where the site is served from (next.config.mjs's basePath). */
export const BASE_PATH = process.env.BASE_PATH ?? "";

/**
 * A saved choice, keeping only known values (the defaults for the rest).
 * Self-contained: the <head> script runs it as is.
 */
export function readChoice(
  saved: unknown,
  defaults: ThemeChoice,
  allowed: typeof ALLOWED,
): ThemeChoice {
  const choice: Record<string, unknown> = { ...defaults };
  const values = (saved ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(choice)) {
    if ((allowed[key as keyof ThemeChoice] as readonly unknown[]).includes(values[key])) {
      choice[key] = values[key];
    }
  }
  return choice as unknown as ThemeChoice;
}

/**
 * The stylesheet file of a choice in the light or dark scheme, and the CSS
 * that goes after it: what the theme classes' getCSS() return, as files.
 * Self-contained: the <head> script runs it as is.
 */
export function themeStylesheet(
  choice: ThemeChoice,
  scheme: "light" | "dark",
  base: string,
): { href: string; css: string } {
  const dir = `${base}/themes/${choice.themeName}/`;
  if (choice.themeName === "adwaita") {
    // AdwaitaTheme: the accent replaces the one the stylesheet's :root reads.
    return {
      href: `${dir}${scheme}.css`,
      css: `:root { --accent-bg-color: ${choice.adwaitaAccent}; --accent-fg-color: white; }`,
    };
  }
  if (choice.themeName === "fluent") {
    // FluentTheme: the stylesheet's :root derives the accent fills from it.
    return {
      href: `${dir}${scheme}.css`,
      css: `:root { --fluent-accent: ${choice.fluentAccent}; }`,
    };
  }
  return { href: `${dir}${scheme}_default.css`, css: "" };
}

/**
 * The <head> script: links the saved theme's stylesheet (render-blocking, as
 * the parser writes it) before the first paint, for GtkProvider to take over
 * (its `<link id="gtk-js-theme">` and `<style id="gtk-js-theme-text">`).
 */
export function themeScript(): string {
  const args = [
    JSON.stringify(STORAGE_KEY),
    JSON.stringify(DEFAULT_CHOICE),
    JSON.stringify(ALLOWED),
    JSON.stringify(BASE_PATH),
    readChoice.toString(),
    themeStylesheet.toString(),
  ];
  return `(${headScript.toString()})(${args.join(",")})`;
}

function headScript(
  key: string,
  defaults: ThemeChoice,
  allowed: typeof ALLOWED,
  base: string,
  read: typeof readChoice,
  stylesheet: typeof themeStylesheet,
) {
  let choice = defaults;
  try {
    choice = read(JSON.parse(localStorage.getItem(key) ?? "{}"), defaults, allowed);
  } catch {
    // Storage blocked or unreadable: the defaults.
  }
  const dark =
    choice.colorScheme === "dark" ||
    (choice.colorScheme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const { href, css } = stylesheet(choice, dark ? "dark" : "light", base);
  // Written by the parser, so it blocks rendering until it has loaded. Only
  // known values get here: readChoice() keeps nothing else.
  document.write(
    `<link rel="stylesheet" id="gtk-js-theme" href="${href}">` +
      (css ? `<style id="gtk-js-theme-text">${css}</style>` : ""),
  );
}
