import { expect } from "vite-plus/test";
import { compare, findChild, gtkTest } from "../harness";

gtkTest("expander-default", (native, web) => {
  expect(compare(native, web).failures).toEqual([]);

  // The title is a horizontal box: the arrow, then the label on the same line.
  const [nativeTitle, webTitle] = [findChild(native, "title"), findChild(web, "title")];
  expect(webTitle.height).toBeCloseTo(nativeTitle.height, 0);

  // The arrow is dimmed while the title isn't hovered.
  const [nativeArrow, webArrow] = [findChild(native, "expander"), findChild(web, "expander")];
  expect(compare(nativeArrow, webArrow).failures).toEqual([]);
  expect(webArrow.opacity).toBeCloseTo(nativeArrow.opacity, 2);
  for (const key of ["width", "height", "x", "y"] as const) {
    expect(webArrow[key]).toBeCloseTo(nativeArrow[key]!, 0);
  }

  const [nativeLabel, webLabel] = [findChild(nativeTitle, "label"), findChild(webTitle, "label")];
  expect(webLabel.x).toBeCloseTo(nativeLabel.x!, 0);
  expect(webLabel.y).toBeCloseTo(nativeLabel.y!, 0);
});
