import { describe, expect, test } from "vite-plus/test";
import { getBounds, SwipeTracker } from "./swipe-tracker.ts";

/** A swipe from `from` that moves `deltas` px, one every `interval` ms, over pages `distance` px apart. */
function swipe(
  deltas: number[],
  { from = 0, interval = 16, distance = 400, pages = 4, allowLongSwipes = false } = {},
) {
  const tracker = new SwipeTracker();
  tracker.points = Array.from({ length: pages }, (_, i) => i);
  tracker.allowLongSwipes = allowLongSwipes;
  tracker.prepare(from);
  let time = 1000;
  let progress = from;
  for (const delta of deltas) {
    time += interval;
    tracker.record(delta, time);
    progress = tracker.update(delta / distance);
  }
  return { progress, ...tracker.end(time, false) };
}

describe("SwipeTracker", () => {
  test("a swipe reaches the snap points next to where it started (get_bounds())", () => {
    const points = [0, 1, 2, 3];
    expect(getBounds(points, 0)).toEqual([0, 1]);
    expect(getBounds(points, 2)).toEqual([1, 3]);
    expect(getBounds(points, 1.5)).toEqual([0, 3]);
  });

  test("a slow swipe goes to the closest page", () => {
    expect(swipe(Array(12).fill(10), { interval: 60 }).to).toBe(0);
    expect(swipe(Array(30).fill(10), { interval: 60 }).to).toBe(1);
  });

  test("a quick flick goes on to the next page", () => {
    const { velocity, to } = swipe([20, 20, 20, 20], { interval: 8 });
    expect(velocity).toBeCloseTo(2.5);
    expect(to).toBe(1);
    expect(swipe([-20, -20, -20, -20], { from: 2, interval: 8 }).to).toBe(1);
  });

  test("without long swipes, one swipe goes one page at most", () => {
    const { progress, to } = swipe(Array(30).fill(30), { interval: 8 });
    expect(progress).toBe(1);
    expect(to).toBe(1);
  });

  test("with long swipes, a fling goes as far as its speed takes it", () => {
    expect(swipe(Array(10).fill(40), { interval: 8, allowLongSwipes: true }).to).toBe(3);
  });
});
