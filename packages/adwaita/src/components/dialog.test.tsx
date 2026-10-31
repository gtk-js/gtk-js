import { DecorationLayout, GtkProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { AdwAlertDialog } from "./alert-dialog.tsx";
import { AdwDialog } from "./dialog.tsx";
import { AdwHeaderBar } from "./header-bar.tsx";

// react-dom/server checks `instanceof HTMLElement` for the dialog's portal prop.
(globalThis as { HTMLElement?: unknown }).HTMLElement ??= class {};

/** The class attribute of the first element with class `name`. */
function classesOf(html: string, name: string): string[] {
  const match = html.match(new RegExp(`class="((?:[^"]* )?${name}(?: [^"]*)?)"`));
  return match ? match[1]!.split(" ") : [];
}

describe("AdwDialog", () => {
  test("paints its sheet, not the dialog, like adw-floating-sheet.c", () => {
    const html = renderToStaticMarkup(<AdwDialog visible>content</AdwDialog>);
    expect(classesOf(html, "gtk-dialog")).toEqual(["gtk-dialog", "floating"]);
    expect(classesOf(html, "gtk-sheet")).toEqual(["gtk-sheet", "background"]);
    expect(html).toContain('class="gtk-floating-sheet"');
  });

  test("presents a bottom sheet with its outline", () => {
    const html = renderToStaticMarkup(
      <AdwDialog visible presentationMode="bottom-sheet">
        content
      </AdwDialog>,
    );
    expect(classesOf(html, "gtk-dialog")).toEqual(["gtk-dialog", "bottom-sheet"]);
    expect(html).toContain('class="gtk-bottom-sheet"');
    expect(html).toMatch(
      /class="gtk-stack"[^>]*><div class="gtk-widget"[^>]*><div class="gtk-widget"/,
    );
    expect(html).toContain('class="gtk-outline"');
  });

  test("keeps the header bar's close button when it can't close", () => {
    const html = renderToStaticMarkup(
      <AdwDialog visible canClose={false}>
        <AdwHeaderBar />
      </AdwDialog>,
    );
    expect(html).toContain("gtk-windowcontrols gtk-box-layout horizontal end");
  });
});

describe("AdwDialog window buttons", () => {
  const side = (html: string) =>
    [...html.matchAll(/gtk-windowcontrols gtk-box-layout horizontal (start|end)/g)].map(
      (m) => m[1],
    );
  const dialog = (layout?: string) =>
    renderToStaticMarkup(
      <GtkProvider decorationLayout={layout}>
        <AdwDialog visible>
          <AdwHeaderBar />
        </AdwDialog>
      </GtkProvider>,
    );

  test("only close, on the side the system layout puts it, like AdwSheetControls", () => {
    expect(side(dialog())).toEqual(["end"]);
    expect(side(dialog(DecorationLayout.MACOS))).toEqual(["start"]);
    expect(dialog(DecorationLayout.MACOS)).not.toContain('aria-label="Minimize"');
  });
});

describe("AdwAlertDialog", () => {
  const alert = (
    <AdwAlertDialog
      visible
      heading="Replace File?"
      body="A file with this name already exists."
      responses={[
        { id: "cancel", label: "_Cancel" },
        { id: "replace", label: "_Replace", appearance: "destructive" },
      ]}
      defaultResponse="replace"
    />
  );

  test("renders responses as text buttons with mnemonics", () => {
    const html = renderToStaticMarkup(alert);
    expect(classesOf(html, "destructive-action")).toEqual([
      "gtk-button",
      "text-button",
      "destructive-action",
      "default",
    ]);
    expect(html).not.toContain("_Cancel");
    expect(html).not.toContain("_Replace");
  });

  test("is described by its body", () => {
    const html = renderToStaticMarkup(alert);
    const id = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}" class="gtk-label body"`);
    expect(classesOf(html, "gtk-dialog")).toEqual(["gtk-dialog", "alert", "floating"]);
  });

  test("scrolls its message in a GtkScrolledWindow", () => {
    const html = renderToStaticMarkup(alert);
    expect(classesOf(html, "body-scrolled-window")).toEqual([
      "gtk-scrolledwindow",
      "body-scrolled-window",
      "undershoot-bottom",
    ]);
  });
});
