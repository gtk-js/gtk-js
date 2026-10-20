// Unit tests — no Playwright/cargo preload needed.
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { AdwBreakpointBin, parseBreakpointCondition } from "./breakpoint-bin.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Whether `condition` matches a `width`×`height` bin; null if it can't be parsed. */
function matches(condition: string, width: number, height: number): boolean | null {
  const check = parseBreakpointCondition(condition);
  return check && check(width, height);
}

// Expected values follow adw_breakpoint_condition_parse() and check_condition()
// in adw-breakpoint.c, and were checked against libadwaita 1.8.
describe("parseBreakpointCondition", () => {
  test("reads lengths in px, pt and sp", () => {
    expect(matches("max-width: 300px", 300, 40)).toBe(true);
    expect(matches("max-width: 300px", 301, 40)).toBe(false);
    expect(matches("min-height: 100", 50, 100)).toBe(true);
    // 400pt = 533⅓px at 96 dpi.
    expect(matches("max-width: 400pt", 450, 40)).toBe(true);
    expect(matches("max-width: 300sp", 300, 40)).toBe(true);
    expect(matches("max-width:1e2px", 100, 40)).toBe(true);
  });

  test("reads aspect ratios", () => {
    expect(matches("min-aspect-ratio: 4/3", 400, 300)).toBe(true);
    expect(matches("min-aspect-ratio: 4 / 3", 399, 300)).toBe(false);
    expect(matches("max-aspect-ratio: 1", 300, 300)).toBe(true);
  });

  test("combines conditions from left to right, and in parentheses", () => {
    expect(matches("max-width: 300px or max-height: 100px", 500, 40)).toBe(true);
    expect(matches("(max-width: 300px) and (max-height: 100px)", 500, 40)).toBe(false);
    expect(matches("(max-width: 300px) and (max-height: 100px)", 300, 40)).toBe(true);
    // Without parentheses, the first operator takes priority.
    expect(matches("max-width: 600px or max-height: 10px and min-width: 600px", 500, 40)).toBe(
      false,
    );
    expect(
      matches("min-width: 400px and ( max-aspect-ratio: 4/3 or ((max-height: 100px)) )", 500, 40),
    ).toBe(true);
  });

  test("rejects what GTK can't parse, so the breakpoint never applies", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const condition of [
      "max-widht: 300px",
      "max-width: 300em",
      "max-width: -5px",
      "max-width: 300px)",
      "(max-width: 300px",
      "max-width: 300px xor max-height: 100px",
      "max-width: 300px and(max-height: 100px)",
      "max-aspect-ratio: 4/0",
      // A unitless length or a ratio without a height can't be followed by an
      // operator: GTK skips the spaces looking for the unit or the slash.
      "max-width: 300 or max-height: 100px",
      "max-aspect-ratio: 1 or max-width: 300px",
      "",
    ]) {
      expect(parseBreakpointCondition(condition), condition).toBeNull();
    }
    expect(error).toHaveBeenCalledTimes(11);
    // Like GTK's g_critical(), with the position.
    expect(error.mock.calls[0]![0]).toBe(
      "Unable to parse condition: unknown type\nmax-widht: 300px\n^",
    );
    expect(error.mock.calls[1]![0]).toBe(
      `Unable to parse condition: unknown unit\nmax-width: 300em\n${"-".repeat(14)}^`,
    );
  });
});

describe("AdwBreakpointBin", () => {
  test("is a widget node that gives its child its whole size", () => {
    const html = renderToStaticMarkup(
      <AdwBreakpointBin className="app">
        <span />
      </AdwBreakpointBin>,
    );
    expect(html).toBe(
      '<div class="gtk-widget gtk-bin-layout app" style="overflow:hidden"><span></span></div>',
    );
  });
});
