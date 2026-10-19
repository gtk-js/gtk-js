import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { dragSwitch, GtkSwitch, type SwitchPress } from "./switch.tsx";

describe("GtkSwitch", () => {
  test("active places the slider and sets the checked state, state sets :checked", () => {
    // A delayed state change: gtk_switch_set_active() moved the slider and updated the
    // accessible CHECKED state, gtk_switch_set_state() hasn't set :checked yet.
    const html = renderToStaticMarkup(<GtkSwitch active state={false} />);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("data-switch-active");
    expect(html).not.toContain("data-checked");

    expect(renderToStaticMarkup(<GtkSwitch active={false} state />)).toMatch(
      /^<div role="switch" aria-checked="false"[^>]* data-checked=/,
    );
  });

  test("state follows active by default", () => {
    const html = renderToStaticMarkup(<GtkSwitch active />);
    expect(html).toContain("data-switch-active");
    expect(html).toContain("data-checked");
  });

  test("an insensitive switch leaves the tab order and makes its children insensitive", () => {
    const html = renderToStaticMarkup(<GtkSwitch disabled />);
    expect(html).toMatch(/^<div [^>]*aria-disabled="true" tabindex="-1"/);
    // The switch, both images and the slider (slider:disabled has no shadow).
    expect(html.match(/ data-disabled=/g)).toHaveLength(4);
    expect(renderToStaticMarkup(<GtkSwitch />)).toContain('tabindex="0"');
  });
});

describe("dragging the slider", () => {
  // A press on an Adwaita switch, whose slider moves 20px between off and on.
  const press = (active = false, rtl = false): SwitchPress => ({
    x: 0,
    y: 0,
    rtl,
    travel: 20,
    active,
    pan: "possible",
  });
  const drag = (p: SwitchPress, ...points: [number, number][]) => {
    for (const [x, y] of points) dragSwitch(p, x, y);
    return p.pan;
  };

  test("keeps the slider under the pointer, within the trough", () => {
    expect(drag(press(), [8, 0])).toBe(0.4);
    expect(drag(press(), [15, 0])).toBe(0.75);
    expect(drag(press(), [30, 0], [2, 0])).toBe(0.1);
    expect(drag(press(), [60, 0])).toBe(1);
    expect(drag(press(true), [-15, 0])).toBe(0.25);
    expect(drag(press(true), [-60, 0])).toBe(0);
  });

  test("starts once the pointer goes sideways, and never after it went up or down", () => {
    expect(drag(press(), [2, 2])).toBe("possible");
    expect(drag(press(), [5, 2])).toBe(0.25);
    expect(drag(press(), [1, 5])).toBe("denied");
    expect(drag(press(), [1, 5], [20, 5])).toBe("denied");
  });

  test("is mirrored in RTL", () => {
    expect(drag(press(false, true), [-15, 0])).toBe(0.75);
    expect(drag(press(false, true), [15, 0])).toBe(0);
  });

  test("doesn't start from a press off the slider", () => {
    expect(drag({ ...press(), pan: "denied" }, [15, 0])).toBe("denied");
  });
});
