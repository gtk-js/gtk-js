import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packages = [
  "packages/gtk-css",
  "packages/icon-helpers",
  "themes/adwaita",
  "themes/whitesur",
  "themes/mactahoe",
  "themes/fluent",
  "icons/gtk4",
  "icons/adwaita",
  "icons/whitesur",
  "icons/mactahoe",
  "icons/fluent",
  "packages/gtk4",
  "packages/adwaita",
  "packages/sourceview",
];

for (const dir of packages) {
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
  const { name, version } = pkg;

  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`);
  if (res.ok) {
    console.log(`${name}@${version} already published, skipping`);
    continue;
  }

  console.log(`Publishing ${name}@${version}...`);
  const result = spawnSync("npm", ["publish", "--workspace", dir], { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`New tag: ${name}@${version}`);
}
