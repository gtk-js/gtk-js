import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkCheckButton } from "./check-button.tsx";
import {
  type Box,
  deactivateOthers,
  type GroupMember,
  joinGroup,
  nextInDirection,
} from "./check-button-group.ts";

describe("GtkCheckButton", () => {
  test("centers the indicator, like gtk_check_button_init()", () => {
    const html = renderToStaticMarkup(<GtkCheckButton label="Check" active inconsistent />);
    expect(html).toMatch(
      /<span class="gtk-check" data-halign="center" data-valign="center" data-checked="true" data-indeterminate="true">/,
    );
  });

  test("an empty label is no label", () => {
    const html = renderToStaticMarkup(<GtkCheckButton label="" />);
    expect(html).not.toContain("text-button");
    expect(html).not.toContain("gtk-label");
  });

  test("an insensitive button can't take the focus and dims its indicator and label", () => {
    const html = renderToStaticMarkup(<GtkCheckButton label="Check" disabled />);
    expect(html).toMatch(/^<div role="checkbox" aria-checked="false" aria-disabled="true" class=/);
    expect(html).not.toContain("tabindex");
    expect(html).toMatch(/<span class="gtk-check"[^>]* data-disabled="true">/);
    expect(html).toContain('<span class="gtk-label" data-disabled="true">Check</span>');
  });
});

/** A group member at `box`, recording its toggles. */
function member(box: Box, active = false, disabled = false) {
  const toggles: boolean[] = [];
  const m: GroupMember & { box: Box; toggles: boolean[] } = {
    element: null,
    active,
    disabled,
    box,
    toggles,
    activate() {},
    deactivate() {
      m.active = false;
      toggles.push(false);
    },
  };
  return m;
}

describe("check button groups", () => {
  test("activating a button deactivates the others, like gtk_check_button_set_active()", () => {
    const [a, b, c] = [member(row(0), true), member(row(1)), member(row(2))];
    const leave = [a, b, c].map((m) => joinGroup("test", m));
    deactivateOthers("test", c);
    expect([a.active, b.active]).toEqual([false, false]);
    expect([a.toggles, b.toggles, c.toggles]).toEqual([[false], [], []]);
    for (const l of leave) l();
  });

  test("the arrow keys move along the group without wrapping, past insensitive buttons", () => {
    const [a, b, c, d] = [
      member(row(0)),
      member(row(1), false, true),
      member(row(2)),
      member(row(3)),
    ];
    const next = (from: typeof a, direction: "left" | "right" | "up" | "down") =>
      nextInDirection(
        from,
        [d, c, b, a],
        direction,
        (m) => m.box,
        (m) => !m.disabled,
      );
    expect(next(a, "right")).toBe(c);
    expect(next(c, "right")).toBe(d);
    expect(next(d, "right")).toBeNull();
    expect(next(d, "left")).toBe(c);
    expect(next(c, "left")).toBe(a);
    expect(next(a, "left")).toBeNull();
    // Nothing above or below a row.
    expect(next(a, "down")).toBeNull();
  });

  test("up and down move along a column", () => {
    const column = (i: number) => ({ x: 0, y: i * 28, width: 80, height: 28 });
    const [a, b, c] = [member(column(0)), member(column(1)), member(column(2))];
    const next = (from: typeof a, direction: "up" | "down" | "right") =>
      nextInDirection(
        from,
        [a, b, c],
        direction,
        (m) => m.box,
        () => true,
      );
    expect(next(a, "down")).toBe(b);
    expect(next(c, "up")).toBe(b);
    expect(next(b, "right")).toBeNull();
  });
});

/** The box of the `i`th button in a row. */
function row(i: number): Box {
  return { x: i * 100, y: 0, width: 90, height: 28 };
}
