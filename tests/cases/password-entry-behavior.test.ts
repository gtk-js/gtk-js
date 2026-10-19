import type { Page } from "playwright";
import { expect, test } from "vite-plus/test";

// What GtkPasswordEntry does with the same input in native GTK 4.22
// (gtkpasswordentry.c). Caps Lock can't be toggled in a headless browser, so
// the test sends key events with its modifier state.

function events(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window as unknown as { passwordEntryEvents: string[] }).passwordEntryEvents.splice(0),
  );
}

function capsLockKey(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluate((input) =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "CapsLock", bubbles: true, modifierCapsLock: true }),
      ),
    );
}

for (const [browserName, page] of Object.entries(globalThis.__testPages)) {
  test(`password-entry-behavior (${browserName})`, async () => {
    const root = page.locator('[data-case="password-entry-behavior"]');
    const input = root.locator("#password-peek");
    const entry = ".gtk-entry:has(> #password-peek)";
    const peek = root.locator(`${entry} > .gtk-image:not(.caps-lock-indicator)`);
    const caps = root.locator(`${entry} > .caps-lock-indicator`);
    const state = () =>
      input.evaluate((el: HTMLInputElement) => ({
        type: el.type,
        selection: [el.selectionStart, el.selectionEnd],
        focused: el === document.activeElement,
      }));
    await events(page);

    // The peek icon claims the press: the text keeps the focus and, like
    // gtk_text_set_visibility(), its selection.
    await input.click();
    await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 4));
    await peek.click();
    expect(await state()).toEqual({ type: "text", selection: [2, 4], focused: true });
    expect(await peek.getAttribute("title")).toBe("Hide Text");
    await peek.click();
    expect(await state()).toEqual({ type: "password", selection: [2, 4], focused: true });

    // The caps-lock indicator shows only while the text is focused and hidden,
    // with the text's cursor (caps_lock_state_changed(), gtk_password_entry_init()).
    await capsLockKey(page, "#password-peek");
    expect(await caps.count()).toBe(1);
    expect(await caps.getAttribute("role")).toBe("alert");
    expect(await caps.evaluate((el) => getComputedStyle(el).cursor)).toBe("text");
    await peek.click();
    expect(await caps.count()).toBe(0);
    await peek.click();
    expect(await caps.count()).toBe(1);
    await input.blur();
    expect(await caps.count()).toBe(0);
    await capsLockKey(page, "#password-read-only");
    expect(await root.locator(".caps-lock-indicator").count()).toBe(0);

    // gtk_password_entry_set_show_peek_icon(FALSE) hides the text again.
    await peek.click();
    expect((await state()).type).toBe("text");
    await root.locator("#password-peek-toggle").click();
    expect(await peek.count()).toBe(0);
    expect((await state()).type).toBe("password");
    await root.locator("#password-peek-toggle").click();
    expect(await peek.getAttribute("title")).toBe("Show Text");

    // A disabled entry is dimmed, and its peek icon is never picked.
    const disabled = root.locator(".gtk-entry:has(> #password-disabled)");
    expect(await disabled.getAttribute("data-disabled")).toBe("true");
    expect(await disabled.evaluate((el) => getComputedStyle(el).filter)).not.toBe("none");
    await disabled.locator(":scope > .gtk-image").click({ force: true });
    expect(await root.locator("#password-disabled").getAttribute("type")).toBe("password");

    // Enter activates the entry, then the window's default widget.
    await root.locator("#password-default").press("Enter");
    expect(await events(page)).toEqual(["activate", "default"]);
  });
}
