import {
  AdwActionRow,
  AdwAvatar,
  AdwaitaProvider,
  AdwBanner,
  AdwBreakpointBin,
  AdwButtonContent,
  AdwButtonRow,
  AdwCarousel,
  AdwClamp,
  AdwComboRow,
  AdwEntryRow,
  AdwExpanderRow,
  AdwHeaderBar,
  AdwNavigationView,
  AdwOverlaySplitView,
  AdwPasswordEntryRow,
  AdwPreferencesGroup,
  AdwPreferencesPage,
  AdwPreferencesRow,
  AdwSpinRow,
  AdwSplitButton,
  AdwStatusPage,
  AdwSwitchRow,
  AdwToastOverlay,
  AdwToggleGroup,
  AdwToolbarView,
  AdwViewSwitcher,
  GtkActionBar,
  GtkBox,
  GtkButton,
  GtkCalendar,
  GtkCenterBox,
  GtkCheckButton,
  GtkDropDown,
  GtkEditableLabel,
  GtkEntry,
  GtkExpander,
  GtkFlowBox,
  GtkFlowBoxChild,
  GtkFrame,
  GtkGrid,
  GtkHeaderBar,
  GtkImage,
  GtkLabel,
  GtkLevelBar,
  GtkLinkButton,
  GtkListBox,
  GtkListBoxRow,
  GtkMenuButton,
  GtkNotebook,
  GtkNotebookPage,
  GtkOverlay,
  GtkPaned,
  GtkPasswordEntry,
  GtkPopover,
  GtkProgressBar,
  GtkScale,
  GtkScrollbar,
  GtkScrolledWindow,
  GtkSearchBar,
  GtkSearchEntry,
  GtkSeparator,
  GtkSpinButton,
  GtkSpinner,
  GtkStack,
  GtkStackPage,
  GtkSwitch,
  GtkTextView,
  GtkToggleButton,
  GtkWindowTitle,
} from "@gtk-js/adwaita";
import { Fragment } from "react";
import { createRoot } from "react-dom/client";

const caseName = window.location.pathname.slice(1);
const isGallery = caseName === "gallery";

const cases: Record<string, () => React.ReactElement> = {
  // halign/valign alignment cases
  "button-valign-center-hbox": () => (
    <GtkBox orientation="horizontal">
      <GtkButton label="Button" valign="center" data-testid="target" />
    </GtkBox>
  ),
  "button-valign-end-hbox": () => (
    <GtkBox orientation="horizontal">
      <GtkButton label="Button" valign="end" data-testid="target" />
    </GtkBox>
  ),
  "button-halign-center-vbox": () => (
    <GtkBox orientation="vertical">
      <GtkButton label="Button" halign="center" data-testid="target" />
    </GtkBox>
  ),
  "button-halign-end-vbox": () => (
    <GtkBox orientation="vertical">
      <GtkButton label="Button" halign="end" data-testid="target" />
    </GtkBox>
  ),

  "button-text-default": () => <GtkButton label="Button" data-testid="target" />,
  "button-text-flat": () => <GtkButton label="Button" hasFrame={false} data-testid="target" />,
  "button-text-suggested": () => (
    <GtkButton label="Button" className="suggested-action" data-testid="target" />
  ),
  "button-text-destructive": () => (
    <GtkButton label="Button" className="destructive-action" data-testid="target" />
  ),
  "button-icon": () => <GtkButton iconName="open-menu-symbolic" data-testid="target" />,
  "button-circular": () => (
    <GtkButton iconName="open-menu-symbolic" className="circular" data-testid="target" />
  ),
  "button-pill": () => <GtkButton label="Button" className="pill" data-testid="target" />,
  "button-disabled": () => <GtkButton label="Button" disabled data-testid="target" />,

  // GtkCalendar cases
  "calendar-default": () => <GtkCalendar year={2024} month={0} day={15} data-testid="target" />,

  // GtkCheckButton cases
  "check-button-default": () => <GtkCheckButton label="Checkbox" data-testid="target" />,
  "check-button-checked": () => <GtkCheckButton label="Checkbox" active data-testid="target" />,
  "check-button-indeterminate": () => (
    <GtkCheckButton label="Checkbox" inconsistent data-testid="target" />
  ),
  "check-button-disabled": () => <GtkCheckButton label="Checkbox" disabled data-testid="target" />,
  "check-button-checked-disabled": () => (
    <GtkCheckButton label="Checkbox" active disabled data-testid="target" />
  ),
  "check-button-no-label": () => <GtkCheckButton data-testid="target" />,
  "radio-button-default": () => <GtkCheckButton label="Radio" group="test" data-testid="target" />,
  "radio-button-checked": () => (
    <GtkCheckButton label="Radio" group="test" active data-testid="target" />
  ),

  // GtkScale cases
  "scale-default": () => <GtkScale min={0} max={100} value={50} step={1} data-testid="target" />,

  // GtkEditableLabel cases
  "editable-label-display-default": () => (
    <GtkEditableLabel text="Hello World" data-testid="target" />
  ),
  "editable-label-display-empty": () => <GtkEditableLabel text="" data-testid="target" />,
  "editable-label-editing-active": () => (
    <GtkEditableLabel text="Editable" editing data-testid="target" />
  ),
  "editable-label-disabled": () => (
    <GtkEditableLabel text="Disabled" disabled data-testid="target" />
  ),

  // GtkEntry cases — ref callback puts data-testid on the outer .gtk-entry div,
  // since forwardRef<HTMLInputElement> gives the inner <input>.
  "entry-default": () => (
    <GtkEntry text="Hello" ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")} />
  ),
  "entry-placeholder": () => (
    <GtkEntry
      placeholderText="Enter text..."
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),
  "entry-flat": () => (
    <GtkEntry
      hasFrame={false}
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),
  "entry-disabled": () => (
    <GtkEntry
      text="Hello"
      disabled
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),
  "entry-primary-icon": () => (
    <GtkEntry
      text="Hello"
      primaryIconName="edit-find-symbolic"
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),

  // GtkPasswordEntry cases
  "password-entry-default": () => (
    <GtkPasswordEntry ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")} />
  ),
  "password-entry-peek-icon": () => (
    <GtkPasswordEntry
      showPeekIcon
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),
  "password-entry-disabled": () => (
    <GtkPasswordEntry
      disabled
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),

  // GtkSearchEntry cases
  "search-entry-default": () => (
    <GtkSearchEntry ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")} />
  ),
  "search-entry-disabled": () => (
    <GtkSearchEntry
      disabled
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),

  // GtkScrollbar cases
  "scrollbar-default": () => (
    <GtkScrollbar orientation="vertical" value={0} pageSize={0.2} data-testid="target" />
  ),

  // GtkImage cases
  "image-default": () => <GtkImage data-testid="target" />,
  "image-normal-icons": () => (
    <GtkImage iconName="open-menu-symbolic" iconSize="normal" data-testid="target" />
  ),
  "image-large-icons": () => (
    <GtkImage iconName="open-menu-symbolic" iconSize="large" data-testid="target" />
  ),
  "image-pixel-size-24": () => (
    <GtkImage iconName="open-menu-symbolic" pixelSize={24} data-testid="target" />
  ),
  "image-no-icon-name": () => <GtkImage iconSize="normal" data-testid="target" />,

  // GtkLabel cases
  "label-default": () => <GtkLabel label="Label" data-testid="target" />,
  "label-wrap-word": () => (
    <GtkLabel
      label="The quick brown fox jumps over the lazy dog near the river"
      wrap
      wrapMode="word"
      style={{ maxWidth: "100px" }}
      data-testid="target"
    />
  ),
  "label-wrap-char": () => (
    <GtkLabel
      label="Thequickbrownfoxjumps"
      wrap
      wrapMode="char"
      style={{ maxWidth: "80px" }}
      data-testid="target"
    />
  ),
  "label-ellipsize": () => (
    <GtkLabel
      label="This is a very long label that should be ellipsized"
      ellipsize="end"
      style={{ maxWidth: "120px" }}
      data-testid="target"
    />
  ),
  "label-heights": () => (
    <GtkBox orientation="vertical" halign="start" valign="start" data-testid="target">
      <GtkLabel label="Label" />
      <GtkLabel label="Body" className="body" />
      <GtkLabel label="Caption" className="caption" />
      <GtkLabel label="Heading" className="heading" />
      <GtkLabel label="Title" className="title-1" />
    </GtkBox>
  ),
  "label-justify-center": () => <GtkLabel label="Centered" justify="center" data-testid="target" />,
  "label-width-chars": () => <GtkLabel label="Hi" widthChars={20} data-testid="target" />,
  "label-xalign": () => <GtkLabel label="Aligned" xalign={0} data-testid="target" />,
  "label-disabled": () => <GtkLabel label="Label" disabled data-testid="target" />,

  // GtkLevelBar cases
  "levelbar-continuous-default": () => <GtkLevelBar value={0.5} data-testid="target" />,
  "levelbar-continuous-low": () => <GtkLevelBar value={0.1} data-testid="target" />,
  "levelbar-continuous-full": () => <GtkLevelBar value={1} data-testid="target" />,
  "levelbar-continuous-vertical": () => (
    <GtkLevelBar
      value={0.4}
      orientation="vertical"
      style={{ height: "200px" }}
      data-testid="target"
    />
  ),
  "levelbar-discrete-default": () => (
    <GtkLevelBar value={2} minValue={0} maxValue={5} mode="discrete" data-testid="target" />
  ),
  "levelbar-discrete-inverted": () => (
    <GtkLevelBar
      value={2}
      minValue={0}
      maxValue={4}
      mode="discrete"
      inverted
      data-testid="target"
    />
  ),
  "levelbar-disabled": () => <GtkLevelBar value={0.5} disabled data-testid="target" />,

  // GtkLinkButton cases
  "link-default": () => (
    <GtkLinkButton uri="https://example.com" label="Link" data-testid="target" />
  ),
  "link-visited": () => (
    <GtkLinkButton uri="https://example.com" label="Link" visited data-testid="target" />
  ),

  // GtkMenuButton cases
  "menu-button-text-default": () => <GtkMenuButton label="Button" data-testid="target" />,
  "menu-button-icon": () => <GtkMenuButton iconName="open-menu-symbolic" data-testid="target" />,
  "menu-button-flat": () => <GtkMenuButton label="Button" hasFrame={false} data-testid="target" />,
  "menu-button-circular": () => <GtkMenuButton className="circular" data-testid="target" />,
  "menu-button-disabled": () => <GtkMenuButton label="Button" disabled data-testid="target" />,

  // GtkProgressBar cases
  "progressbar-horizontal-50": () => <GtkProgressBar fraction={0.5} data-testid="target" />,
  "progressbar-horizontal-0": () => <GtkProgressBar fraction={0} data-testid="target" />,
  "progressbar-horizontal-100": () => <GtkProgressBar fraction={1} data-testid="target" />,
  "progressbar-vertical-50": () => (
    <GtkProgressBar
      fraction={0.5}
      orientation="vertical"
      style={{ height: "200px" }}
      data-testid="target"
    />
  ),
  "progressbar-inverted-50": () => <GtkProgressBar fraction={0.5} inverted data-testid="target" />,
  "progressbar-text-custom": () => (
    <GtkProgressBar fraction={0.75} showText text="Loading..." data-testid="target" />
  ),
  "progressbar-osd-horizontal": () => (
    <GtkProgressBar fraction={0.4} className="osd" data-testid="target" />
  ),
  "progressbar-fraction-small": () => <GtkProgressBar fraction={0.1} data-testid="target" />,

  // GtkSeparator cases
  "separator-horizontal-default": () => <GtkSeparator data-testid="target" />,
  "separator-vertical": () => <GtkSeparator orientation="vertical" data-testid="target" />,
  "separator-spacer-horizontal": () => <GtkSeparator className="spacer" data-testid="target" />,

  // GtkSpinner cases
  "spinner-default": () => <GtkSpinner data-testid="target" />,
  "spinner-spinning": () => <GtkSpinner spinning data-testid="target" />,
  "spinner-spinning-custom-size": () => (
    <GtkSpinner spinning style={{ width: "24px", height: "24px" }} data-testid="target" />
  ),
  "spinner-disabled-not-spinning": () => <GtkSpinner disabled data-testid="target" />,
  "spinner-disabled-spinning": () => <GtkSpinner spinning disabled data-testid="target" />,

  // GtkSpinButton cases
  "spin-button-default": () => <GtkSpinButton min={0} max={100} value={50} data-testid="target" />,
  "spin-button-vertical": () => (
    <GtkSpinButton min={0} max={100} value={50} orientation="vertical" data-testid="target" />
  ),

  // GtkSwitch cases
  "switch-off-default": () => <GtkSwitch data-testid="target" />,
  "switch-on-default": () => <GtkSwitch active data-testid="target" />,
  "switch-off-disabled": () => <GtkSwitch disabled data-testid="target" />,
  "switch-on-disabled": () => <GtkSwitch active disabled data-testid="target" />,

  // GtkTextView cases
  "text-view-default": () => <GtkTextView data-testid="target" />,
  "text-view-monospace": () => <GtkTextView monospace data-testid="target" />,
  "text-view-non-editable": () => <GtkTextView editable={false} data-testid="target" />,
  "text-view-disabled": () => <GtkTextView disabled data-testid="target" />,

  // GtkToggleButton cases
  "toggle-text-default": () => <GtkToggleButton label="Toggle" data-testid="target" />,
  "toggle-text-checked": () => <GtkToggleButton label="Toggle" active data-testid="target" />,
  "toggle-text-flat": () => (
    <GtkToggleButton label="Toggle" hasFrame={false} data-testid="target" />
  ),
  "toggle-disabled": () => <GtkToggleButton label="Toggle" disabled data-testid="target" />,

  // GtkWindowTitle cases
  "window-title-text-default": () => <GtkWindowTitle title="Window Title" data-testid="target" />,
  "window-title-with-subtitle": () => (
    <GtkWindowTitle title="Main Title" subtitle="Subtitle text" data-testid="target" />
  ),
  "window-title-long-text": () => (
    <GtkWindowTitle title="This is a very long window title text" data-testid="target" />
  ),
  "window-title-no-subtitle": () => <GtkWindowTitle title="Title" data-testid="target" />,
  "window-title-both-empty": () => <GtkWindowTitle title="" data-testid="target" />,

  // GtkBox cases
  "box-horizontal-default": () => (
    <GtkBox orientation="horizontal" data-testid="target">
      <GtkLabel label="A" />
      <GtkLabel label="B" />
      <GtkLabel label="C" />
    </GtkBox>
  ),
  "box-vertical-default": () => (
    <GtkBox orientation="vertical" data-testid="target">
      <GtkLabel label="A" />
      <GtkLabel label="B" />
      <GtkLabel label="C" />
    </GtkBox>
  ),
  "box-spacing": () => (
    <GtkBox orientation="horizontal" spacing={6} data-testid="target">
      <GtkLabel label="A" />
      <GtkLabel label="B" />
      <GtkLabel label="C" />
    </GtkBox>
  ),
  "box-spacing-toolbar": () => (
    <GtkBox
      orientation="horizontal"
      spacing={6}
      halign="start"
      className="toolbar"
      data-testid="target"
    >
      <GtkLabel label="One" />
      <GtkLabel label="Two" />
    </GtkBox>
  ),
  "box-hexpand": () => (
    <GtkBox halign="start" style={{ width: 300 }} data-testid="target">
      <GtkBox orientation="vertical">
        <GtkLabel label="Same" hexpand />
      </GtkBox>
      <GtkLabel label="Same" hexpand />
      <GtkLabel label="End" />
    </GtkBox>
  ),
  "box-homogeneous": () => (
    <GtkBox orientation="horizontal" homogeneous style={{ width: "200px" }} data-testid="target">
      <GtkLabel label="A" />
      <GtkLabel label="B" />
      <GtkLabel label="C" />
    </GtkBox>
  ),

  // GtkCenterBox cases
  "center-box-default": () => (
    <GtkCenterBox
      style={{ width: "300px" }}
      startWidget={<GtkLabel label="Start" />}
      centerWidget={<GtkLabel label="Center" />}
      endWidget={<GtkLabel label="End" />}
      data-testid="target"
    />
  ),

  // GTK's width request includes the toolbar's 6px padding; CSS widths here are
  // content widths.
  "center-box-toolbar-center-end-narrow": () => (
    <GtkCenterBox
      halign="start"
      className="toolbar"
      style={{ width: 108 }}
      centerWidget={<GtkLabel label="Center" />}
      endWidget={<GtkLabel label="Side" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-center-only": () => (
    <GtkCenterBox
      halign="start"
      className="toolbar"
      centerWidget={<GtkLabel label="Center" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-start-center-wide": () => (
    <GtkCenterBox
      halign="start"
      className="toolbar"
      style={{ width: 288 }}
      startWidget={<GtkLabel label="Side" />}
      centerWidget={<GtkLabel label="Center" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-start-center-narrow": () => (
    <GtkCenterBox
      halign="start"
      className="toolbar"
      style={{ width: 108 }}
      startWidget={<GtkLabel label="Side" />}
      centerWidget={<GtkLabel label="Center" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-start-end": () => (
    <GtkCenterBox
      halign="start"
      className="toolbar"
      startWidget={<GtkLabel label="Side" />}
      endWidget={<GtkLabel label="Side" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-vertical-start-center-narrow": () => (
    <GtkCenterBox
      orientation="vertical"
      halign="start"
      valign="start"
      className="toolbar"
      style={{ height: 60 }}
      startWidget={<GtkLabel label="Side" />}
      centerWidget={<GtkLabel label="Center" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-vertical-start-end": () => (
    <GtkCenterBox
      orientation="vertical"
      halign="start"
      valign="start"
      className="toolbar"
      startWidget={<GtkLabel label="Side" />}
      endWidget={<GtkLabel label="Side" />}
      data-testid="target"
    />
  ),
  "center-box-toolbar-vertical-start-end-tall": () => (
    <GtkCenterBox
      orientation="vertical"
      halign="start"
      valign="start"
      className="toolbar"
      style={{ height: 100 }}
      startWidget={<GtkLabel label="Side" />}
      endWidget={<GtkLabel label="Wider side" />}
      data-testid="target"
    />
  ),

  // GtkGrid cases
  "grid-default": () => (
    <GtkGrid columnHomogeneous style={{ gridTemplateColumns: "1fr 1fr" }} data-testid="target">
      <GtkLabel label="TL" />
      <GtkLabel label="TR" />
      <GtkLabel label="BL" />
      <GtkLabel label="BR" />
    </GtkGrid>
  ),

  // GtkFlowBox cases
  "flow-box-default": () => (
    <GtkFlowBox selectionMode="none" data-testid="target">
      <GtkFlowBoxChild>
        <GtkLabel label="One" />
      </GtkFlowBoxChild>
      <GtkFlowBoxChild>
        <GtkLabel label="Two" />
      </GtkFlowBoxChild>
      <GtkFlowBoxChild>
        <GtkLabel label="Three" />
      </GtkFlowBoxChild>
      <GtkFlowBoxChild>
        <GtkLabel label="Four" />
      </GtkFlowBoxChild>
    </GtkFlowBox>
  ),

  // GtkPaned cases
  "paned-horizontal": () => (
    <GtkPaned
      orientation="horizontal"
      position={100}
      startChild={<GtkLabel label="Start" />}
      endChild={<GtkLabel label="End" />}
      data-testid="target"
    />
  ),
  "paned-vertical": () => (
    <GtkPaned
      orientation="vertical"
      position={60}
      startChild={<GtkLabel label="Start" />}
      endChild={<GtkLabel label="End" />}
      data-testid="target"
    />
  ),

  // GtkFrame cases
  "frame-default": () => (
    <GtkFrame label="Frame" data-testid="target">
      <GtkLabel label="Content" />
    </GtkFrame>
  ),
  "frame-no-label": () => (
    <GtkFrame data-testid="target">
      <GtkLabel label="Content" />
    </GtkFrame>
  ),

  // GtkExpander cases
  "expander-default": () => <GtkExpander label="Expander" data-testid="target" />,
  "expander-expanded": () => (
    <GtkExpander label="Expander" expanded data-testid="target">
      <GtkLabel label="Content" />
    </GtkExpander>
  ),

  // GtkOverlay cases
  "overlay-default": () => (
    <GtkOverlay
      child={<GtkLabel label="Base" />}
      overlays={[<GtkLabel label="Overlay" />]}
      style={{ width: "200px", height: "100px" }}
      data-testid="target"
    />
  ),

  // GtkScrolledWindow cases
  "scrolled-window-default": () => (
    <GtkScrolledWindow style={{ width: "200px", height: "150px" }} data-testid="target">
      <GtkLabel label="Scrollable content" />
    </GtkScrolledWindow>
  ),
  "scrolled-window-frame": () => (
    <GtkScrolledWindow hasFrame style={{ width: "200px", height: "150px" }} data-testid="target">
      <GtkLabel label="Scrollable content" />
    </GtkScrolledWindow>
  ),

  // GtkStack cases
  "stack-default": () => (
    <GtkStack visibleChildName="page1" data-testid="target">
      <GtkStackPage name="page1" title="Page 1">
        <GtkLabel label="First" />
      </GtkStackPage>
      <GtkStackPage name="page2" title="Page 2">
        <GtkLabel label="Second" />
      </GtkStackPage>
    </GtkStack>
  ),
  "stack-homogeneous": () => (
    <GtkBox orientation="vertical" halign="start" data-testid="target">
      <GtkStack visibleChildName="short" halign="start">
        <GtkStackPage name="short">
          <GtkLabel label="A" />
        </GtkStackPage>
        <GtkStackPage name="long">
          <GtkLabel label="A much longer page" />
        </GtkStackPage>
      </GtkStack>
      <GtkLabel label="A much longer page" />
    </GtkBox>
  ),

  // GtkNotebook cases
  "notebook-default": () => (
    <GtkNotebook page={0} data-testid="target">
      <GtkNotebookPage tabLabel="Tab 1">
        <GtkLabel label="Page 1 content" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Tab 2">
        <GtkLabel label="Page 2 content" />
      </GtkNotebookPage>
    </GtkNotebook>
  ),

  // GtkPopover cases
  "popover-default": () => (
    <GtkBox data-testid="target">
      <GtkLabel label="Anchor" />
      <GtkPopover
        visible
        autohide={false}
        portal={false}
        style={{ position: "relative", zIndex: "auto", top: "auto", left: "auto" }}
      >
        <GtkLabel label="Popover content" />
      </GtkPopover>
    </GtkBox>
  ),

  // GtkDropDown cases
  "dropdown-default": () => (
    <GtkDropDown items={["Option 1", "Option 2", "Option 3"]} selected={0} data-testid="target" />
  ),

  // GtkListBox cases
  "listbox-default": () => (
    <GtkListBox selectionMode="none" data-testid="target">
      <GtkListBoxRow>
        <GtkLabel label="Row 1" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Row 2" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Row 3" />
      </GtkListBoxRow>
    </GtkListBox>
  ),
  "listbox-separators": () => (
    <GtkListBox selectionMode="none" showSeparators data-testid="target">
      <GtkListBoxRow>
        <GtkLabel label="Row 1" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Row 2" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Row 3" />
      </GtkListBoxRow>
    </GtkListBox>
  ),

  // GtkHeaderBar cases
  "headerbar-default": () => <GtkHeaderBar showWindowControls={false} data-testid="target" />,
  "headerbar-with-title": () => (
    <GtkHeaderBar
      showWindowControls={false}
      titleWidget={<GtkWindowTitle title="Title" />}
      data-testid="target"
    />
  ),
  "headerbar-start-end": () => (
    <GtkHeaderBar
      showWindowControls={false}
      start={<GtkButton label="Start" />}
      end={<GtkButton label="End" />}
      data-testid="target"
    />
  ),

  // GtkActionBar cases
  "actionbar-default": () => (
    <GtkActionBar
      start={<GtkButton label="Action" />}
      end={<GtkButton label="Done" />}
      data-testid="target"
    />
  ),

  // GtkSearchBar cases
  "searchbar-default": () => (
    <GtkSearchBar searchModeEnabled child={<GtkSearchEntry />} data-testid="target" />
  ),
  "searchbar-with-close-button": () => (
    <GtkSearchBar
      searchModeEnabled
      showCloseButton
      child={<GtkSearchEntry />}
      data-testid="target"
    />
  ),

  // AdwAvatar cases
  "avatar-default": () => <AdwAvatar size={48} data-testid="target" />,
  "avatar-initials": () => (
    <AdwAvatar size={48} text="Jane Doe" showInitials data-testid="target" />
  ),
  "avatar-small": () => <AdwAvatar size={24} text="Alice" showInitials data-testid="target" />,

  // AdwBanner cases
  "banner-revealed": () => <AdwBanner title="This is a banner" revealed data-testid="target" />,
  "banner-with-button": () => (
    <AdwBanner title="Update available" buttonLabel="Update" revealed data-testid="target" />
  ),

  // AdwStatusPage cases
  "status-page-default": () => (
    <AdwStatusPage
      iconName="dialog-information-symbolic"
      title="Nothing Here"
      description="There are no items to display"
      data-testid="target"
    />
  ),
  "status-page-no-icon": () => (
    <AdwStatusPage
      title="No Results"
      description="Try a different search term"
      data-testid="target"
    />
  ),

  // AdwClamp cases
  "clamp-default": () => (
    <AdwClamp maximumSize={600} tighteningThreshold={400} data-testid="target">
      <GtkLabel label="Clamped content" />
    </AdwClamp>
  ),

  // AdwCarousel cases
  "carousel-default": () => (
    <AdwCarousel data-testid="target">
      <GtkLabel label="Page 1" />
      <GtkLabel label="Page 2" />
      <GtkLabel label="Page 3" />
    </AdwCarousel>
  ),

  // AdwToastOverlay cases
  "toast-overlay-default": () => (
    <AdwToastOverlay data-testid="target">
      <GtkLabel label="Content under toasts" />
    </AdwToastOverlay>
  ),

  // AdwButtonContent cases
  "button-content-icon-label": () => (
    <AdwButtonContent iconName="open-menu-symbolic" label="Open" data-testid="target" />
  ),
  "button-content-label-only": () => <AdwButtonContent label="Open" data-testid="target" />,
  "button-content-icon-only": () => (
    <AdwButtonContent iconName="open-menu-symbolic" data-testid="target" />
  ),

  // AdwSplitButton cases
  "split-button-text-default": () => <AdwSplitButton label="Button" data-testid="target" />,
  "split-button-icon": () => <AdwSplitButton iconName="open-menu-symbolic" data-testid="target" />,
  "split-button-flat": () => (
    <AdwSplitButton label="Button" className="flat" data-testid="target" />
  ),

  // AdwButtonRow cases — inside GtkListBox to match native structure
  "button-row-default": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" data-testid="target" />
    </GtkListBox>
  ),
  "button-row-start-icon": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" startIconName="edit-delete-symbolic" data-testid="target" />
    </GtkListBox>
  ),
  "button-row-destructive": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" className="destructive-action" data-testid="target" />
    </GtkListBox>
  ),

  // AdwToggleGroup cases
  "toggle-group-text-default": () => (
    <AdwToggleGroup
      active={0}
      toggles={[
        { name: "first", label: "First" },
        { name: "second", label: "Second" },
        { name: "third", label: "Third" },
      ]}
      data-testid="target"
    />
  ),
  "toggle-group-icon": () => (
    <AdwToggleGroup
      active={0}
      toggles={[
        { name: "list", iconName: "view-list-symbolic" },
        { name: "grid", iconName: "view-grid-symbolic" },
      ]}
      data-testid="target"
    />
  ),
  "toggle-group-homogeneous": () => (
    <AdwToggleGroup
      active={1}
      homogeneous
      toggles={[
        { name: "a", label: "Short" },
        { name: "b", label: "Medium Text" },
        { name: "c", label: "Long Label Here" },
      ]}
      data-testid="target"
    />
  ),

  // AdwActionRow cases
  "adw-action-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="Action Row" />
    </GtkListBox>
  ),
  "adw-action-row-with-subtitle": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="Action Row" subtitle="Subtitle text" />
    </GtkListBox>
  ),
  "adw-action-row-activatable": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="Activatable Row" activatable />
    </GtkListBox>
  ),

  // AdwEntryRow cases
  "adw-entry-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwEntryRow title="Entry Row" />
    </GtkListBox>
  ),
  "adw-entry-row-with-text": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwEntryRow title="Entry Row" text="Hello World" />
    </GtkListBox>
  ),

  // AdwPasswordEntryRow cases
  "adw-password-entry-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwPasswordEntryRow title="Password" />
    </GtkListBox>
  ),

  // AdwSpinRow cases
  "adw-spin-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwSpinRow title="Spin Row" value={50} min={0} max={100} step={1} />
    </GtkListBox>
  ),

  // AdwComboRow cases
  "adw-combo-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwComboRow title="Combo Row" items={["Option 1", "Option 2", "Option 3"]} selected={0} />
    </GtkListBox>
  ),

  // AdwSwitchRow cases
  "adw-switch-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwSwitchRow title="Switch Row" />
    </GtkListBox>
  ),
  "adw-switch-row-active": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwSwitchRow title="Switch Row" active />
    </GtkListBox>
  ),

  // AdwExpanderRow cases
  "adw-expander-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwExpanderRow title="Expander Row">
        <AdwActionRow title="Child Row 1" />
        <AdwActionRow title="Child Row 2" />
      </AdwExpanderRow>
    </GtkListBox>
  ),
  "adw-expander-row-expanded": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwExpanderRow title="Expander Row" expanded>
        <AdwActionRow title="Child Row 1" />
        <AdwActionRow title="Child Row 2" />
      </AdwExpanderRow>
    </GtkListBox>
  ),

  // AdwPreferencesRow cases
  "adw-preferences-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwPreferencesRow title="Preferences Row" />
    </GtkListBox>
  ),

  // AdwPreferencesGroup cases
  "adw-preferences-group-default": () => (
    <AdwPreferencesGroup title="Group Title" data-testid="target">
      <AdwActionRow title="Row 1" />
      <AdwActionRow title="Row 2" />
    </AdwPreferencesGroup>
  ),
  "adw-preferences-group-with-description": () => (
    <AdwPreferencesGroup
      title="Group Title"
      description="A description of this group"
      data-testid="target"
    >
      <AdwActionRow title="Row 1" />
    </AdwPreferencesGroup>
  ),

  // AdwPreferencesPage cases
  "adw-preferences-page-default": () => (
    <AdwPreferencesPage data-testid="target">
      <AdwPreferencesGroup title="General">
        <AdwActionRow title="Setting 1" />
        <AdwActionRow title="Setting 2" />
      </AdwPreferencesGroup>
    </AdwPreferencesPage>
  ),

  // AdwHeaderBar cases
  "adw-headerbar-default": () => (
    <AdwHeaderBar
      showStartTitleButtons={false}
      showEndTitleButtons={false}
      showBackButton={false}
      data-testid="target"
    />
  ),
  "adw-headerbar-with-title": () => (
    <AdwHeaderBar
      showStartTitleButtons={false}
      showEndTitleButtons={false}
      showBackButton={false}
      titleWidget={<GtkWindowTitle title="Header Title" />}
      data-testid="target"
    />
  ),
  "adw-headerbar-start-end": () => (
    <AdwHeaderBar
      showStartTitleButtons={false}
      showEndTitleButtons={false}
      showBackButton={false}
      start={<GtkButton label="Start" />}
      end={<GtkButton label="End" />}
      data-testid="target"
    />
  ),

  // AdwToolbarView cases
  "adw-toolbar-view-default": () => (
    <AdwToolbarView
      topBars={
        <AdwHeaderBar
          showStartTitleButtons={false}
          showEndTitleButtons={false}
          showBackButton={false}
        />
      }
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-toolbar-view-with-bottom": () => (
    <AdwToolbarView
      topBars={
        <AdwHeaderBar
          showStartTitleButtons={false}
          showEndTitleButtons={false}
          showBackButton={false}
        />
      }
      content={<GtkLabel label="Content" />}
      bottomBars={<GtkActionBar start={<GtkButton label="Action" />} />}
      data-testid="target"
    />
  ),

  // AdwViewSwitcher cases
  "adw-view-switcher-default": () => (
    <AdwViewSwitcher
      pages={[
        { name: "page1", title: "Page 1", iconName: "open-menu-symbolic" },
        { name: "page2", title: "Page 2", iconName: "open-menu-symbolic" },
      ]}
      activePageName="page1"
      policy="wide"
      data-testid="target"
    />
  ),

  // AdwBreakpointBin cases
  "adw-breakpoint-bin-default": () => (
    <AdwBreakpointBin style={{ width: "200px", height: "100px" }} data-testid="target">
      <GtkLabel label="Breakpoint content" />
    </AdwBreakpointBin>
  ),

  // AdwNavigationView cases
  "adw-navigation-view-default": () => (
    <AdwNavigationView
      pages={[{ tag: "home", title: "Home", children: <GtkLabel label="Home Page" /> }]}
      initialPage="home"
      data-testid="target"
    />
  ),

  // AdwOverlaySplitView cases
  "adw-overlay-split-view-default": () => (
    <AdwOverlaySplitView
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),

  // Expected-failure cases: intentionally broken for testing the comparison
  "button-text-default-wrong-padding": () => (
    <GtkButton label="Button" style={{ padding: "20px" }} data-testid="target" />
  ),
  "button-text-default-wrong-radius": () => (
    <GtkButton label="Button" style={{ borderRadius: "0px" }} data-testid="target" />
  ),
  "button-text-default-wrong-bg": () => (
    <GtkButton label="Button" style={{ backgroundColor: "red" }} data-testid="target" />
  ),
};

const root = createRoot(document.getElementById("root")!);

if (isGallery) {
  root.render(
    <AdwaitaProvider colorScheme="light">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, max-content)", gap: 24 }}>
        {Object.entries(cases).map(([name, renderCase]) => (
          <div
            key={name}
            data-case={name}
            style={{ display: "inline-flex", alignItems: "flex-start" }}
          >
            <Fragment>{renderCase()}</Fragment>
          </div>
        ))}
      </div>
    </AdwaitaProvider>,
  );
} else {
  const renderCase = cases[caseName];
  if (!renderCase) {
    document.getElementById("root")!.textContent = `Unknown case: ${caseName}`;
  } else {
    root.render(<AdwaitaProvider colorScheme="light">{renderCase()}</AdwaitaProvider>);
  }
}
