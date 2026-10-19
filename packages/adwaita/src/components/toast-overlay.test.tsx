// Unit tests — no Playwright/cargo preload needed.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import {
  type AdwToast,
  AdwToastOverlay,
  addToastTo,
  type OverlayState,
  ToastWidget,
} from "./toast-overlay.tsx";

const noop = () => {};

function toastMarkup(toast: AdwToast) {
  const shown = { key: 1, toast, replacing: false, resets: 0 };
  return renderToStaticMarkup(
    <ToastWidget shown={shown} hiding={false} onDismiss={noop} onHidden={noop} />,
  );
}

describe("AdwToastOverlay nodes", () => {
  test("is a clipping group laying out its child and toasts in one cell", () => {
    const html = renderToStaticMarkup(<AdwToastOverlay>child</AdwToastOverlay>);
    expect(html).toBe(
      '<div role="group" class="gtk-toastoverlay gtk-bin-layout" style="overflow:clip">child</div>',
    );
  });

  test("the title ellipsizes in a heading label", () => {
    const html = toastMarkup({ title: "Hello!" });
    expect(html).toContain(
      '<div class="gtk-widget" style="flex:1;min-width:0;display:flex"><span class="gtk-label heading"',
    );
    expect(html).toMatch(/text-overflow:ellipsis[^>]*>Hello!<\/span>/);
  });

  test("the action button is a text button whose label uses underlines for mnemonics", () => {
    const html = toastMarkup({ title: "Deleted", buttonLabel: "_Undo" });
    expect(html).toMatch(/<button class="gtk-button text-button"[^>]* type="button"/);
    expect(html).not.toContain("_Undo");
    expect(html).toMatch(/>U<\/span>ndo</);
  });

  test("the close button is a circular flat image button with a tooltip", () => {
    const html = toastMarkup({ title: "Hello!" });
    const close = html.match(/<button [^>]*>/)?.[0] ?? "";
    expect(close).toMatch(/class="gtk-button flat image-button circular"/);
    expect(close).toContain('title="Dismiss"');
    expect(close).toContain('type="button"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});

describe("addToastTo", () => {
  const empty: OverlayState = { current: null, hiding: [], queue: [] };
  const a: AdwToast = { title: "A" };
  const b: AdwToast = { title: "B" };
  const c: AdwToast = { title: "C" };
  const high: AdwToast = { title: "High", priority: "high" };

  test("shows a toast, then queues the next ones", () => {
    const s = [a, b, c].reduce(addToastTo, empty);
    expect(s.current?.toast).toBe(a);
    expect(s.queue).toEqual([b, c]);
  });

  test("adding the shown toast again restarts its timeout", () => {
    const s1 = addToastTo(empty, a);
    const s2 = addToastTo(s1, a);
    expect(s2.current).toEqual({ ...s1.current, resets: 1 });
    expect(s2.queue).toEqual([]);
  });

  test("adding a queued toast bumps it after the high-priority ones, like bump_toast()", () => {
    const s = [a, b, c].reduce(addToastTo, empty);
    const withHigh = { ...s, queue: [high, b, c] };
    expect(addToastTo(withHigh, c).queue).toEqual([high, c, b]);
    expect(addToastTo({ ...s, queue: [b, c, high] }, high).queue).toEqual([high, b, c]);
  });

  test("a high-priority toast postpones the shown one", () => {
    const s = addToastTo(addToastTo(addToastTo(empty, a), b), high);
    expect(s.current?.toast).toBe(high);
    expect(s.hiding.map((t) => t.toast)).toEqual([a]);
    expect(s.queue).toEqual([a, b]);
  });
});
