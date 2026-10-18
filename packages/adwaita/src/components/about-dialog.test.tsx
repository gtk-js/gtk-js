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

  test("ignores the untranslated translator-credits placeholder", () => {
    // update_credits(): either spelling means there are no translators.
    expect(mainRows({ translatorCredits: "translator_credits" })).toEqual([]);
    expect(mainRows({ translatorCredits: "translator-credits" })).toEqual([]);
    expect(mainRows({ translatorCredits: "Someone\n" })).toEqual(["Credits"]);
  });

  test("copies the version from a shrinking text button, confirmed by a toast", () => {
    const html = renderToStaticMarkup(
      <AdwAboutDialog applicationName="App" version="1.2.3-beta" visible />,
    );
    // adw-about-dialog.ui: toast_overlay > navigation_view, and version_button
    // (can-shrink, no tooltip).
    expect(html).toMatch(/class="gtk-toastoverlay"[^>]*><div[^>]*class="gtk-navigation-view /);
    const button = html.match(/<button[^>]*class="gtk-button text-button app-version"[^>]*>/);
    expect(button?.[0]).not.toContain("title=");
    expect(html).toMatch(
      /app-version"[^>]*><span class="gtk-label"[^>]*><span style="[^"]*text-overflow:ellipsis[^"]*">1\.2\.3-beta</,
    );
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
    expect(html).toContain('title="appstream:org.example.Other"');
    expect(html).toContain("Does other things");
  });
});
