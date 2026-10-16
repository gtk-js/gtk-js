import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.{ts,tsx}"],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // Native GTK vs. web comparisons. One worker runs every file in order, sharing the
        // browsers that tests/setup.ts launches and the servers from tests/global-setup.ts.
        test: {
          name: "native",
          include: ["tests/cases/**/*.test.ts"],
          globalSetup: ["tests/global-setup.ts"],
          setupFiles: ["tests/setup.ts"],
          fileParallelism: false,
          isolate: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
