import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { createGtkIcon } from "./createGtkIcon.tsx";

test("createGtkIcon draws groups, an icon's own grid, and paint set as style", () => {
  const Spinner = createGtkIcon(
    "spinner",
    [
      [
        "g",
        { transform: "translate(-754,-26)" },
        [["rect", { x: "764.5", y: "29", width: "1", height: "5", opacity: ".578" }]],
      ],
      ["path", { d: "M 1", style: "fill: var(--warning-color, currentColor)" }],
    ],
    "0 0 22 22",
  );
  const html = renderToStaticMarkup(<Spinner size={16} />);
  expect(html).toContain('width="16" height="16" viewBox="0 0 22 22"');
  expect(html).toContain(
    '<g transform="translate(-754,-26)"><rect x="764.5" y="29" width="1" height="5" opacity=".578"></rect></g>',
  );
  expect(html).toContain('<path d="M 1" style="fill:var(--warning-color, currentColor)"></path>');
});

test("createGtkIcon draws on the 16px symbolic grid by default", () => {
  const Icon = createGtkIcon("icon", [["path", { d: "M 1" }]]);
  expect(renderToStaticMarkup(<Icon />)).toContain('viewBox="0 0 16 16"');
});
