// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { addMonths, calendarDays, GtkCalendar, moveCursor } from "./calendar.tsx";

/** The real grid's markup (without the sizer's copies). */
function grid(html: string): string {
  return html.slice(html.indexOf('role="grid"'), html.indexOf("data-sizer"));
}

function texts(html: string, cls: string): string[] {
  return [...html.matchAll(new RegExp(`class="gtk-label ${cls}[^"]*"[^>]*>([^<]*)<`, "g"))].map(
    (m) => m[1] ?? "",
  );
}

describe("GtkCalendar days", () => {
  test("week numbers are those of each week's last day, like week_of_year()", () => {
    const october = renderToStaticMarkup(
      <GtkCalendar showWeekNumbers year={2026} month={9} day={1} />,
    );
    expect(texts(grid(october), "week-number")).toEqual(["40", "41", "42", "43", "44", "45"]);
    // Saturday 2 January 2027 is in ISO week 53 of 2026.
    const january = renderToStaticMarkup(
      <GtkCalendar showWeekNumbers year={2027} month={0} day={1} />,
    );
    expect(texts(grid(january), "week-number")).toEqual(["53", "1", "2", "3", "4", "5"]);
  });

  test("a month starting on Sunday has a week of the previous month before it", () => {
    const days = calendarDays(2026, 10);
    expect(days.slice(0, 8)).toEqual([
      ...[25, 26, 27, 28, 29, 30, 31].map((day) => ({ day, month: -1 })),
      { day: 1, month: 0 },
    ]);
  });

  test("year 1 starts on a Monday, with nothing before it", () => {
    const html = renderToStaticMarkup(<GtkCalendar year={1} month={0} day={15} />);
    const days = texts(grid(html), "day-number");
    expect(days.slice(0, 2)).toEqual(["", "1"]);
    expect(grid(html)).toMatch(/class="gtk-label day-number other-month"[^>]*data-disabled="true"/);
    // Previous Month and Previous Year are insensitive.
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.map((b) => b.includes('disabled=""'))).toEqual([true, false, true, false]);
  });

  test("switching months keeps the day in the month, like g_date_time_add_months()", () => {
    expect(addMonths({ year: 2026, month: 9, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 10,
      day: 30,
    });
    expect(addMonths({ year: 2024, month: 1, day: 29 }, 12)).toEqual({
      year: 2025,
      month: 1,
      day: 28,
    });
    expect(addMonths({ year: 2026, month: 0, day: 15 }, -1)).toEqual({
      year: 2025,
      month: 11,
      day: 15,
    });
  });
});

describe("GtkCalendar states", () => {
  test("marked days are :checked, the selected day only :selected", () => {
    const html = grid(
      renderToStaticMarkup(<GtkCalendar year={2026} month={9} day={16} markedDays={[5, 16]} />),
    );
    const checked = [...html.matchAll(/data-checked="true"[^>]*>(\d+)</g)].map((m) => m[1]);
    expect(checked).toEqual(["5", "16"]);
    expect(html).toMatch(/aria-selected="true"[^>]*>16</);
    // Other months' days aren't marked.
    expect(html).not.toMatch(/other-month"[^>]*data-checked/);
  });

  test("the calendar is a Tab stop and the theme's focus ring follows its cursor", () => {
    const html = renderToStaticMarkup(<GtkCalendar year={2026} month={9} day={16} />);
    expect(html).toMatch(/^<div class="gtk-calendar view[^"]*" tabindex="0"/);
    expect(html).not.toContain("data-focus");
  });

  test("disabled makes every node insensitive and leaves the Tab order", () => {
    const html = renderToStaticMarkup(<GtkCalendar year={2026} month={9} day={16} disabled />);
    expect(html).not.toContain("tabindex");
    expect(html).toMatch(
      /^<div class="gtk-calendar view[^"]*" aria-disabled="true" data-disabled="true"/,
    );
    expect(html.match(/<button[^>]*>/g)?.every((b) => b.includes('disabled=""'))).toBe(true);
    for (const label of grid(html).match(/<span class="gtk-label[^>]*>/g) ?? []) {
      expect(label).toContain('data-disabled="true"');
    }
  });
});

describe("GtkCalendar header", () => {
  test("image buttons with GTK's tooltips, and the month in a stack", () => {
    const html = renderToStaticMarkup(<GtkCalendar year={2026} month={8} day={1} />);
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.map((b) => b.match(/data-gtk-tooltip="([^"]*)"/)?.[1])).toEqual([
      "Previous Month",
      "Next Month",
      "Previous Year",
      "Next Year",
    ]);
    for (const button of buttons) {
      expect(button).toContain('class="gtk-button image-button"');
      expect(button).toContain('type="button"');
    }
    // A homogeneous stack is as wide as its widest month.
    expect(html).toContain('class="gtk-stack month"');
    expect(html.match(/class="gtk-label"[^>]*>[A-Z][a-z]+</g)).toHaveLength(12);
    expect(html).toMatch(/class="gtk-label year"[^>]*data-init-label="\d+"[^>]*>2026</);
  });
});

describe("GtkCalendar cursor", () => {
  test("arrows move it like move_focus(), from a corner when there's none", () => {
    expect(moveCursor(null, "right")).toEqual({ row: 0, col: 0 });
    expect(moveCursor(null, "left")).toEqual({ row: 5, col: 6 });
    expect(moveCursor(null, "up")).toEqual({ row: 5, col: 6 });
    expect(moveCursor(null, "down")).toEqual({ row: 0, col: 0 });
    // Left and right go on to the previous or next week; up and down stop.
    expect(moveCursor({ row: 1, col: 6 }, "right")).toEqual({ row: 2, col: 0 });
    expect(moveCursor({ row: 2, col: 0 }, "left")).toEqual({ row: 1, col: 6 });
    expect(moveCursor({ row: 5, col: 6 }, "right")).toEqual({ row: 5, col: 6 });
    expect(moveCursor({ row: 0, col: 3 }, "up")).toEqual({ row: 0, col: 3 });
    expect(moveCursor({ row: 5, col: 3 }, "down")).toEqual({ row: 5, col: 3 });
    // Right to left, the arrows swap.
    expect(moveCursor({ row: 1, col: 3 }, "right", true)).toEqual({ row: 1, col: 2 });
  });
});
