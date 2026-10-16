import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

export default withMDX({
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.BASE_PATH,
});
