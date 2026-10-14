import { describe, expect, test } from "bun:test";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { GtkProvider } from "../provider.tsx";
import { GtkSpinner } from "./spinner.tsx";

describe("GtkSpinner", () => {
  test("draws process-working at the icon size, from GTK's icons when the set lacks it", () => {
    // An icon set without ProcessWorking, like Adwaita's: GTK falls back to its own icons.
    const icons = { GoNext: createGtkIcon("GoNext", [["path", { d: "M0 0h16v16H0z" }]]) };
    const html = renderToStaticMarkup(
      <GtkProvider icons={icons}>
        <GtkSpinner spinning />
      </GtkProvider>,
    );
    expect(html).toContain('class="gtk-spinner"');
    expect(html).toMatch(
      /<svg[^>]* width="16" height="16"[^>]*class="gtk-icon gtk-icon-process-working"/,
    );
  });
});
