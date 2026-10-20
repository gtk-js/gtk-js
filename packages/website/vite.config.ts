import { defineConfig } from "vite-plus";
import { buildTask } from "../../vite.shared.ts";

export default defineConfig({
  run: { tasks: { build: buildTask(import.meta.url, "next build") } },
});
