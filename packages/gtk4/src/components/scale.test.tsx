// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import type { GtkOrientation } from "../types.ts";
import {
  GtkScale,
  type GtkScaleRange,
  gtkScaleKeyBinding,
  gtkScaleScroll,
  gtkScaleWheelDelta,
} from "./scale.tsx";

const range = (orientation: GtkOrientation, inverted = false): GtkScaleRange => ({
  value: 50,
  min: 0,
  max: 100,
  step: 1,
  page: 10,
  orientation,
  inverted,
  marks: [],
});

/** The value a key press moves a scale at 50 to. */
function press(r: GtkScaleRange, key: string, mods: { ctrl?: boolean; shift?: boolean } = {}) {
  const binding = gtkScaleKeyBinding({
    key,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
    altKey: false,
    metaKey: false,
  });
  return binding && gtkScaleScroll(r, binding);
}

describe("GtkScale keys (gtk_scale_class_init, gtk_range_scroll)", () => {
  test("arrows move the slider visually along the scale; Home/End go to min/max", () => {
    // Values native GTK reaches from 50 (move-slider with each key's scroll type).
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
    const table = (r: GtkScaleRange) => keys.map((k) => press(r, k));
    expect(table(range("horizontal"))).toEqual([51, 49, 49, 51, 0, 100]);
    expect(table(range("horizontal", true))).toEqual([51, 49, 51, 49, 0, 100]);
    expect(table(range("vertical"))).toEqual([49, 51, 49, 51, 0, 100]);
    expect(table(range("vertical", true))).toEqual([51, 49, 49, 51, 0, 100]);
  });

  test("Page Up/Down, Ctrl+arrows and Ctrl+± move by a page; ± by a step", () => {
    const h = range("horizontal");
    expect(press(h, "PageUp")).toBe(60);
    expect(press(h, "PageDown")).toBe(40);
    expect(press(h, "ArrowLeft", { ctrl: true })).toBe(40);
    expect(press(h, "ArrowRight", { ctrl: true })).toBe(60);
    expect(press(h, "+", { shift: true })).toBe(51);
    expect(press(h, "-")).toBe(49);
    expect(press(h, "+", { ctrl: true })).toBe(60);
    expect(press(range("vertical"), "PageUp")).toBe(40);
    expect(press(range("horizontal", true), "ArrowLeft", { ctrl: true })).toBe(60);
  });

  test("Shift+arrow is not bound", () => {
    expect(press(range("horizontal"), "ArrowRight", { shift: true })).toBeNull();
  });

  test("a step stops at a mark it crosses but moves on from one (apply_marks)", () => {
    const r = { ...range("horizontal"), marks: [0, 50, 100] };
    const values = [48];
    for (let i = 0; i < 6; i++)
      values.push(gtkScaleScroll({ ...r, value: values.at(-1)! }, "step-right"));
    expect(values.slice(1)).toEqual([49, 50, 51, 52, 53, 54]);
    expect(gtkScaleScroll({ ...r, value: 49.5 }, "step-right")).toBe(50);
    expect(gtkScaleScroll({ ...r, value: 45 }, "page-up")).toBe(50);
  });
});

describe("GtkScale wheel (gtk_range_scroll_controller_scroll)", () => {
  const notch = { deltaX: 0, deltaY: 100, deltaMode: 0, wheelDeltaY: -120 };
  test("a wheel notch moves a page: down decreases a horizontal scale, increases a vertical one", () => {
    expect(gtkScaleWheelDelta(range("horizontal"), 200, notch)).toBe(-10);
    expect(gtkScaleWheelDelta(range("vertical"), 200, notch)).toBe(10);
    expect(gtkScaleWheelDelta(range("vertical", true), 200, notch)).toBe(-10);
    expect(
      gtkScaleWheelDelta(range("horizontal"), 200, { ...notch, deltaY: -3, deltaMode: 1 }),
    ).toBe(10);
  });

  test("smooth scrolling moves by the pixels scrolled along the trough", () => {
    const touchpad = { deltaX: 20, deltaY: 5, deltaMode: 0 };
    expect(gtkScaleWheelDelta(range("horizontal"), 200, touchpad)).toBe(10);
    expect(gtkScaleWheelDelta(range("horizontal", true), 200, touchpad)).toBe(-10);
    expect(gtkScaleWheelDelta(range("vertical"), 200, touchpad)).toBe(2.5);
  });
});

describe("GtkScale nodes", () => {
  test("marks.top and marks.bottom like gtk_scale_add_mark()", () => {
    const html = renderToStaticMarkup(
      <GtkScale
        value={20}
        inverted
        marks={[
          { value: 0, label: "Low" },
          { value: 50, position: "top", label: "Mid" },
          { value: 100, label: "High" },
        ]}
      />,
    );
    expect(html).toContain('class="gtk-scale horizontal marks-before marks-after"');
    const order = [
      ...html.matchAll(
        /class="gtk-(marks [a-z]+|trough|label|indicator|highlight [a-z]+)"|>(\w+)</g,
      ),
    ]
      .map((m) => m[1] ?? m[2])
      .join(" ");
    // Top marks put the label first, bottom marks the indicator; an inverted
    // scale orders its marks from max to min and highlights from the end.
    expect(order).toBe(
      "marks top label Mid indicator marks bottom indicator label High indicator label Low trough highlight bottom",
    );
  });

  test("an insensitive scale is :disabled and not focusable", () => {
    const html = renderToStaticMarkup(<GtkScale disabled />);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('data-disabled="true"');
    expect(html).not.toContain("tabindex");
    expect(renderToStaticMarkup(<GtkScale />)).toContain('tabindex="0"');
  });
});
