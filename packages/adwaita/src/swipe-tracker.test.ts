// Unit tests — no Playwright/cargo preload needed.

import { expect, test } from "vite-plus/test";
import { type Swipeable, SwipeTracker } from "./swipe-tracker.ts";

// The DOM bits the tracker touches, for Node.
(globalThis as { Element?: unknown }).Element ??= class {};

const WIDTH = 400;

/** A navigation view going back: snap points -1 and 0, like AdwNavigationView. */
function setup() {
  const widget = Object.assign(new EventTarget(), {
    contains: () => false,
    setPointerCapture: () => {},
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
  }) as unknown as HTMLElement;
  const calls: string[] = [];
  const updates: number[] = [];
  let ended: { velocity: number; to: number } | undefined;
  const swipeable: Swipeable = {
    getDistance: () => WIDTH,
    getSnapPoints: () => [-1, 0],
    getProgress: () => 0,
    getCancelProgress: () => 0,
    prepare: (direction) => calls.push(`prepare ${direction}`),
    beginSwipe: () => calls.push("begin"),
    updateSwipe: (progress) => updates.push(progress),
    endSwipe: (velocity, to) => {
      ended = { velocity, to };
    },
  };
  const tracker = new SwipeTracker(widget, swipeable);
  tracker.attach();
  const send = (type: string, props: Record<string, unknown>) => {
    const event = Object.assign(new Event(type), props);
    Object.defineProperty(event, "timeStamp", { value: props.time });
    widget.dispatchEvent(event);
  };
  /** A one-finger drag along `points` (x, y, ms). */
  const drag = (points: [number, number, number][]) => {
    const [x0, y0, t0] = points[0]!;
    const base = { pointerId: 1, pointerType: "touch", button: 0 };
    send("pointerdown", { ...base, clientX: x0, clientY: y0, time: t0 });
    for (const [x, y, time] of points.slice(1))
      send("pointermove", { ...base, clientX: x, clientY: y, time });
    const [x, y, time] = points[points.length - 1]!;
    send("pointerup", { ...base, clientX: x, clientY: y, time });
  };
  return { tracker, calls, updates, drag, send, end: () => ended };
}

/** Points every 4 px from x = 100 to `to`, `ms` apart. */
const steps = (to: number, ms: number) =>
  Array.from(
    { length: Math.abs(to - 100) / 4 + 1 },
    (_, i) => [100 + Math.sign(to - 100) * i * 4, 100, i * ms] as [number, number, number],
  );

test("a touch drag starts after 16 px and then follows the finger, like AdwSwipeTracker", () => {
  const { calls, updates, drag } = setup();
  drag(steps(200, 50));
  expect(calls).toEqual(["prepare back", "begin"]);
  // Begun at 16 px, with only that move's 4 px applied.
  expect(updates[0]).toBeCloseTo(-4 / WIDTH);
  expect(updates.at(-1)).toBeCloseTo(-(100 - 12) / WIDTH);
});

test("a slow swipe ends on the nearest snap point", () => {
  const short = setup();
  short.drag(steps(260, 50));
  expect(short.end()?.to).toBe(0);
  const long = setup();
  long.drag(steps(340, 50));
  expect(long.end()?.to).toBe(-1);
});

test("a flick goes back even when it's short", () => {
  const { drag, end } = setup();
  // 60 px in 15 ms: 4 px/ms, over VELOCITY_THRESHOLD_TOUCH.
  drag(steps(160, 1));
  expect(end()?.to).toBe(-1);
  expect(end()?.velocity).toBeLessThan(0);
});

test("only touch drags along the swipe start one", () => {
  const vertical = setup();
  vertical.drag([
    [100, 100, 0],
    [101, 130, 16],
    [102, 160, 32],
  ]);
  expect(vertical.calls).toEqual([]);

  // Towards a page there's no snap point for (forward).
  const forward = setup();
  forward.drag(steps(20, 16));
  expect(forward.calls).toEqual(["prepare forward"]);
  expect(forward.updates).toEqual([]);

  // allow-mouse-drag is off.
  const mouse = setup();
  mouse.send("pointerdown", { pointerId: 2, pointerType: "mouse", button: 0, clientX: 0, time: 0 });
  mouse.send("pointermove", { pointerId: 2, pointerType: "mouse", clientX: 100, time: 16 });
  expect(mouse.calls).toEqual([]);
});

test("reversed (RTL) swipes go back towards the left", () => {
  const { tracker, calls, drag, end } = setup();
  tracker.reversed = true;
  drag(steps(-200, 50));
  expect(calls).toEqual(["prepare back", "begin"]);
  expect(end()?.to).toBe(-1);
});

test("touchpad scrolling swipes until it stops", async () => {
  const { send, calls, updates, end } = setup();
  for (let i = 0; i < 10; i++)
    send("wheel", { deltaMode: 0, deltaX: -30, deltaY: 0, time: i * 16 });
  expect(calls).toEqual(["prepare back", "begin"]);
  // In units of TOUCHPAD_BASE_DISTANCE_H, not of the widget's width.
  expect(updates.at(-1)).toBeCloseTo(-300 / 400);
  expect(end()).toBeUndefined();
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(end()?.to).toBe(-1);
});

test("vertical touchpad scrolling isn't a swipe", async () => {
  const { send, calls } = setup();
  send("wheel", { deltaMode: 0, deltaX: -2, deltaY: 30, time: 0 });
  send("wheel", { deltaMode: 0, deltaX: -30, deltaY: 0, time: 16 });
  expect(calls).toEqual([]);
});
