import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

export default withMDX({
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.BASE_PATH,
  // For the theme stylesheets' URLs (components/gtk-demo/theme-stylesheet.ts).
  env: { BASE_PATH: process.env.BASE_PATH ?? "" },
});
