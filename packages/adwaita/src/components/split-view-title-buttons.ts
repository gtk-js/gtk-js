import { useWindowControls, type WindowControlsAPI } from "@gtk-js/gtk4";
import { createContext, useContext, useMemo } from "react";

/**
 * The title buttons that enclosing split views hide in an AdwHeaderBar: an
 * uncollapsed split view's panes hide the buttons facing the other pane
 * (update_start_title_buttons(), adw-header-bar.c). Each split view adds its
 * rule to its parent's, as upstream checks every enclosing one.
 */
interface SplitViewTitleButtons {
  hideStart: boolean;
  hideEnd: boolean;
  /**
   * The window or dialog the split views are in: like adw_header_bar_root(),
   * which stops looking at the native or the dialog's sheet, a header bar in
   * a dialog presented from a pane ignores them.
   */
  controls: WindowControlsAPI | undefined;
}

export const SplitViewTitleButtonsContext = createContext<SplitViewTitleButtons | undefined>(
  undefined,
);

/** The title buttons the enclosing split views hide, for AdwHeaderBar. */
export function useSplitViewTitleButtons(): { hideStart: boolean; hideEnd: boolean } {
  const value = useContext(SplitViewTitleButtonsContext);
  const controls = useWindowControls();
  if (!value || value.controls !== controls) return { hideStart: false, hideEnd: false };
  return value;
}

/** The value a split view pane provides: its own rule added to the enclosing ones. */
export function useSplitViewPaneTitleButtons(
  hideStart: boolean,
  hideEnd: boolean,
): SplitViewTitleButtons {
  const parent = useSplitViewTitleButtons();
  const controls = useWindowControls();
  const start = parent.hideStart || hideStart;
  const end = parent.hideEnd || hideEnd;
  return useMemo(() => ({ hideStart: start, hideEnd: end, controls }), [start, end, controls]);
}
