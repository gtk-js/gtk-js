/**
 * Updates upstream git submodules (gtk and libadwaita) to their latest stable release tags.
 *
 * GNOME uses even minor versions for stable releases (e.g. 4.22.x, 1.8.x)
 * and odd minor versions for development (e.g. 4.21.x, 1.9.x).
 *
 * Usage: node scripts/update-upstream.ts
 */

import { spawnSync } from "node:child_process";

const submodules = [
  { name: "gtk", path: "upstream/gtk", remote: "https://github.com/GNOME/gtk.git" },
  {
    name: "libadwaita",
    path: "upstream/libadwaita",
    remote: "https://github.com/GNOME/libadwaita.git",
  },
  {
    name: "adwaita-icon-theme",
    path: "upstream/adwaita-icon-theme",
    remote: "https://github.com/GNOME/adwaita-icon-theme.git",
  },
];

function getLatestStableTag(lsRemoteOutput: string): string | null {
  const tags = lsRemoteOutput
    .split("\n")
    .map((line) => line.match(/refs\/tags\/(\d+\.\d+\.\d+)$/)?.[1])
    .filter((tag): tag is string => tag != null)
    // Filter to even minor versions (stable releases)
    .filter((tag) => {
      const minor = parseInt(tag.split(".")[1]!);
      return minor % 2 === 0;
    })
    .sort((a, b) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i]! !== pb[i]!) return pa[i]! - pb[i]!;
      }
      return 0;
    });

  return tags.at(-1) ?? null;
}

for (const sub of submodules) {
  console.log(`\n--- Updating ${sub.name} ---`);

  // Query tags from remote (fast, no local fetch needed)
  const lsRemote = spawnSync("git", ["ls-remote", "--tags", sub.remote], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (lsRemote.status !== 0) {
    console.error(`Failed to query tags for ${sub.name}`);
    process.exit(1);
  }

  const latestTag = getLatestStableTag(lsRemote.stdout.toString());

  if (!latestTag) {
    console.error(`No stable release tags found for ${sub.name}`);
    process.exit(1);
  }

  // Get current ref
  const currentHead = spawnSync("git", ["describe", "--tags", "--always"], {
    cwd: sub.path,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const currentRef = currentHead.stdout.toString().trim();

  if (currentRef === latestTag) {
    console.log(`${sub.name} already at latest stable: ${latestTag}`);
    continue;
  }

  console.log(`${sub.name}: ${currentRef} → ${latestTag}`);

  // Fetch the specific tag (shallow)
  const fetchTag = spawnSync("git", ["fetch", "--depth", "1", "origin", "tag", latestTag], {
    cwd: sub.path,
    stdio: "inherit",
  });

  if (fetchTag.status !== 0) {
    console.error(`Failed to fetch tag ${latestTag} for ${sub.name}`);
    process.exit(1);
  }

  // Checkout the tag
  const checkout = spawnSync("git", ["checkout", latestTag], { cwd: sub.path, stdio: "inherit" });

  if (checkout.status !== 0) {
    console.error(`Failed to checkout ${latestTag} for ${sub.name}`);
    process.exit(1);
  }

  console.log(`✓ ${sub.name} updated to ${latestTag}`);
}

console.log("\nDone. Run `git add upstream/ && git commit` to record the update.");
