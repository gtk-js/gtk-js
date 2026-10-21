import { readFileSync } from "fs";
import { join } from "path";
import type { ReactNode } from "react";
import { Preview } from "./preview";

interface PreviewFileProps {
  /** Path to the example file relative to the website package root (e.g. "content/docs/gtk4/examples/button.tsx") */
  file: string;
  children: ReactNode;
}

export function PreviewFile({ file, children }: PreviewFileProps) {
  const source = readFileSync(join(process.cwd(), file), "utf8");
  return <Preview source={source}>{children}</Preview>;
}
