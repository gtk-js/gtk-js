import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { GtkSpinButton } from "./spin-button.tsx";
import {
  filterNumericEdit,
  formatValue,
  numericInsertAllowed,
  parseInput,
  snapValue,
  spinValue,
  widthChars,
} from "./spin-button-logic.ts";

describe("GtkSpinButton logic", () => {
  test("spinning stops at a bound, and wraps only from it", () => {
    // gtk_spin_button_real_spin(): native PageUp/PageDown/Down from 15 in 0..20.
    let value = 15;
    const seen: number[] = [];
    for (const increment of [10, 10, -1, -10, -10, -10]) {
      value = spinValue(value, increment, 0, 20, true).value;
      seen.push(value);
    }
    expect(seen).toEqual([20, 0, 20, 10, 0, 20]);
    expect(spinValue(19.5, 1, 0, 20, true)).toEqual({ value: 20, wrapped: false });
    expect(spinValue(20, 3, 0, 20, true)).toEqual({ value: 0, wrapped: true });
    expect(spinValue(20, 1, 0, 20, false)).toEqual({ value: 20, wrapped: false });
  });

  test("parses text like g_strtod(), with errors for trailing junk", () => {
    expect(parseInput("25")).toEqual({ value: 25, error: false });
    expect(parseInput("3.75")).toEqual({ value: 3.75, error: false });
    expect(parseInput("-5")).toEqual({ value: -5, error: false });
    expect(parseInput("")).toEqual({ value: 0, error: false });
    expect(parseInput("12abc")).toEqual({ value: 12, error: true });
    expect(parseInput("abc")).toEqual({ value: 0, error: true });
  });

  test("formats, snaps and sizes like GTK", () => {
    expect(formatValue(-0.001, 2)).toBe("0.00");
    expect(formatValue(-1, 0)).toBe("-1");
    expect(snapValue(12, 0, 5)).toBe(10);
    expect(snapValue(12.5, 0, 5)).toBe(15);
    expect(widthChars(0, 20, 0)).toBe(2);
    expect(widthChars(-10, 10, 2)).toBe(6);
    expect(widthChars(0, 1e12, 0)).toBe(10);
  });

  test("numeric text takes digits, one leading sign and one decimal point", () => {
    expect(numericInsertAllowed("5", "x", 1, 0)).toBe(false);
    expect(numericInsertAllowed("5", "-", 1, 0)).toBe(false);
    expect(numericInsertAllowed("5", "-", 0, 0)).toBe(true);
    expect(numericInsertAllowed("-5", "1", 0, 0)).toBe(false);
    expect(numericInsertAllowed("3", ".", 1, 0)).toBe(false);
    expect(numericInsertAllowed("3", ".", 1, 2)).toBe(true);
    expect(numericInsertAllowed("3.75", "1", 4, 2)).toBe(false);
    // Typing over a selection deletes it even when the insert is refused.
    expect(filterNumericEdit("12", "a", 0)).toEqual({ text: "", caret: 0 });
    expect(filterNumericEdit("12", "132", 0)).toEqual({ text: "132", caret: 2 });
  });
});

describe("GtkSpinButton", () => {
  test("the text is the spin button for AT, and the buttons aren't", () => {
    const html = renderToStaticMarkup(
      <GtkSpinButton value={5} min={0} max={20} aria-label="Count" />,
    );
    expect(html).toMatch(
      /<input class="gtk-text" type="text" role="spinbutton" aria-valuenow="5" aria-valuemin="0" aria-valuemax="20" aria-label="Count"/,
    );
    expect(
      html.match(
        /<button[^>]*aria-hidden="true"[^>]*tabindex="-1"|<button[^>]*tabindex="-1"[^>]*aria-hidden="true"/g,
      ),
    ).toHaveLength(2);
    expect(html).toContain('class="gtk-spinbutton gtk-box-layout horizontal"');
  });

  test("clamps the value and lays out vertically with up first", () => {
    const html = renderToStaticMarkup(
      <GtkSpinButton value={150} min={0} max={100} orientation="vertical" />,
    );
    expect(html).toContain('value="100"');
    expect(html.indexOf("up")).toBeLessThan(html.indexOf("gtk-text"));
    expect(html.indexOf("gtk-text")).toBeLessThan(html.indexOf("down"));
    expect(html).toContain("text-align:center");
  });

  test("an insensitive spin button disables its text and buttons", () => {
    const html = renderToStaticMarkup(<GtkSpinButton value={5} min={0} max={20} disabled />);
    expect(html).toContain("data-disabled");
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
