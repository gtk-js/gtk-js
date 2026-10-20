import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { UserConfig } from "vite-plus";

/** Inlines `?raw` imports, which Vite supports but `vp pack` (tsdown) doesn't: https://github.com/voidzero-dev/vite-plus/issues/2796 */
const raw = {
  name: "gtk-js:raw",
  async load(id: string) {
    if (!id.endsWith("?raw")) return null;
    return `export default ${JSON.stringify(await readFile(id.slice(0, -"?raw".length), "utf8"))};`;
  },
};

/** `vp pack` settings shared by every published package: one ESM entry plus bundled types. */
export function pack(): NonNullable<UserConfig["pack"]> {
  return {
    entry: ["src/index.ts"],
    format: "esm",
    platform: "neutral",
    dts: true,
    plugins: [raw],
    // The CSS build writes dist/*.css first and the bundle inlines it, so only
    // the bundle's own outputs are cleaned: stale ones would be published.
    clean: ["dist/**/*.js", "dist/**/*.d.ts"],
  };
}

/**
 * The `build` task of the workspace package whose `vite.config.ts` is at `configUrl`
 * (its `import.meta.url`), running `command` after the builds of the gtk-js packages
 * it depends on. `vp run -r` orders packages only by `workspace:` dependencies, which
 * npm can't install, so without this every build starts at once: the website would
 * read icon modules while their package rewrites them, and a bundle's types would
 * miss those of a dependency not built yet.
 */
export function buildTask(configUrl: string, command: string) {
  const pkg = JSON.parse(readFileSync(new URL("package.json", configUrl), "utf8"));
  const deps = Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  }).filter((name) => name.startsWith("@gtk-js/"));
  return { command, dependsOn: deps.map((name) => `${name}#build`), cache: false };
}
