import { createContext, useContext } from "react";

/**
 * The title an AdwHeaderBar without a title widget shows: the title of the
 * AdwNavigationPage it's in, or else of its AdwDialog (update_title(),
 * adw-header-bar.c), or else of its window (WindowControlsContext). Pages
 * and dialogs set it for their content, so the closest one wins, and a dialog
 * doesn't show the title of the page that presented it, as upstream stops
 * looking at the dialog's sheet.
 */
export const HeaderBarTitleContext = createContext<string | undefined>(undefined);

export function useHeaderBarTitle(): string | undefined {
  return useContext(HeaderBarTitleContext);
}
