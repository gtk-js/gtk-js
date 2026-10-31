import { expect, test } from "vite-plus/test";
import { sheetDecorationLayout } from "./sheet-controls.ts";

test("a dialog's close button goes to the side with more close buttons", () => {
  expect(sheetDecorationLayout("appmenu:minimize,maximize,close")).toBe(":close");
  expect(sheetDecorationLayout("close,minimize,maximize:")).toBe("close:");
  expect(sheetDecorationLayout("close:maximize")).toBe("close:");
  // A tie goes to the end.
  expect(sheetDecorationLayout("close:close")).toBe(":close");
  expect(sheetDecorationLayout("close,close:close")).toBe("close:");
});

test("a layout without a colon puts it on the end", () => {
  expect(sheetDecorationLayout("close")).toBe(":close");
  expect(sheetDecorationLayout("")).toBe(":close");
});
