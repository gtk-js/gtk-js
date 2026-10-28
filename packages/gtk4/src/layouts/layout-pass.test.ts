// Unit tests — no Playwright/cargo preload needed.

import { expect, test } from "vite-plus/test";
import { scheduleLayout } from "./layout-pass.ts";

const pass = () => new Promise<void>((resolve) => queueMicrotask(resolve));

test("every read runs before any write", async () => {
  const log: string[] = [];
  scheduleLayout(() => {
    log.push("read a");
    return () => log.push("write a");
  });
  scheduleLayout(() => {
    log.push("read b");
    return () => log.push("write b");
  });
  expect(log).toEqual([]);
  await pass();
  expect(log).toEqual(["read a", "read b", "write a", "write b"]);
});

test("a read scheduled twice before the pass runs once", async () => {
  let reads = 0;
  const read = () => {
    reads++;
  };
  scheduleLayout(read);
  scheduleLayout(read);
  await pass();
  expect(reads).toBe(1);
});

test("a read scheduled by a write runs in a pass of its own, after the writes", async () => {
  const log: string[] = [];
  scheduleLayout(() => () => {
    scheduleLayout(() => {
      log.push("read b");
    });
    log.push("write a");
  });
  scheduleLayout(() => () => log.push("write c"));
  await pass();
  await pass();
  expect(log).toEqual(["write a", "write c", "read b"]);
});
