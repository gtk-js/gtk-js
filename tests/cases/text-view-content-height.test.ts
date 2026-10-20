import { expect } from "vite-plus/test";
import { findChild, gtkTest } from "../harness";

// A text view is as tall as its text, not a <textarea>'s two rows, and needs
// no width but its margins, not twenty columns' (gtk_text_view_measure()), so
// it fills its box without widening it.
gtkTest("text-view-content-height", (native, web) => {
  const [nativeView, webView] = [findChild(native, "textview"), findChild(web, "textview")];
  expect(nativeView.width).toBe(native.width);
  expect(webView.width).toBe(web.width);
  // Three whole-pixel lines.
  expect(Math.abs(webView.height - nativeView.height)).toBeLessThanOrEqual(1);
});
