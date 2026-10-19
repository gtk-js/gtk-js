import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwAboutDialog, type AdwAboutDialogProps } from "./about-dialog.tsx";

// react-dom/server checks `instanceof HTMLElement` for the dialog's portal prop.
(globalThis as { HTMLElement?: unknown }).HTMLElement ??= class {};

/** The titles of the main page's rows, in order. */
function mainRows(props: Partial<AdwAboutDialogProps>): string[] {
  const html = renderToStaticMarkup(<AdwAboutDialog applicationName="App" visible {...props} />);
  return [...html.matchAll(/<span class="gtk-label title"[^>]*>([^<]*)<\/span>/g)].map(
    (m) => m[1]!,
  );
}

describe("AdwAboutDialog main page", () => {
  test("shows the website there unless the Details page has links", () => {
    expect(mainRows({ website: "https://example.org" })).toEqual(["Website"]);
    // update_details(): extra links move the website to the Details page.
    expect(
      mainRows({ website: "https://example.org", links: [{ title: "Donate", url: "https://d" }] }),
    ).toEqual(["Details"]);
  });

  test("offers Credits for custom credit sections alone", () => {
    expect(mainRows({ creditSections: [{ name: "App icons by", people: ["Someone"] }] })).toEqual([
      "Credits",
    ]);
  });

  test("offers Acknowledgements, and Legal for legal sections alone", () => {
    expect(
      mainRows({
        acknowledgementSections: [{ name: "Backers", people: ["Someone"] }],
        legalSections: [{ title: "Library", copyright: "© 2024 Someone", licenseType: "MIT" }],
      }),
    ).toEqual(["Legal", "Acknowledgements"]);
  });

  test("ignores empty sections", () => {
    expect(mainRows({ creditSections: [{ people: [] }], acknowledgementSections: [] })).toEqual([]);
  });

  test("lists other apps under the developer's name", () => {
    const html = renderToStaticMarkup(
      <AdwAboutDialog
        applicationName="App"
        developerName="Someone"
        visible
        otherApps={[{ appId: "org.example.Other", name: "Other", summary: "Does other things" }]}
      />,
    );
    expect(html).toContain("Other Apps by Someone");
    expect(html).toContain('data-gtk-tooltip="appstream:org.example.Other"');
    expect(html).toContain("Does other things");
  });
});
