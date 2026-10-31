/**
 * The window buttons of header bars in a dialog, from GtkSettings'
 * decoration layout: the close button alone (AdwSheetControls), on the
 * start when the layout has more close buttons there than on the end
 * (adw_decoration_layout_prefers_start()), like the macOS order.
 *
 * @see upstream/libadwaita/src/adw-sheet-controls.c
 */
export function sheetDecorationLayout(layout: string): string {
  if (!layout.includes(":")) return ":close";
  const closes = (side: string | undefined) =>
    (side ?? "").split(",").filter((button) => button === "close").length;
  const [start, end] = layout.split(":", 2);
  return closes(start) > closes(end) ? "close:" : ":close";
}
