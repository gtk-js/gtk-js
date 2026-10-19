// Provider

export { GtkTheme } from "@gtk-js/gtk-css";
export type { GtkActionBarProps } from "./components/action-bar.tsx";
export { GtkActionBar } from "./components/action-bar.tsx";
export type { GtkBoxProps } from "./components/box.tsx";
export { GtkBox } from "./components/box.tsx";
export type { GtkButtonProps } from "./components/button.tsx";
// Components
export { GtkButton } from "./components/button.tsx";
export type { GtkCalendarProps } from "./components/calendar.tsx";
export { GtkCalendar } from "./components/calendar.tsx";
export type { GtkCenterBoxProps } from "./components/center-box.tsx";
export { GtkCenterBox } from "./components/center-box.tsx";
export type { GtkCheckButtonProps } from "./components/check-button.tsx";
export { GtkCheckButton } from "./components/check-button.tsx";
export type { GtkDropDownProps } from "./components/drop-down.tsx";
export { GtkDropDown } from "./components/drop-down.tsx";
export type { GtkEditableLabelProps } from "./components/editable-label.tsx";
export { GtkEditableLabel } from "./components/editable-label.tsx";
export type { GtkEntryProps } from "./components/entry.tsx";
export { GtkEntry } from "./components/entry.tsx";
export type { GtkExpanderProps } from "./components/expander.tsx";
export { GtkExpander } from "./components/expander.tsx";
export type { GtkFlowBoxChildProps, GtkFlowBoxProps } from "./components/flow-box.tsx";
export { GtkFlowBox, GtkFlowBoxChild } from "./components/flow-box.tsx";
export type { GtkFrameProps } from "./components/frame.tsx";
export { GtkFrame } from "./components/frame.tsx";
export type { GtkGridProps } from "./components/grid.tsx";
export { GtkGrid } from "./components/grid.tsx";
export type { GtkHeaderBarProps } from "./components/headerbar.tsx";
export { GtkHeaderBar } from "./components/headerbar.tsx";
export type { GtkImageProps } from "./components/image.tsx";
// Phase 1: Foundation Components
export { GtkImage } from "./components/image.tsx";
export type { GtkLabelProps } from "./components/label.tsx";
export { GtkLabel, wrapStyle } from "./components/label.tsx";
export type { GtkLevelBarOffset, GtkLevelBarProps } from "./components/level-bar.tsx";
export { GtkLevelBar } from "./components/level-bar.tsx";
export type { GtkLinkButtonProps } from "./components/link-button.tsx";
export { GtkLinkButton } from "./components/link-button.tsx";
export type { GtkListBoxProps, GtkListBoxRowProps } from "./components/list-box.tsx";
export { GtkListBox, GtkListBoxRow } from "./components/list-box.tsx";
export type { GtkMenuButtonProps } from "./components/menu-button.tsx";
export { GtkMenuButton } from "./components/menu-button.tsx";
export type { GtkNotebookPageProps, GtkNotebookProps } from "./components/notebook.tsx";
export { GtkNotebook, GtkNotebookPage } from "./components/notebook.tsx";
export type { GtkOverlayChildProps, GtkOverlayProps } from "./components/overlay.tsx";
export { GtkOverlay } from "./components/overlay.tsx";
export type { GtkPanedProps } from "./components/paned.tsx";
export { GtkPaned } from "./components/paned.tsx";
export type { GtkPasswordEntryProps } from "./components/password-entry.tsx";
export { GtkPasswordEntry } from "./components/password-entry.tsx";
export type { GtkPopoverProps } from "./components/popover.tsx";
export { GtkPopover } from "./components/popover.tsx";
export type {
  GtkMenuItem,
  GtkMenuModel,
  GtkModelButtonProps,
  GtkPopoverMenuProps,
} from "./components/popover-menu.tsx";
export { GtkModelButton, GtkPopoverMenu, usePopoverClose } from "./components/popover-menu.tsx";
export type { GtkProgressBarProps } from "./components/progress-bar.tsx";
export { GtkProgressBar } from "./components/progress-bar.tsx";
export type { GtkScaleMark, GtkScaleProps } from "./components/scale.tsx";
export { GtkScale } from "./components/scale.tsx";
export type { GtkScrollbarProps } from "./components/scrollbar.tsx";
export { GtkScrollbar } from "./components/scrollbar.tsx";
export type { GtkScrolledWindowProps } from "./components/scrolled-window.tsx";
// Phase 2: Container Components
export { GtkScrolledWindow } from "./components/scrolled-window.tsx";
export type { GtkSearchBarProps } from "./components/search-bar.tsx";
export { GtkSearchBar } from "./components/search-bar.tsx";
export type { GtkSearchEntryProps } from "./components/search-entry.tsx";
export { GtkSearchEntry } from "./components/search-entry.tsx";
export type { GtkSeparatorProps } from "./components/separator.tsx";
export { GtkSeparator } from "./components/separator.tsx";
export type { GtkSpinButtonProps } from "./components/spin-button.tsx";
export { GtkSpinButton } from "./components/spin-button.tsx";
export type { GtkSpinnerProps } from "./components/spinner.tsx";
export { GtkSpinner } from "./components/spinner.tsx";
export type {
  GtkStackPageProps,
  GtkStackProps,
  GtkStackSwitcherProps,
} from "./components/stack.tsx";
export { GtkStack, GtkStackPage, GtkStackSwitcher } from "./components/stack.tsx";
export type { GtkSwitchProps } from "./components/switch.tsx";
export { GtkSwitch } from "./components/switch.tsx";
export type { GtkTextViewProps } from "./components/text-view.tsx";
export { GtkTextView } from "./components/text-view.tsx";
export type { GtkToggleButtonProps } from "./components/toggle-button.tsx";
export { GtkToggleButton } from "./components/toggle-button.tsx";
export type { GtkWindowProps } from "./components/window.tsx";
export { GtkWindow } from "./components/window.tsx";
export type { GtkWindowTitleProps } from "./components/window-title.tsx";
export { GtkWindowTitle } from "./components/window-title.tsx";
export { isCoveredByLayer, useEscapeLayer } from "./escape-layers.ts";
export type { IconMap } from "./icon-context.tsx";
// Icon context
export { IconProvider, useIcon, useIcons } from "./icon-context.tsx";
export type { GtkBinLayoutProps } from "./layouts/bin-layout.tsx";
export { GtkBinLayout } from "./layouts/bin-layout.tsx";
export type { GtkBoxLayoutProps } from "./layouts/box-layout.tsx";
// Layout managers
export { GtkBoxLayout } from "./layouts/box-layout.tsx";
export type { GtkCenterLayoutProps } from "./layouts/center-layout.tsx";
export { GtkCenterLayout } from "./layouts/center-layout.tsx";
export {
  GtkListBoxRowContext,
  type GtkRowContainer,
  orderRows,
  useListBoxRow,
} from "./list-box-row-context.tsx";
export type { GtkProviderProps } from "./provider.tsx";
export { GtkProvider, useGtkTheme } from "./provider.tsx";
// Types
export type * from "./types.ts";
export { DecorationLayout } from "./types.ts";
// Window controls
export type { WindowControlsAPI } from "./window-controls-context.tsx";
export {
  useWindowControls,
  useWindowElement,
  WindowControlsContext,
  WindowElementContext,
} from "./window-controls-context.tsx";
