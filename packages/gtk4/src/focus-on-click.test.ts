import type { MouseEvent, PointerEvent } from "react";
import { describe, expect, test } from "vite-plus/test";
import { noFocusOnClick } from "./focus-on-click.ts";

/** The bits of the DOM noFocusOnClick() uses: a window and element attributes. */
class FakeElement {
  readonly attributes = new Set<string>();
  constructor(
    readonly name: string,
    readonly parentElement: FakeElement | null,
    readonly ownerDocument: { defaultView: EventTarget },
  ) {}
  setAttribute(name: string) {
    this.attributes.add(name);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  closest(selector: string): FakeElement | null {
    const matches = {
      "[data-gtk-provider]": (el: FakeElement) => el.name === "provider",
      "[data-disabled], :disabled": (el: FakeElement) => el.attributes.has("data-disabled"),
    }[selector];
    if (!matches) throw new Error(`Unexpected selector ${selector}`);
    for (let el: FakeElement | null = this; el; el = el.parentElement) {
      if (matches(el)) return el;
    }
    return null;
  }
}

function scene() {
  const view = new EventTarget();
  const doc = { defaultView: view };
  const body = new FakeElement("body", null, doc);
  const provider = new FakeElement("provider", body, doc);
  const headerbar = new FakeElement("headerbar", provider, doc);
  const button = new FakeElement("button", headerbar, doc);
  const image = new FakeElement("image", button, doc);
  const pressed = () =>
    [body, provider, headerbar, button, image].filter((el) => el.attributes.has("data-pressed"));
  const pointer = (type: string, pointerId: number) =>
    view.dispatchEvent(Object.assign(new Event(type), { pointerId }));
  const press = (which: number, pointerId = 1, target: FakeElement = button) =>
    noFocusOnClick().onPointerDown({
      button: which,
      pointerId,
      target,
      currentTarget: button,
    } as unknown as PointerEvent<Element>);
  return { view, provider, headerbar, button, image, pressed, pointer, press };
}

describe("noFocusOnClick", () => {
  test("mousedown's default is prevented, so the focus stays", () => {
    let prevented = false;
    let own = false;
    noFocusOnClick({ onMouseDown: () => (own = true) }).onMouseDown({
      preventDefault: () => (prevented = true),
    } as unknown as MouseEvent<Element>);
    expect([prevented, own]).toEqual([true, true]);
  });

  test("a press marks the widget and its ancestors until the button is released", () => {
    const { provider, headerbar, button, pressed, pointer, press } = scene();
    press(0);
    // Like GTK's active state and :active; nothing above the provider.
    expect(pressed()).toEqual([provider, headerbar, button]);
    // Another pointer's release doesn't end it.
    pointer("pointerup", 2);
    expect(pressed()).toHaveLength(3);
    pointer("pointerup", 1);
    expect(pressed()).toEqual([]);
  });

  test("the element pressed inside the widget is pressed too, like the widget GTK picks", () => {
    const { provider, headerbar, button, image, pressed, pointer, press } = scene();
    press(0, 1, image);
    expect(pressed()).toEqual([provider, headerbar, button, image]);
    pointer("pointerup", 1);
    expect(pressed()).toEqual([]);
  });

  test("only the presses `claims` takes keep the focus and press", () => {
    const { button, image, pressed } = scene();
    const handlers = noFocusOnClick({}, (e) => (e.target as unknown) !== image);
    let prevented = false;
    handlers.onMouseDown({
      target: image,
      currentTarget: button,
      preventDefault: () => (prevented = true),
    } as unknown as MouseEvent<Element>);
    handlers.onPointerDown({
      button: 0,
      pointerId: 1,
      target: image,
      currentTarget: button,
    } as unknown as PointerEvent<Element>);
    expect([prevented, pressed()]).toEqual([false, []]);
    handlers.onMouseDown({
      target: button,
      currentTarget: button,
      preventDefault: () => (prevented = true),
    } as unknown as MouseEvent<Element>);
    expect(prevented).toBe(true);
  });

  test("a cancelled press or the window losing the pointer ends it too", () => {
    const { view, pressed, pointer, press } = scene();
    press(0);
    pointer("pointercancel", 1);
    expect(pressed()).toEqual([]);
    press(0);
    view.dispatchEvent(new Event("blur"));
    expect(pressed()).toEqual([]);
  });

  test("only the primary button presses, as with :active", () => {
    const { pressed, press } = scene();
    press(1);
    press(2);
    expect(pressed()).toEqual([]);
  });

  test("an insensitive widget isn't pressed", () => {
    const { headerbar, pressed, press } = scene();
    headerbar.setAttribute("data-disabled");
    press(0);
    expect(pressed()).toEqual([]);
  });

  test("the widget's own pointerdown handler runs", () => {
    const { button } = scene();
    let own = false;
    noFocusOnClick({ onPointerDown: () => (own = true) }).onPointerDown({
      button: 0,
      pointerId: 1,
      currentTarget: button,
    } as unknown as PointerEvent<Element>);
    expect(own).toBe(true);
  });
});
