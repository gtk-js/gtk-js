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
];

for (const dir of packages) {
  const pkg = await Bun.file(`${dir}/package.json`).json();
  const { name, version } = pkg;

  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`);
  if (res.ok) {
    console.log(`${name}@${version} already published, skipping`);
    continue;
  }

  console.log(`Publishing ${name}@${version}...`);

  let published = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = Bun.spawnSync({
      cmd: ["bun", "publish", "--cwd", dir],
      stdout: "inherit",
      stderr: "pipe",
    });

    const stderr = result.stderr.toString();
    if (stderr) process.stderr.write(stderr);

    if (result.exitCode === 0) {
      published = true;
      break;
    }

    // 409 Conflict = npm still processing a previous publish; retry after a delay
    if (stderr.includes("409 Conflict")) {
      console.log(`Registry busy, retrying in ${(attempt + 1) * 10}s...`);
      await Bun.sleep((attempt + 1) * 10_000);

      // Check if it actually got published despite the error
      const check = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`,
      );
      if (check.ok) {
        console.log(`${name}@${version} is now available, skipping`);
        published = true;
        break;
      }
      continue;
    }

    // Non-retryable error
    process.exit(result.exitCode);
  }

  if (!published) {
    console.error(`Failed to publish ${name}@${version} after 3 attempts`);
    process.exit(1);
  }

  console.log(`New tag: ${name}@${version}`);
}
