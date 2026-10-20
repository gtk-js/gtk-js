import { defineConfig } from "vite-plus";
import { buildTask, pack } from "../../vite.shared.ts";

export default defineConfig({
  pack: pack(),
  run: { tasks: { build: buildTask(import.meta.url, "node build.ts && vp pack") } },
});
