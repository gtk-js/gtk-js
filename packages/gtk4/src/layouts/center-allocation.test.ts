// Unit tests — no Playwright/cargo preload needed.

import { expect, test } from "vite-plus/test";
import { allocateCenter, centerTracks } from "./center-allocation.ts";

const child = (min: number, nat = min, expand = false) => ({ min, nat, expand });

test("an expanding center child reaches the wider side child", () => {
  // size - 2 × (max(start, end) + spacing), centered.
  const [start, center, end] = allocateCenter(
    480,
    6,
    [child(70), child(150, 150, true), child(134)],
    true,
  );
  expect(start).toEqual({ pos: 0, size: 70 });
  expect(center).toEqual({ pos: 140, size: 200 });
  expect(end).toEqual({ pos: 346, size: 134 });
});

test("with shrink-center-last FALSE, each side is clamped by the other's minimum", () => {
  // The center child shrinks to its minimum first, then the sides get what the
  // other side's minimum leaves, so the end child overlaps the center one.
  const [start, center, end] = allocateCenter(
    288,
    0,
    [child(75, 133), child(69, 128), child(75, 177)],
    false,
  );
  expect(start).toEqual({ pos: 0, size: 133 });
  expect(center).toEqual({ pos: 133, size: 69 });
  expect(end).toEqual({ pos: 144, size: 144 });
});

test("with shrink-center-last TRUE, the sides shrink first", () => {
  const [start, center, end] = allocateCenter(
    288,
    0,
    [child(75, 133), child(69, 128), child(75, 177)],
    true,
  );
  expect(center!.size).toBe(128);
  expect(start!.size).toBe(85);
  expect(end!.size).toBe(85);
});

test("tracks follow the allocation, GTK's minimum and natural size", () => {
  const { tracks, lines } = centerTracks(
    [
      { pos: 0, size: 70 },
      { pos: 140, size: 200 },
      { pos: 346, size: 134 },
    ],
    204,
    420,
  );
  // The gaps give way first, the widest of them takes the room above.
  expect(tracks).toBe(
    "minmax(70px, 70px) minmax(0px, 70px) minmax(0px, 200px) minmax(0px, 6px) minmax(134px, 134px)",
  );
  expect(lines).toEqual(["1 / 2", "3 / 4", "5 / 6"]);
});

test("overlapping children share tracks; a missing one goes after the last", () => {
  const { lines } = centerTracks([{ pos: 0, size: 133 }, null, { pos: 100, size: 188 }], 0, 0);
  expect(lines).toEqual(["1 / 3", "-1", "2 / 4"]);
});
