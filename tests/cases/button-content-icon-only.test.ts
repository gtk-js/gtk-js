import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

// Filtered: background_color — host window background bleeds onto standalone widget.
//
// When AdwButtonContent is rendered without a parent button, the root
// buttoncontent node inherits the host window's background-color in GTK.
// The web component renders with no background (correct per _buttons.scss:618),
// but the native extraction captures the inherited host background.
// The icon-label and label-only variants filter font_weight instead; icon-only
// has no label so font_weight doesn't bleed, but background_color does.
gtkTest("button-content-icon-only", (native, web) => {
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
});
