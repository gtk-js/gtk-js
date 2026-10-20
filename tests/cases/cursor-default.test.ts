import { expect, test } from "vite-plus/test";

// GTK shows the default arrow unless a widget sets a cursor with
// gtk_widget_set_cursor_from_name(): GtkText and GtkTextView "text",
// GtkLinkButton "pointer". Insensitive widgets aren't picked, so the arrow
// shows through them.
for (const [browserName, page] of Object.entries(globalThis.__testPages)) {
  test(`cursor-default (${browserName})`, async () => {
    const root = page.locator('[data-case="cursor-default"]');
    const cursor = (selector: string) =>
      root.locator(selector).evaluate((el) => getComputedStyle(el).cursor);

    expect(await cursor("#cursor-label")).toBe("default");
    expect(await cursor("#cursor-button")).toBe("default");
    expect(await cursor("#cursor-button .gtk-label")).toBe("default");
    expect(await cursor(".gtk-entry:has(> #cursor-entry)")).toBe("default");
    expect(await cursor("#cursor-entry")).toBe("text");
    expect(await cursor("#cursor-entry-disabled")).toBe("default");
    expect(await cursor("#cursor-link")).toBe("pointer");
    expect(await cursor("#cursor-link .gtk-label")).toBe("pointer");
    expect(await cursor(".gtk-textview:has(> #cursor-text-view)")).toBe("text");
    expect(await cursor("#cursor-text-view")).toBe("text");
  });
}
