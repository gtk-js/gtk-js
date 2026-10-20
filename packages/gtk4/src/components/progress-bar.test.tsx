import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";
import { advanceActivity, GtkProgressBar, type GtkProgressBarActivity } from "./progress-bar.tsx";

describe("GtkProgressBar", () => {
  test("inverted, the progress is the fraction from the end (allocate_trough())", () => {
    const html = renderToStaticMarkup(<GtkProgressBar fraction={0.3} inverted />);
    expect(html).toContain('class="gtk-progress right" style="width:30%;justify-self:end"');
    const vertical = renderToStaticMarkup(
      <GtkProgressBar fraction={1} inverted orientation="vertical" />,
    );
    expect(vertical).toContain('class="gtk-progress top bottom"');
  });

  test("the fraction is clamped, like gtk_progress_bar_set_fraction()", () => {
    const html = renderToStaticMarkup(<GtkProgressBar fraction={1.5} showText />);
    expect(html).toContain(">100\u200a%</span>");
    expect(html).toContain('class="gtk-trough full"');
    expect(html).toContain("width:100%");
  });

  test("the text is the text node, ellipsized when asked", () => {
    const html = renderToStaticMarkup(<GtkProgressBar showText text="Long" ellipsize="end" />);
    expect(html).toContain(
      '<span class="gtk-text" style="overflow:hidden;text-overflow:ellipsis">Long</span>',
    );
    expect(renderToStaticMarkup(<GtkProgressBar showText text="" />)).toContain(
      '<span class="gtk-text"></span>',
    );
  });

  test("disabled sets data-disabled", () => {
    expect(renderToStaticMarkup(<GtkProgressBar disabled />)).toMatch(
      /class="gtk-progressbar[^"]*"[^>]*data-disabled="true"/,
    );
  });

  test("the pulse block follows the pulses, like tick_cb()", () => {
    const t = 1.7e12;
    // One pulse: the block stays.
    const a: GtkProgressBarActivity = {
      active: true,
      pos: 0,
      dir: 0,
      pulse1: 0,
      pulse2: t,
      last: t,
    };
    advanceActivity(a, t + 500, 0.1);
    expect(a.pos).toBeLessThan(1e-9);
    // Pulses 100ms apart: pulseStep per 100ms, slower once the next pulse is late.
    Object.assign(a, { pulse1: t, pulse2: t + 100, last: t + 100 });
    advanceActivity(a, t + 150, 0.1);
    expect(a.pos).toBeCloseTo(0.05 * (100 / 150));
    // Three intervals without a pulse: it stops.
    const pos = a.pos;
    expect(advanceActivity(a, t + 400, 0.1)).toBe(false);
    expect(a.pos).toBe(pos);
  });
});
