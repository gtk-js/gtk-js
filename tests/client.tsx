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
  AdwViewSwitcherBar,
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
  GtkStackSwitcher,
  GtkSwitch,
  GtkTextView,
  GtkToggleButton,
  GtkWindow,
  GtkWindowTitle,
} from "@gtk-js/adwaita";
import { Fragment, type ReactElement, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const caseName = window.location.pathname.slice(1);
const isGallery = caseName === "gallery";

// Native AdwAvatar cases extract the `avatar` gizmo (use_inner), the first
// child of the outer widget, so the web side marks the same node.
function avatarGizmoTarget(el: HTMLDivElement | null) {
  el?.firstElementChild?.setAttribute("data-testid", "target");
}

// GtkTextView's ref is its text node; the native cases measure the textview node.
function textViewTarget(el: HTMLTextAreaElement | null) {
  el?.parentElement?.setAttribute("data-testid", "target");
}

/** What the password-entry-behavior case's entries report, for its test to read. */
const passwordEntryEvents: string[] = [];
(window as unknown as { passwordEntryEvents: string[] }).passwordEntryEvents = passwordEntryEvents;

/** GtkPasswordEntries to drive in password-entry-behavior; the button toggles showPeekIcon. */
function PasswordEntryBehavior() {
  const [showPeekIcon, setShowPeekIcon] = useState(true);
  return (
    <GtkBox orientation="vertical" spacing={6}>
      <GtkButton
        id="password-peek-toggle"
        label="Peek"
        onClicked={() => setShowPeekIcon((show) => !show)}
      />
      <GtkPasswordEntry id="password-peek" showPeekIcon={showPeekIcon} defaultValue="hunter2" />
      <GtkPasswordEntry id="password-disabled" showPeekIcon disabled />
      <GtkPasswordEntry id="password-read-only" readOnly />
      <GtkWindow>
        <GtkBox spacing={6}>
          <GtkPasswordEntry
            id="password-default"
            activatesDefault
            onActivate={() => passwordEntryEvents.push("activate")}
          />
          <GtkButton
            className="default"
            label="OK"
            onClicked={() => passwordEntryEvents.push("default")}
          />
        </GtkBox>
      </GtkWindow>
    </GtkBox>
  );
}

/** An app component that renders a row, which AdwPreferencesGroup can't tell from its type. */
function WrappedActionRow(props: { title: string; subtitle?: string }) {
  return <AdwActionRow {...props} />;
}

/** A flat split button whose menu a pointer click opened. */
function OpenSplitButton() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current
      ?.querySelector(".gtk-menubutton > button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  }, []);
  return (
    <AdwSplitButton
      ref={ref}
      label="Save"
      className="flat"
      menuModel={[[{ label: "Save As…" }, { label: "Save All" }]]}
      data-testid="target"
    />
  );
}

/**
 * Clicks the buttons of its child box in `order`, one event at a time, then
 * marks the box as the target.
 */
function ClickedInOrder({ order, children }: { order: number[]; children: ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = ref.current?.firstElementChild;
    const clicks = [...order];
    const next = () => {
      const index = clicks.shift();
      if (index === undefined) box?.setAttribute("data-testid", "target");
      else {
        (box?.children[index] as HTMLElement | undefined)?.click();
        setTimeout(next);
      }
    };
    setTimeout(next);
  }, [order]);
  return <div ref={ref}>{children}</div>;
}

/** Three grouped toggle buttons; One, Two and Two again are clicked. */
function ToggleGrouped() {
  const one = useRef<HTMLButtonElement>(null);
  return (
    <ClickedInOrder order={[0, 1, 1]}>
      <GtkBox className="linked">
        <GtkToggleButton ref={one} label="One" />
        <GtkToggleButton group={one} label="Two" />
        <GtkToggleButton group={one} label="Three" />
      </GtkBox>
    </ClickedInOrder>
  );
}

/** A breakpoint bin with a ref, whose breakpoints set its opacity like GtkWidget:opacity setters. */
function BreakpointConditions() {
  const ref = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  return (
    <AdwBreakpointBin
      ref={ref}
      style={{ width: "450px", height: "100px", opacity }}
      breakpoints={[
        {
          condition: { condition: "max-width: 400pt" },
          onApply: () => setOpacity(0.5),
          onUnapply: () => setOpacity(1),
        },
        {
          condition: { condition: "(max-width: 300px) and (max-height: 100px)" },
          onApply: () => setOpacity(0.2),
          onUnapply: () => setOpacity(1),
        },
      ]}
      data-testid="target"
    >
      <GtkLabel label="Breakpoint content" />
    </AdwBreakpointBin>
  );
}

/** Fixes its child's height when it mounts, like AdwDialog fixing its natural size when presented. */
function SizedOnMount({ children }: { children: ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const child = ref.current?.firstElementChild;
    if (child instanceof HTMLElement) child.style.height = `${child.offsetHeight}px`;
  }, []);
  return <div ref={ref}>{children}</div>;
}

/** What the flow-box-behavior case's flow boxes report, for its test to read. */
const flowBoxEvents: string[] = [];
(window as unknown as { flowBoxEvents: string[] }).flowBoxEvents = flowBoxEvents;

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
  "button-icon": () => <GtkButton iconName="OpenMenu" data-testid="target" />,
  "button-circular": () => (
    <GtkButton iconName="OpenMenu" className="circular" data-testid="target" />
  ),
  "button-icon-label": () => <GtkButton iconName="OpenMenu" label="Open" data-testid="target" />,
  "button-can-shrink": () => (
    <div style={{ width: 120, display: "flex", flexDirection: "column" }}>
      <GtkButton label="A very long button label here" canShrink data-testid="target" />
    </div>
  ),
  "button-pill": () => <GtkButton label="Button" className="pill" data-testid="target" />,
  "button-disabled": () => <GtkButton label="Button" disabled data-testid="target" />,

  // GtkCalendar cases
  "calendar-default": () => <GtkCalendar year={2024} month={0} day={15} data-testid="target" />,
  "calendar-disabled": () => (
    <GtkCalendar year={2024} month={0} day={15} disabled data-testid="target" />
  ),
  "calendar-marked": () => (
    <GtkCalendar year={2024} month={0} day={15} markedDays={[5]} data-testid="target" />
  ),
  "calendar-no-day-names": () => (
    <GtkCalendar year={2024} month={0} day={15} showDayNames={false} data-testid="target" />
  ),
  "calendar-week-numbers": () => (
    <GtkCalendar year={2024} month={0} day={15} showWeekNumbers data-testid="target" />
  ),

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
  "check-button-custom-child": () => (
    <GtkCheckButton data-testid="target">
      <GtkBox orientation="vertical">
        <GtkLabel label="Title line" xalign={0} />
        <GtkLabel label="Second line of text" xalign={0} />
      </GtkBox>
    </GtkCheckButton>
  ),
  "check-button-empty-label": () => <GtkCheckButton label="" data-testid="target" />,
  "radio-button-default": () => <GtkCheckButton label="Radio" group="test" data-testid="target" />,
  "radio-button-checked": () => (
    <GtkCheckButton label="Radio" group="test" active data-testid="target" />
  ),

  // GtkScale cases
  "scale-default": () => <GtkScale min={0} max={100} value={50} step={1} data-testid="target" />,
  // Native sizes (set_width/height_request) include the 12px padding; CSS ones don't.
  "scale-draw-value": () => (
    <GtkScale min={0} max={100} value={25} drawValue style={{ width: 226 }} data-testid="target" />
  ),
  "scale-marks-inverted": () => (
    <GtkScale
      min={0}
      max={100}
      value={20}
      inverted
      marks={[
        { value: 0, position: "bottom", label: "Low" },
        { value: 50, position: "top", label: "Mid" },
        { value: 75, position: "top" },
        { value: 100, position: "bottom", label: "High" },
      ]}
      style={{ width: 226 }}
      data-testid="target"
    />
  ),
  "scale-vertical": () => (
    <GtkScale
      min={0}
      max={100}
      value={50}
      orientation="vertical"
      style={{ height: 176 }}
      data-testid="target"
    />
  ),

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
      primaryIconName="EditFind"
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),
  "entry-progress": () => (
    <GtkEntry
      text="Progress"
      progressFraction={0.5}
      ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
    />
  ),

  // GtkPasswordEntry cases
  "password-entry-behavior": () => <PasswordEntryBehavior />,
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
  "password-entry-natural-width": () => (
    <GtkBox orientation="vertical">
      <GtkPasswordEntry
        showPeekIcon
        halign="start"
        ref={(el) => el?.parentElement?.setAttribute("data-testid", "target")}
      />
    </GtkBox>
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
  "scrollbar-value": () => (
    <GtkScrollbar
      orientation="vertical"
      value={0.3}
      pageSize={0.3}
      style={{ height: "150px" }}
      data-testid="target"
    />
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
  "label-wrap-heights": () => (
    <GtkBox
      orientation="vertical"
      halign="start"
      valign="start"
      style={{ width: 200 }}
      data-testid="target"
    >
      <GtkLabel
        label="Typeset is an app that doesn’t exist."
        wrap
        wrapMode="word-char"
        xalign={0}
        className="body"
      />
      <GtkLabel
        label="Two lines of the default font in a wrapping label."
        wrap
        wrapMode="word-char"
        xalign={0}
      />
      <GtkLabel label="After" xalign={0} />
    </GtkBox>
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
  "menu-button-text-default": () => (
    <GtkMenuButton label="Button" popover={<div />} data-testid="target" />
  ),
  "menu-button-icon": () => (
    <GtkMenuButton iconName="OpenMenu" popover={<div />} data-testid="target" />
  ),
  "menu-button-flat": () => (
    <GtkMenuButton label="Button" hasFrame={false} popover={<div />} data-testid="target" />
  ),
  "menu-button-circular": () => (
    <GtkMenuButton className="circular" popover={<div />} data-testid="target" />
  ),
  "menu-button-disabled": () => (
    <GtkMenuButton label="Button" disabled popover={<div />} data-testid="target" />
  ),
  "menu-button-always-show-arrow": () => (
    <GtkMenuButton iconName="OpenMenu" alwaysShowArrow popover={<div />} data-testid="target" />
  ),
  "menu-button-circular-box": () => (
    <GtkBox spacing={6} data-testid="target">
      <GtkButton iconName="ListAdd" />
      <GtkMenuButton className="circular" popover={<div />} />
    </GtkBox>
  ),
  "menu-button-direction-none": () => (
    <GtkMenuButton label="None" direction="none" popover={<div />} data-testid="target" />
  ),
  "menu-button-label-up": () => (
    <GtkMenuButton label="Up" direction="up" popover={<div />} data-testid="target" />
  ),

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
  "spin-button-disabled": () => (
    <GtkSpinButton min={0} max={100} value={50} disabled data-testid="target" />
  ),
  "spin-button-vertical": () => (
    <GtkSpinButton min={0} max={100} value={50} orientation="vertical" data-testid="target" />
  ),

  // GtkSwitch cases
  "switch-off-default": () => <GtkSwitch data-testid="target" />,
  "switch-on-default": () => <GtkSwitch active data-testid="target" />,
  "switch-off-disabled": () => <GtkSwitch disabled data-testid="target" />,
  "switch-on-disabled": () => <GtkSwitch active disabled data-testid="target" />,
  "switch-off-title-1": () => (
    <GtkBox className="title-1" halign="center" valign="center">
      <GtkSwitch data-testid="target" />
    </GtkBox>
  ),
  "switch-on-pending": () => (
    <GtkSwitch active state={false} halign="center" valign="center" data-testid="target" />
  ),
  "switch-on-rtl": () => (
    <div dir="rtl">
      <GtkSwitch active halign="center" valign="center" data-testid="target" />
    </div>
  ),
  "switch-on-small-slider": () => (
    <>
      <style>{`
        .gtk-switch.small-slider { min-width: 22px; padding: 0; }
        .gtk-switch.small-slider > .gtk-slider { min-width: 12px; min-height: 12px; margin: 5px; }
      `}</style>
      <GtkSwitch
        active
        className="small-slider"
        halign="center"
        valign="center"
        data-testid="target"
      />
    </>
  ),

  // GtkTextView cases
  "text-view-default": () => <GtkTextView ref={textViewTarget} />,
  "text-view-monospace": () => <GtkTextView monospace ref={textViewTarget} />,
  "text-view-non-editable": () => <GtkTextView editable={false} ref={textViewTarget} />,
  "text-view-disabled": () => <GtkTextView disabled ref={textViewTarget} />,
  "text-view-scrolled": () => (
    <GtkScrolledWindow hasFrame style={{ width: "200px", height: "100px" }} data-testid="target">
      <GtkTextView />
    </GtkScrolledWindow>
  ),

  // GtkToggleButton cases
  "toggle-text-default": () => <GtkToggleButton label="Toggle" data-testid="target" />,
  "toggle-text-checked": () => <GtkToggleButton label="Toggle" active data-testid="target" />,
  "toggle-text-flat": () => (
    <GtkToggleButton label="Toggle" hasFrame={false} data-testid="target" />
  ),
  "toggle-disabled": () => <GtkToggleButton label="Toggle" disabled data-testid="target" />,
  "toggle-icon": () => <GtkToggleButton iconName="OpenMenu" data-testid="target" />,
  "toggle-label-child": () => (
    <GtkToggleButton data-testid="target">
      <GtkLabel label="Child label" />
    </GtkToggleButton>
  ),
  "toggle-grouped": () => <ToggleGrouped />,

  // GtkWindow cases
  "window-child-valign-center": () => (
    <GtkWindow
      style={{ width: 200, height: 100 }}
      // The content area the window's child gets.
      ref={(el) => el?.lastElementChild?.setAttribute("data-testid", "target")}
    >
      <GtkLabel label="Content" valign="center" />
    </GtkWindow>
  ),

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
  "box-hexpand-computed": () => (
    <GtkBox halign="start" style={{ width: 360 }} data-testid="target">
      <GtkButton>
        <GtkLabel label="Button" hexpand />
      </GtkButton>
      <GtkCenterBox centerWidget={<GtkLabel label="Center" hexpand />} />
      <GtkBox hexpand={false}>
        <GtkLabel label="Box" hexpand />
      </GtkBox>
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
  "flow-box-aligned": () => (
    <GtkFlowBox
      selectionMode="none"
      minChildrenPerLine={3}
      maxChildrenPerLine={3}
      valign="start"
      style={{ width: 300 }}
      data-testid="target"
    >
      {["A", "Bravo", "Charlie charlie", "D", "Echo", "Foxtrot", "G"].map((label) => (
        <GtkFlowBoxChild key={label}>
          <GtkLabel label={label} />
        </GtkFlowBoxChild>
      ))}
    </GtkFlowBox>
  ),
  "flow-box-behavior": () => (
    <GtkBox orientation="vertical" spacing={12}>
      <GtkEntry />
      <GtkFlowBox
        id="flow-box-single"
        minChildrenPerLine={3}
        maxChildrenPerLine={3}
        onChildActivated={(i) => flowBoxEvents.push(`activated ${i}`)}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <GtkLabel key={i} label={`C${i}`} />
        ))}
      </GtkFlowBox>
      <GtkFlowBox
        id="flow-box-multiple"
        selectionMode="multiple"
        activateOnSingleClick={false}
        onChildActivated={(i) => flowBoxEvents.push(`activated ${i}`)}
        onSelectedChildrenChanged={(s) => flowBoxEvents.push(`selected [${s}]`)}
      >
        <GtkLabel label="M0" />
        <GtkLabel label="M1" />
        <GtkLabel label="M2" />
        <GtkLabel label="M3" />
        <GtkButton label="M4" onClicked={() => flowBoxEvents.push("button clicked")} />
        <GtkFlowBoxChild disabled>
          <GtkLabel label="M5" />
        </GtkFlowBoxChild>
      </GtkFlowBox>
    </GtkBox>
  ),
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
  "flow-box-homogeneous": () => (
    <GtkFlowBox
      selectionMode="none"
      homogeneous
      maxChildrenPerLine={3}
      columnSpacing={6}
      rowSpacing={6}
      valign="start"
      style={{ width: 300 }}
      data-testid="target"
    >
      {["A", "Bravo", "Charlie charlie", "D", "Echo"].map((label) => (
        <GtkFlowBoxChild key={label}>
          <GtkLabel label={label} />
        </GtkFlowBoxChild>
      ))}
    </GtkFlowBox>
  ),
  "flow-box-selected": () => (
    <GtkFlowBox valign="start" halign="start" selectedChildren={[1]} data-testid="target">
      <GtkFlowBoxChild>
        <GtkLabel label="One" />
      </GtkFlowBoxChild>
      <GtkFlowBoxChild>
        <GtkLabel label="Two" />
      </GtkFlowBoxChild>
      <GtkFlowBoxChild>
        <GtkLabel label="Three" />
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
  "scrolled-window-hpolicy-never": () => (
    <GtkBox orientation="horizontal" style={{ width: "80px" }} data-testid="target">
      <GtkScrolledWindow hasFrame hscrollbarPolicy="never" style={{ height: "58px" }}>
        <GtkLabel label="Never-scrolls-horizontally" />
      </GtkScrolledWindow>
    </GtkBox>
  ),
  "scrolled-window-natural": () => (
    <GtkBox orientation="vertical" data-testid="target">
      <GtkScrolledWindow hasFrame>
        <GtkLabel label={Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n")} />
      </GtkScrolledWindow>
    </GtkBox>
  ),
  "scrolled-window-overflow": () => (
    <GtkScrolledWindow style={{ width: "200px", height: "150px" }} data-testid="target">
      <GtkLabel label={Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`).join("\n")} />
    </GtkScrolledWindow>
  ),

  // GtkStack cases
  "stack-child-align": () => (
    <GtkStack style={{ minWidth: 300, minHeight: 80 }} data-testid="target">
      <GtkStackPage name="page">
        <GtkButton label="Centered" halign="center" valign="center" />
      </GtkStackPage>
    </GtkStack>
  ),
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
  "stack-hhomogeneous-false": () => (
    <GtkStack visibleChildName="short" hhomogeneous={false} data-testid="target">
      <GtkStackPage name="short">
        <GtkLabel label="Short visible page" />
      </GtkStackPage>
      <GtkStackPage name="long">
        <GtkLabel label="A few words" wrap />
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
  "stack-switcher-expand": () => (
    <GtkBox orientation="vertical" spacing={8} style={{ minWidth: 500 }} data-testid="target">
      <GtkStackSwitcher
        pages={[
          { name: "page1", title: "First" },
          { name: "page2", title: "Second" },
          { name: "page3", title: "Third" },
        ]}
        activePageName="page1"
      />
      <GtkStack visibleChildName="page1">
        <GtkStackPage name="page1">
          <GtkLabel label="One" />
        </GtkStackPage>
        <GtkStackPage name="page2">
          <GtkLabel label="Two" />
        </GtkStackPage>
        <GtkStackPage name="page3">
          <GtkLabel label="Three" />
        </GtkStackPage>
      </GtkStack>
    </GtkBox>
  ),
  "stack-switcher-icons": () => (
    <GtkStackSwitcher
      halign="start"
      pages={[
        { name: "open", title: "Open", iconName: "DocumentOpen" },
        { name: "find", iconName: "EditFind" },
        { name: "text", title: "Attention", needsAttention: true },
        { name: "untitled" },
      ]}
      activePageName="open"
      data-testid="target"
    />
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
  "notebook-homogeneous": () => (
    <GtkNotebook page={1} data-testid="target">
      <GtkNotebookPage tabLabel="Large">
        <GtkBox style={{ width: 200, height: 120 }} />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Small">
        <GtkLabel label="Small page" />
      </GtkNotebookPage>
    </GtkNotebook>
  ),
  "notebook-scrollable": () => (
    <GtkNotebook page={5} scrollable style={{ width: 240 }} data-testid="target">
      {["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"].map((name) => (
        <GtkNotebookPage key={name} tabLabel={name}>
          <GtkLabel label={`${name} content`} />
        </GtkNotebookPage>
      ))}
    </GtkNotebook>
  ),
  "notebook-tab-pos-left": () => (
    <GtkNotebook tabPos="left" style={{ width: 348, height: 188 }} data-testid="target">
      <GtkNotebookPage tabLabel="One">
        <GtkLabel label="Page 1" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Two">
        <GtkLabel label="Page 2" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Three">
        <GtkLabel label="Page 3" />
      </GtkNotebookPage>
    </GtkNotebook>
  ),
  "notebook-tabs": () => (
    <GtkNotebook style={{ width: 348, height: 188 }} data-testid="target">
      <GtkNotebookPage tabLabel="One">
        <GtkLabel label="Page 1" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Two">
        <GtkLabel label="Page 2" />
      </GtkNotebookPage>
      <GtkNotebookPage tabLabel="Three">
        <GtkLabel label="Page 3" />
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
  "popover-no-arrow": () => (
    <GtkBox data-testid="target">
      <GtkLabel label="Anchor" />
      <GtkPopover
        visible
        hasArrow={false}
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
  "dropdown-fill": () => (
    <GtkDropDown
      items={["Option 1", "Option 2", "Option 3"]}
      selected={0}
      halign="start"
      style={{ width: 300 }}
      data-testid="target"
    />
  ),

  // GtkListBox cases
  "listbox-bare-labels": () => (
    <GtkListBox selectionMode="none" data-testid="target">
      <GtkLabel label="Row 1" />
      <GtkLabel label="Row 2" />
      <GtkLabel label="Row 3" />
    </GtkListBox>
  ),
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
  "listbox-selection": () => (
    <GtkListBox selectedRows={[2]} data-testid="target">
      <GtkListBoxRow activatable={false}>
        <GtkLabel label="Selectable" />
      </GtkListBoxRow>
      <GtkListBoxRow activatable={false} selectable={false}>
        <GtkLabel label="Neither" />
      </GtkListBoxRow>
      <GtkListBoxRow>
        <GtkLabel label="Selected" />
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
  // The native case fills the test window, which AdwWindow's minimum size makes
  // 352px wide for the bar (its -1px margins included).
  "headerbar-narrow-title": () => (
    <GtkHeaderBar
      showWindowControls={false}
      start={<GtkButton label="Start" />}
      end={<GtkButton label="End" />}
      titleWidget={<GtkWindowTitle title="A Very Long Window Title Here" />}
      style={{ width: 352 }}
      data-testid="target"
    />
  ),
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

  "headerbar-window-title": () => (
    <GtkWindow title="My App">
      <GtkHeaderBar showWindowControls={false} data-testid="target" />
    </GtkWindow>
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
  "avatar-default": () => <AdwAvatar size={48} ref={avatarGizmoTarget} />,
  "avatar-initials": () => (
    <AdwAvatar size={48} text="Jane Doe" showInitials ref={avatarGizmoTarget} />
  ),
  "avatar-small": () => <AdwAvatar size={24} text="Alice" showInitials ref={avatarGizmoTarget} />,

  // AdwBanner cases
  "banner-revealed": () => (
    <AdwBanner title="This is a banner" revealed style={{ width: 200 }} data-testid="target" />
  ),
  "banner-start": () => (
    <AdwBanner
      title="You are offline"
      buttonLabel="Retry"
      revealed
      style={{ width: 300 }}
      data-testid="target"
    />
  ),
  "banner-wide": () => (
    <AdwBanner
      title="You are offline"
      buttonLabel="Retry"
      revealed
      style={{ width: 600 }}
      data-testid="target"
    />
  ),
  "banner-with-button": () => (
    <AdwBanner
      title="You are offline"
      buttonLabel="Retry"
      revealed
      style={{ width: 200 }}
      data-testid="target"
    />
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
  "clamp-child-min": () => (
    <AdwClamp maximumSize={300} style={{ width: "801px" }} data-testid="target">
      <GtkBox style={{ minWidth: "462px", minHeight: "20px" }} />
    </AdwClamp>
  ),
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
  "carousel-natural-pages": () => (
    <AdwCarousel spacing={12} style={{ width: 300, height: 100 }} data-testid="target">
      <GtkBox orientation="vertical" style={{ minWidth: 100 }} />
      <GtkBox orientation="vertical" style={{ minWidth: 80 }} />
      <GtkBox orientation="vertical" style={{ minWidth: 60 }} />
    </AdwCarousel>
  ),
  "carousel-vertical": () => (
    <AdwCarousel
      orientation="vertical"
      spacing={12}
      style={{ width: 240, height: 100 }}
      data-testid="target"
    >
      <GtkLabel label="Page 1" vexpand />
      <GtkLabel label="Page 2" vexpand />
      <GtkLabel label="Page 3" vexpand />
    </AdwCarousel>
  ),

  // AdwToastOverlay cases
  "toast-overlay-default": () => (
    <AdwToastOverlay data-testid="target">
      <GtkLabel label="Content under toasts" />
    </AdwToastOverlay>
  ),

  // AdwButtonContent cases
  "button-content-button": () => (
    <GtkButton style={{ width: 150, boxSizing: "border-box" }} data-testid="target">
      <AdwButtonContent iconName="DocumentOpen" label="Open" />
    </GtkButton>
  ),
  "button-content-icon-label": () => (
    <AdwButtonContent iconName="OpenMenu" label="Open" data-testid="target" />
  ),
  "button-content-label-only": () => <AdwButtonContent label="Open" data-testid="target" />,
  "button-content-icon-only": () => <AdwButtonContent iconName="OpenMenu" data-testid="target" />,

  // AdwSplitButton cases
  "split-button-text-default": () => (
    <AdwSplitButton label="Button" popover={<GtkLabel label="Popover" />} data-testid="target" />
  ),
  "split-button-icon": () => (
    <AdwSplitButton
      iconName="OpenMenu"
      popover={<GtkLabel label="Popover" />}
      data-testid="target"
    />
  ),
  "split-button-flat": () => (
    <AdwSplitButton
      label="Button"
      className="flat"
      popover={<GtkLabel label="Popover" />}
      data-testid="target"
    />
  ),
  "split-button-open": () => <OpenSplitButton />,
  "split-button-tall": () => (
    <AdwSplitButton
      child={<GtkLabel label="Tall" style={{ minHeight: 50 }} />}
      popover={<GtkLabel label="Popover" />}
      data-testid="target"
    />
  ),
  "split-button-fill": () => (
    <GtkBox orientation="vertical" style={{ width: 200 }}>
      <AdwSplitButton label="Fill" popover={<GtkLabel label="Popover" />} data-testid="target" />
    </GtkBox>
  ),
  "split-button-can-shrink": () => (
    <div style={{ display: "flex", width: 100 }}>
      <AdwSplitButton
        label="Save document as"
        canShrink
        popover={<GtkLabel label="Popover" />}
        data-testid="target"
      />
    </div>
  ),

  // AdwButtonRow cases — inside GtkListBox to match native structure
  "button-row-default": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" data-testid="target" />
    </GtkListBox>
  ),
  "button-row-start-icon": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" startIconName="EditDelete" data-testid="target" />
    </GtkListBox>
  ),
  "button-row-destructive": () => (
    <GtkListBox selectionMode="none">
      <AdwButtonRow title="Delete" className="destructive-action" data-testid="target" />
    </GtkListBox>
  ),
  "button-row-long-title": () => (
    <GtkListBox
      selectionMode="none"
      className="boxed-list"
      style={{ width: 350 }}
      data-testid="target"
    >
      <AdwButtonRow
        title="A very long button row title that ellipsizes at the end"
        startIconName="ListAdd"
      />
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
        { name: "list", iconName: "ViewList" },
        { name: "grid", iconName: "ViewGrid" },
      ]}
      data-testid="target"
    />
  ),
  "toggle-group-homogeneous": () => (
    <AdwToggleGroup
      active={1}
      homogeneous
      canShrink={false}
      toggles={[
        { name: "a", label: "Short" },
        { name: "b", label: "Medium Text" },
        { name: "c", label: "Long Label Here" },
      ]}
      data-testid="target"
    />
  ),
  "toggle-group-fill": () => (
    <div style={{ width: 300 }}>
      <AdwToggleGroup
        active={1}
        toggles={[
          { name: "list", label: "List" },
          { name: "grid", label: "Grid" },
          { name: "compact", label: "Compact" },
        ]}
        data-testid="target"
      />
    </div>
  ),
  "toggle-group-can-shrink": () => (
    <div style={{ width: 120 }}>
      <AdwToggleGroup
        active={0}
        toggles={[
          { name: "overview", label: "Overview" },
          { name: "statistics", label: "Statistics" },
        ]}
        data-testid="target"
      />
    </div>
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
  "adw-action-row-icon": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="Action Row" iconName="EditDelete" />
    </GtkListBox>
  ),
  "adw-action-row-subtitle-only": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="" subtitle="Only a subtitle" />
    </GtkListBox>
  ),
  "adw-action-row-suffix-fill": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwActionRow title="Action Row" suffixWidget={<GtkButton label="Action" />} />
    </GtkListBox>
  ),

  // AdwEntryRow cases
  "adw-entry-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwEntryRow title="Entry Row" />
    </GtkListBox>
  ),
  "adw-entry-row-disabled": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwEntryRow title="Entry Row" text="Hello World" disabled />
    </GtkListBox>
  ),
  // As wide as the native list (the window's minimum width).
  "adw-entry-row-long-title": () => (
    <GtkListBox
      selectionMode="none"
      className="boxed-list"
      style={{ width: 350 }}
      data-testid="target"
    >
      <AdwEntryRow title="A very long entry row title that cannot possibly fit in the row at all" />
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
  "adw-spin-row-long-title": () => (
    <GtkBox orientation="vertical" halign="start" style={{ width: 360 }} data-testid="target">
      <GtkListBox selectionMode="none" className="boxed-list">
        <AdwSpinRow title="Maximum simultaneous downloads" value={4} min={1} max={16} />
      </GtkListBox>
    </GtkBox>
  ),

  // AdwComboRow cases
  "adw-combo-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwComboRow title="Combo Row" items={["Option 1", "Option 2", "Option 3"]} selected={0} />
    </GtkListBox>
  ),
  "adw-combo-row-long-value": () => (
    <GtkListBox
      selectionMode="none"
      className="boxed-list"
      style={{ width: 360 }}
      data-testid="target"
    >
      <AdwComboRow
        title="Appearance"
        items={["Automatic (follow the system setting when possible)", "Light", "Dark"]}
        selected={0}
      />
    </GtkListBox>
  ),
  "adw-combo-row-single-item": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwComboRow title="Combo Row" items={["Only"]} selected={0} />
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
  "adw-switch-row-prefix-suffix": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwSwitchRow
        title="Switch Row"
        prefixWidget={<GtkImage iconName="AirplaneMode" />}
        suffixWidget={<GtkButton iconName="DocumentEdit" className="flat" valign="center" />}
      />
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
  "adw-expander-row-widgets": () => (
    <div style={{ width: 360 }}>
      <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
        <AdwExpanderRow
          title="A very long expander row title that should be ellipsized after one line"
          subtitle="A very long subtitle that should also be ellipsized after one line"
          titleLines={1}
          subtitleLines={1}
          showEnableSwitch
          prefixWidget={
            <>
              <GtkImage iconName="EditFind" />
              <GtkImage iconName="EditFind" />
            </>
          }
          suffixWidget={<GtkButton iconName="EditDelete" className="flat" valign="center" />}
        >
          <AdwActionRow title="Child Row" />
        </AdwExpanderRow>
      </GtkListBox>
    </div>
  ),

  // AdwPreferencesRow cases
  "adw-preferences-row-default": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwPreferencesRow title="Preferences Row" />
    </GtkListBox>
  ),
  "adw-preferences-row-custom-child": () => (
    <GtkListBox selectionMode="none" className="boxed-list" data-testid="target">
      <AdwPreferencesRow title="Preferences Row">
        <GtkLabel label="Custom child" style={{ margin: 12 }} />
      </AdwPreferencesRow>
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

  "adw-preferences-group-footer": () => (
    <AdwPreferencesGroup title="Group Title" data-testid="target">
      <AdwActionRow title="Row" />
      <GtkLabel label="Footer" xalign={0} className="caption" />
    </AdwPreferencesGroup>
  ),
  "adw-preferences-group-mixed": () => (
    <SizedOnMount>
      <AdwPreferencesGroup title="Group Title" data-testid="target">
        <GtkLabel label="Note" xalign={0} />
        <WrappedActionRow title="Row 1" subtitle="Subtitle" />
        <GtkLabel label="Footer" xalign={0} className="caption" />
        <AdwActionRow title="Row 2" />
      </AdwPreferencesGroup>
    </SizedOnMount>
  ),
  "adw-preferences-group-label-only": () => (
    <AdwPreferencesGroup data-testid="target">
      <GtkLabel label="Footer" xalign={0} className="caption" />
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
  // The native case fills the test window, which AdwWindow's minimum size makes
  // 352px wide for the bar (its -1px margins included).
  "adw-headerbar-narrow-title": () => (
    <AdwHeaderBar
      showStartTitleButtons={false}
      showEndTitleButtons={false}
      showBackButton={false}
      end={<GtkButton label="End" />}
      titleWidget={<GtkWindowTitle title="A Very Long Window Title That Goes On" />}
      style={{ width: 352 }}
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
  "adw-view-switcher-attention": () => (
    <AdwViewSwitcher
      pages={[
        { name: "home", title: "Home", iconName: "GoHome" },
        { name: "mail", title: "Mail", iconName: "MailUnread", needsAttention: true },
        {
          name: "chat",
          title: "Chat",
          iconName: "UserAvailable",
          badgeNumber: 5,
          needsAttention: true,
        },
      ]}
      policy="wide"
      data-testid="target"
    />
  ),
  "adw-view-switcher-bar": () => (
    <AdwViewSwitcherBar
      reveal
      pages={[
        { name: "home", title: "Home", iconName: "GoHome" },
        { name: "search", title: "Search", iconName: "SystemSearch" },
        { name: "settings", title: "Settings", iconName: "PreferencesSystem" },
      ]}
      style={{ width: 400 }}
      data-testid="target"
    />
  ),
  "adw-view-switcher-default": () => (
    <AdwViewSwitcher
      pages={[
        { name: "page1", title: "Page 1", iconName: "OpenMenu" },
        { name: "page2", title: "Page 2", iconName: "OpenMenu" },
      ]}
      activePageName="page1"
      policy="wide"
      data-testid="target"
    />
  ),
  "adw-view-switcher-narrow": () => (
    <AdwViewSwitcher
      pages={[
        { name: "home", title: "Home", iconName: "GoHome" },
        { name: "search", title: "Search", iconName: "SystemSearch" },
        { name: "other", title: "Other" },
      ]}
      policy="narrow"
      data-testid="target"
    />
  ),

  // AdwBreakpointBin cases
  "adw-breakpoint-bin-conditions": () => <BreakpointConditions />,
  "adw-breakpoint-bin-default": () => (
    <AdwBreakpointBin style={{ width: "200px", height: "100px" }} data-testid="target">
      <GtkLabel label="Breakpoint content" />
    </AdwBreakpointBin>
  ),

  // AdwNavigationView cases
  "adw-navigation-view-back-button": () => (
    <AdwNavigationView
      pages={["Home", "Details"].map((title) => ({
        tag: title.toLowerCase(),
        title,
        children: (
          <AdwToolbarView
            topBars={<AdwHeaderBar showStartTitleButtons={false} showEndTitleButtons={false} />}
            content={<GtkLabel label={title} />}
          />
        ),
      }))}
      stack={["home", "details"]}
      style={{ width: "300px", height: "200px" }}
      data-testid="target"
    />
  ),
  "adw-navigation-view-default": () => (
    <AdwNavigationView
      pages={[{ tag: "home", title: "Home", children: <GtkLabel label="Home Page" /> }]}
      initialPage="home"
      data-testid="target"
    />
  ),
  "adw-navigation-view-scrolled": () => (
    <AdwNavigationView
      pages={[
        {
          tag: "home",
          title: "Home",
          children: (
            <GtkBox orientation="vertical">
              <GtkScrolledWindow vexpand>
                <GtkBox orientation="vertical">
                  {Array.from({ length: 12 }, (_, i) => (
                    <GtkLabel key={i} label={`Row ${i + 1}`} />
                  ))}
                </GtkBox>
              </GtkScrolledWindow>
            </GtkBox>
          ),
        },
      ]}
      initialPage="home"
      style={{ width: "200px", height: "150px" }}
      data-testid="target"
    />
  ),

  // AdwOverlaySplitView cases
  "adw-overlay-split-view-collapsed-rtl": () => (
    <AdwOverlaySplitView
      collapsed
      showSidebar
      dir="rtl"
      style={{ width: 600, height: 200 }}
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-overlay-split-view-collapsed-shown": () => (
    <AdwOverlaySplitView
      collapsed
      showSidebar
      style={{ width: 600, height: 200 }}
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-overlay-split-view-default": () => (
    <AdwOverlaySplitView
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-overlay-split-view-end": () => (
    <AdwOverlaySplitView
      sidebarPosition="end"
      style={{ width: 600, height: 200 }}
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-overlay-split-view-hidden": () => (
    <AdwOverlaySplitView
      showSidebar={false}
      style={{ width: 600, height: 200 }}
      sidebar={<GtkLabel label="Sidebar" />}
      content={<GtkLabel label="Content" />}
      data-testid="target"
    />
  ),
  "adw-overlay-split-view-wide-sidebar": () => (
    <AdwOverlaySplitView
      style={{ width: 1000, height: 60 }}
      sidebar={<GtkBox style={{ width: 400 }} />}
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
