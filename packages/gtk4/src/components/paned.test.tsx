import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkLabel } from "./label.tsx";
import { GtkPaned } from "./paned.tsx";

const handleOf = (html: string) => html.match(/<div[^>]*role="separator"[^>]*>/)?.[0] ?? "";

describe("GtkPaned", () => {
  test("children are the paned's own children around the handle, like set_start_child()", () => {
    const html = renderToStaticMarkup(
      <GtkPaned
        position={150}
        startChild={<GtkLabel label="A" />}
        endChild={<GtkLabel label="B" />}
      />,
    );
    expect(html).toMatch(
      /^<div class="gtk-paned horizontal"[^>]*><span class="gtk-label[^>]*>A<\/span><div class="gtk-separator"[^>]*><\/div><span class="gtk-label[^>]*>B<\/span><\/div>$/,
    );
    expect(html).toContain("--gtk-paned-position:150px");
  });

  test("the handle is focused by F8 only, and is a separator across the orientation", () => {
    const horizontal = handleOf(
      renderToStaticMarkup(
        <GtkPaned
          position={150}
          startChild={<GtkLabel label="A" />}
          endChild={<GtkLabel label="B" />}
        />,
      ),
    );
    expect(horizontal).toContain('tabindex="-1"');
    expect(horizontal).toContain('aria-orientation="vertical"');
    expect(horizontal).toContain('aria-valuemin="0"');
    expect(horizontal).toContain('aria-valuenow="150"');
    const vertical = handleOf(
      renderToStaticMarkup(
        <GtkPaned
          orientation="vertical"
          startChild={<GtkLabel label="A" />}
          endChild={<GtkLabel label="B" />}
        />,
      ),
    );
    expect(vertical).toContain('aria-orientation="horizontal"');
    expect(vertical).toContain('class="gtk-separator"');
  });

  test("a lone child has no handle, like gtk_paned_size_allocate()", () => {
    const html = renderToStaticMarkup(
      <GtkPaned position={150} endChild={<GtkLabel label="B" />} />,
    );
    expect(html).not.toContain("gtk-separator");
    expect(html).not.toContain("--gtk-paned-position");
  });
});
