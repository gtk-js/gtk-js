import { expect } from "vite-plus/test";
import { compare, gtkTest } from "../harness";

gtkTest("image-pixel-size-24", (native, web) => {
  // GTK4 WidgetPaintable includes parent window render nodes clipped to the widget's
  // bounds. On some GTK environments the window background is a plain ColorNode that
  // covers the full widget area (≥10% threshold), so walk_node attributes it as the
  // image widget's background_color. GtkImage has no CSS background in Adwaita — the
  // web side correctly reports null. There is no GTK4 API to distinguish a widget's
  // own CSS background from an inherited parent ColorNode of the same size, so we
  // accept this extraction artefact and skip background_color here.
  const { failures } = compare(native, web);
  expect(failures.filter((f) => f.property !== "background_color")).toEqual([]);
});
