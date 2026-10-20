import type { Page } from "playwright";
import { expect, test } from "vite-plus/test";

// Selection, activation and keyboard focus follow GtkFlowBox's click gesture,
// focus handling and key bindings (gtkflowbox.c). The single-click steps are
// what native GTK 4.22 does for the same input; the double-click ones follow
// gtk_flow_box_update_selection().

/** Each child: S when selected, F when focused. */
function state(page: Page, id: string): Promise<string> {
  return page
    .locator(`#${id}`)
    .evaluate((box) =>
      [...box.children]
        .map(
          (el) =>
            (el.getAttribute("aria-selected") === "true" ? "S" : "-") +
            (el === document.activeElement ? "F" : ""),
        )
        .join(" "),
    );
}

function events(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window as unknown as { flowBoxEvents: string[] }).flowBoxEvents.splice(0),
  );
}

for (const [browserName, page] of Object.entries(globalThis.__testPages)) {
  test(`flow-box-behavior (${browserName})`, async () => {
    const root = page.locator('[data-case="flow-box-behavior"]');
    const single = root.locator("#flow-box-single > .gtk-flowboxchild");
    await events(page);

    // Clicking selects and activates (gtk_flow_box_select_and_activate()).
    await single.nth(4).click();
    expect(await state(page, "flow-box-single")).toBe("- - - - SF -");
    expect(await events(page)).toEqual(["activated 4"]);

    // Tab from outside focuses the selected child (gtk_flow_box_focus()).
    await root.locator("input").click();
    await page.keyboard.press("Tab");
    expect(await state(page, "flow-box-single")).toBe("- - - - SF -");
    // Arrows move and select, Up/Down by a line of 3 (gtk_flow_box_move_cursor()).
    await page.keyboard.press("ArrowRight");
    expect(await state(page, "flow-box-single")).toBe("- - - - - SF");
    await page.keyboard.press("ArrowUp");
    expect(await state(page, "flow-box-single")).toBe("- - SF - - -");
    await page.keyboard.press("End");
    expect(await state(page, "flow-box-single")).toBe("- - - - - SF");
    // Ctrl moves the focus only.
    await page.keyboard.press("Control+ArrowLeft");
    expect(await state(page, "flow-box-single")).toBe("- - - - -F S");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    expect(await events(page)).toEqual(["activated 5"]);
    // Ctrl+Space unselects (gtk_flow_box_toggle_cursor_child()).
    await page.keyboard.press("Control+Space");
    expect(await state(page, "flow-box-single")).toBe("- - - - - -F");
    // Keyboard focus moving to a child selects it (gtk_flow_box_child_focus()).
    await page.keyboard.press("Shift+Tab");
    expect(await state(page, "flow-box-single")).toBe("- - - - SF -");
    expect(await events(page)).toEqual([]);

    const multiple = root.locator("#flow-box-multiple > .gtk-flowboxchild");
    await multiple.nth(0).click();
    await multiple.nth(2).click();
    expect(await state(page, "flow-box-multiple")).toBe("- - SF - - -");
    await multiple.nth(3).click({ modifiers: ["Shift"] });
    expect(await state(page, "flow-box-multiple")).toBe("- - S SF - -");
    await multiple.nth(0).click({ modifiers: ["Control"] });
    expect(await state(page, "flow-box-multiple")).toBe("SF - S S - -");
    expect(await events(page)).toEqual([
      "selected [0]",
      "selected [2]",
      "selected [2,3]",
      "selected [0,2,3]",
    ]);
    // The second press of a double click activates.
    await multiple.nth(1).dblclick();
    expect(await events(page)).toEqual(["selected [1]", "activated 1"]);
    await page.keyboard.press("Control+a");
    expect(await state(page, "flow-box-multiple")).toBe("S SF S S S S");
    await page.keyboard.press("Control+Shift+a");
    expect(await state(page, "flow-box-multiple")).toBe("- -F - - - -");
    await events(page);
    // A button in a child takes its clicks; an insensitive child gets none.
    await multiple.nth(4).locator("button").click();
    await multiple.nth(5).click({ force: true });
    expect(await events(page)).toEqual(["button clicked"]);
    expect(await state(page, "flow-box-multiple")).toBe("- - - - - -");
  });
}
