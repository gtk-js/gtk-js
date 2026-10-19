import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  BROWSE_DISABLE_TIMEOUT,
  BROWSE_TIMEOUT,
  HOVER_TIMEOUT,
  TooltipTracker,
  tooltipPosition,
} from "./tooltip.tsx";

/** A connected widget with a tooltip, as far as the tracker looks at it. */
function widget(text: string): Element {
  return { isConnected: true, getAttribute: () => text } as unknown as Element;
}

describe("TooltipTracker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const shownText = (tracker: TooltipTracker) => tracker.getShown()?.text ?? null;

  test("shows once the pointer has rested for HOVER_TIMEOUT; every motion restarts the wait", () => {
    const tracker = new TooltipTracker();
    const add = widget("Add");
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT - 100);
    tracker.motion(add, 11, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT - 1);
    expect(shownText(tracker)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(shownText(tracker)).toBe("Add");
    expect(tracker.getShown()?.pointer).toEqual({ x: 11, y: 10 });
  });

  test("browsing: the next widget's tooltip shows after BROWSE_TIMEOUT", () => {
    const tracker = new TooltipTracker();
    const add = widget("Add");
    const remove = widget("Remove");
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT);
    // The first motion over another widget hides the tooltip...
    tracker.motion(remove, 50, 10);
    expect(shownText(tracker)).toBeNull();
    // ...and the next one starts the short wait.
    tracker.motion(remove, 51, 10);
    vi.advanceTimersByTime(BROWSE_TIMEOUT - 1);
    expect(shownText(tracker)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(shownText(tracker)).toBe("Remove");
  });

  test("browsing ends BROWSE_DISABLE_TIMEOUT after the last tooltip hid", () => {
    const tracker = new TooltipTracker();
    const add = widget("Add");
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT);
    tracker.motion(null, 200, 200);
    vi.advanceTimersByTime(BROWSE_DISABLE_TIMEOUT);
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(BROWSE_TIMEOUT);
    expect(shownText(tracker)).toBeNull();
    vi.advanceTimersByTime(HOVER_TIMEOUT - BROWSE_TIMEOUT);
    expect(shownText(tracker)).toBe("Add");
  });

  test("a press hides the tooltip and cancels a pending one", () => {
    const tracker = new TooltipTracker();
    const add = widget("Add");
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT);
    tracker.hide();
    expect(shownText(tracker)).toBeNull();
    tracker.motion(add, 10, 10);
    tracker.hide();
    vi.advanceTimersByTime(HOVER_TIMEOUT);
    expect(shownText(tracker)).toBeNull();
  });

  test("stays while the pointer moves within the widget", () => {
    const tracker = new TooltipTracker();
    const add = widget("Add");
    tracker.motion(add, 10, 10);
    vi.advanceTimersByTime(HOVER_TIMEOUT);
    tracker.motion(add, 20, 12);
    expect(shownText(tracker)).toBe("Add");
    expect(tracker.getShown()?.pointer).toEqual({ x: 10, y: 10 });
  });
});

describe("tooltipPosition", () => {
  const viewport = { width: 800, height: 600 };
  const size = { width: 60, height: 30 };

  test("centered 4px below the widget", () => {
    // A 34x34 button at (100, 100), the pointer on its center.
    expect(
      tooltipPosition(
        { x: 100, y: 100, width: 34, height: 34 },
        { x: 117, y: 117 },
        size,
        viewport,
      ),
    ).toEqual({ x: 87, y: 138 });
  });

  test("moves toward a pointer more than 32px off the widget's center", () => {
    // A 300px wide row, the pointer 100px right of its center: 68px further right.
    const row = { x: 100, y: 100, width: 300, height: 40 };
    expect(tooltipPosition(row, { x: 350, y: 120 }, size, viewport).x).toBe(250 - 30 + 68);
  });

  test("below the pointer when the widget is taller than 56px", () => {
    expect(
      tooltipPosition({ x: 0, y: 0, width: 400, height: 300 }, { x: 200, y: 150 }, size, viewport),
    ).toEqual({ x: 196 + 12 - 30, y: 146 + 24 });
  });

  test("flips above when there is no room below, and slides to stay in view", () => {
    const corner = { x: 770, y: 560, width: 30, height: 30 };
    expect(tooltipPosition(corner, { x: 785, y: 575 }, size, viewport)).toEqual({
      x: 800 - 60,
      y: 556 - 30,
    });
  });
});
