import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwSpinRow } from "./spin-row.tsx";

describe("AdwSpinRow", () => {
  test("is an activatable row whose spin button is labelled by the title", () => {
    const html = renderToStaticMarkup(
      <AdwSpinRow title="Quantity" subtitle="Items" value={5} min={0} max={10} />,
    );
    expect(html).toContain('class="gtk-row activatable spin"');
    const titleId = /<span class="gtk-label title" id="([^"]+)"/.exec(html)?.[1];
    const subtitleId = /<span class="gtk-label subtitle" id="([^"]+)"/.exec(html)?.[1];
    expect(html).toContain(`role="spinbutton"`);
    expect(html).toContain(`aria-labelledby="${titleId}" aria-describedby="${subtitleId}"`);
    // The spin button is a suffix that expands, with the number at the end.
    expect(html).toMatch(
      /class="gtk-box gtk-box-layout horizontal suffixes"><div class="gtk-spinbutton/,
    );
    expect(html).toContain('data-hexpand="true"');
    expect(html).toContain("text-align:end");
  });

  test("an insensitive row dims its labels and disables its spin button", () => {
    const html = renderToStaticMarkup(<AdwSpinRow title="Quantity" value={5} disabled />);
    expect(html).toContain('class="gtk-row spin"');
    expect(html).toMatch(/<span class="gtk-label title" id="[^"]+" data-disabled="true"/);
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
