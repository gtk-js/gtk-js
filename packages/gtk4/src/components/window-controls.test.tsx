import { describe, expect, test } from "vite-plus/test";
import { windowControlButtons } from "./window-controls.tsx";

describe("decoration layout", () => {
  test("only minimize, maximize and close make buttons", () => {
    expect(windowControlButtons("menu:minimize,maximize,close", "start")).toEqual([]);
    expect(windowControlButtons("icon,appmenu:close", "start")).toEqual([]);
    expect(windowControlButtons("menu:minimize,maximize,close", "end")).toEqual([
      "minimize",
      "maximize",
      "close",
    ]);
  });

  test("without a colon, both sides use the whole layout", () => {
    expect(windowControlButtons("close", "start")).toEqual(["close"]);
    expect(windowControlButtons("close", "end")).toEqual(["close"]);
  });

  test("splits at the first colon only", () => {
    expect(windowControlButtons("close:minimize:maximize", "end")).toEqual([]);
    expect(windowControlButtons(":", "start")).toEqual([]);
  });
});
