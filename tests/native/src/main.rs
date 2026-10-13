mod cases;
mod extract;

use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use axum::Router;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::get;
use clap::{Parser, Subcommand};
use relm4::adw;
use relm4::adw::prelude::*;
use relm4::gtk;
use relm4::prelude::*;

#[derive(Parser)]
#[command(name = "gtk-js-test")]
#[command(about = "Render GTK widgets and extract structural properties as JSON")]
struct Cli {
    #[command(subcommand)]
    command: Command,

    /// Write JSON output to this file instead of stdout
    #[arg(long)]
    output: Option<PathBuf>,
}

#[derive(Subcommand)]
enum Command {
    Serve {
        #[arg(long)]
        port_file: Option<PathBuf>,
    },
    ActionbarDefault,
    AdwActionRowDefault,
    AdwActionRowWithSubtitle,
    AdwActionRowActivatable,
    AdwBreakpointBinDefault,
    AdwComboRowDefault,
    AdwEntryRowDefault,
    AdwEntryRowWithText,
    AdwExpanderRowDefault,
    AdwExpanderRowExpanded,
    AdwHeaderbarDefault,
    AdwHeaderbarWithTitle,
    AdwHeaderbarStartEnd,
    AdwNavigationViewDefault,
    AdwOverlaySplitViewDefault,
    AdwPasswordEntryRowDefault,
    AdwPreferencesGroupDefault,
    AdwPreferencesGroupWithDescription,
    AdwPreferencesPageDefault,
    AdwPreferencesRowDefault,
    AdwSpinRowDefault,
    AdwSwitchRowDefault,
    AdwSwitchRowActive,
    AdwToolbarViewDefault,
    AdwToolbarViewWithBottom,
    AdwViewSwitcherDefault,
    AvatarDefault,
    AvatarInitials,
    AvatarSmall,
    BannerRevealed,
    BannerWithButton,
    CarouselDefault,
    ClampDefault,
    StatusPageDefault,
    StatusPageNoIcon,
    ToastOverlayDefault,
    BoxHorizontalDefault,
    BoxVerticalDefault,
    BoxSpacing,
    BoxHexpand,
    BoxHomogeneous,
    CenterBoxDefault,
    ExpanderDefault,
    ExpanderExpanded,
    FlowBoxDefault,
    FrameDefault,
    HeaderbarDefault,
    HeaderbarStartEnd,
    HeaderbarWithTitle,
    FrameNoLabel,
    GridDefault,
    OverlayDefault,
    PanedHorizontal,
    PanedVertical,
    ButtonValignCenterHbox,
    ButtonValignEndHbox,
    ButtonHalignCenterVbox,
    ButtonHalignEndVbox,
    DropdownDefault,
    ButtonTextDefault,
    ButtonTextFlat,
    ButtonTextSuggested,
    ButtonTextDestructive,
    ButtonIcon,
    ButtonCircular,
    ButtonContentIconLabel,
    ButtonContentLabelOnly,
    ButtonContentIconOnly,
    ButtonPill,
    ButtonDisabled,
    ButtonRowDefault,
    ButtonRowStartIcon,
    ButtonRowDestructive,
    CalendarDefault,
    CheckButtonDefault,
    CheckButtonChecked,
    CheckButtonIndeterminate,
    CheckButtonDisabled,
    CheckButtonCheckedDisabled,
    CheckButtonNoLabel,
    EditableLabelDisplayDefault,
    EditableLabelDisplayEmpty,
    EditableLabelEditingActive,
    EditableLabelDisabled,
    EntryDefault,
    EntryDisabled,
    EntryFlat,
    EntryPlaceholder,
    EntryPrimaryIcon,
    ImageDefault,
    ImageNormalIcons,
    ImageLargeIcons,
    #[clap(name = "image-pixel-size-24")]
    ImagePixelSize24,
    ImageNoIconName,
    LabelDefault,
    LabelWrapWord,
    LabelWrapChar,
    LabelEllipsize,
    LabelJustifyCenter,
    LabelWidthChars,
    LabelXalign,
    LabelDisabled,
    ListboxDefault,
    ListboxSeparators,
    LevelbarContinuousDefault,
    LevelbarContinuousLow,
    LevelbarContinuousFull,
    LevelbarContinuousVertical,
    LevelbarDiscreteDefault,
    LevelbarDiscreteInverted,
    LevelbarDisabled,
    LinkDefault,
    LinkVisited,
    NotebookDefault,
    MenuButtonTextDefault,
    MenuButtonIcon,
    MenuButtonFlat,
    MenuButtonCircular,
    MenuButtonDisabled,
    PopoverDefault,
    PasswordEntryDefault,
    PasswordEntryDisabled,
    PasswordEntryPeekIcon,
    #[clap(name = "progressbar-horizontal-50")]
    ProgressbarHorizontal50,
    #[clap(name = "progressbar-horizontal-0")]
    ProgressbarHorizontal0,
    #[clap(name = "progressbar-horizontal-100")]
    ProgressbarHorizontal100,
    #[clap(name = "progressbar-vertical-50")]
    ProgressbarVertical50,
    #[clap(name = "progressbar-inverted-50")]
    ProgressbarInverted50,
    ProgressbarTextCustom,
    ProgressbarOsdHorizontal,
    ProgressbarFractionSmall,
    RadioButtonDefault,
    RadioButtonChecked,
    ScaleDefault,
    ScrolledWindowDefault,
    ScrolledWindowFrame,
    StackDefault,
    SearchEntryDefault,
    SearchEntryDisabled,
    SearchbarDefault,
    SearchbarWithCloseButton,
    ScrollbarDefault,
    SeparatorHorizontalDefault,
    SeparatorVertical,
    SeparatorSpacerHorizontal,
    SpinButtonDefault,
    SpinButtonVertical,
    SpinnerDefault,
    SpinnerSpinning,
    SpinnerSpinningCustomSize,
    SpinnerDisabledNotSpinning,
    SpinnerDisabledSpinning,
    SplitButtonTextDefault,
    SplitButtonIcon,
    SplitButtonFlat,
    SwitchOffDefault,
    SwitchOnDefault,
    SwitchOffDisabled,
    SwitchOnDisabled,
    TextViewDefault,
    TextViewDisabled,
    TextViewMonospace,
    TextViewNonEditable,
    ToggleTextDefault,
    ToggleTextChecked,
    ToggleTextFlat,
    ToggleDisabled,
    ToggleGroupTextDefault,
    ToggleGroupIcon,
    ToggleGroupHomogeneous,
    WindowTitleTextDefault,
    WindowTitleWithSubtitle,
    WindowTitleLongText,
    WindowTitleNoSubtitle,
    WindowTitleBothEmpty,
}

struct NativeRequest {
    case_name: String,
    response: mpsc::SyncSender<Result<String, String>>,
}

#[derive(Clone)]
struct ServerState {
    sender: mpsc::Sender<NativeRequest>,
    ready: Arc<AtomicBool>,
}

fn debug_enabled() -> bool {
    std::env::var_os("GTK_JS_TEST_DEBUG").is_some()
}

fn debug_log(message: impl AsRef<str>) {
    if debug_enabled() {
        eprintln!("[native] {}", message.as_ref());
    }
}

macro_rules! widget_case {
    ($component:path, $use_inner:expr) => {{
        let component = <$component>::builder().launch(()).detach();
        Some((
            component.widget().clone().upcast::<gtk::Widget>(),
            $use_inner,
        ))
    }};
}

impl Command {
    fn case_name(&self) -> Option<&'static str> {
        match self {
            Self::Serve { .. } => None,
            Self::ActionbarDefault => Some("actionbar-default"),
            Self::AdwActionRowDefault => Some("adw-action-row-default"),
            Self::AdwActionRowWithSubtitle => Some("adw-action-row-with-subtitle"),
            Self::AdwActionRowActivatable => Some("adw-action-row-activatable"),
            Self::AdwBreakpointBinDefault => Some("adw-breakpoint-bin-default"),
            Self::AdwComboRowDefault => Some("adw-combo-row-default"),
            Self::AdwEntryRowDefault => Some("adw-entry-row-default"),
            Self::AdwEntryRowWithText => Some("adw-entry-row-with-text"),
            Self::AdwExpanderRowDefault => Some("adw-expander-row-default"),
            Self::AdwExpanderRowExpanded => Some("adw-expander-row-expanded"),
            Self::AdwHeaderbarDefault => Some("adw-headerbar-default"),
            Self::AdwHeaderbarWithTitle => Some("adw-headerbar-with-title"),
            Self::AdwHeaderbarStartEnd => Some("adw-headerbar-start-end"),
            Self::AdwNavigationViewDefault => Some("adw-navigation-view-default"),
            Self::AdwOverlaySplitViewDefault => Some("adw-overlay-split-view-default"),
            Self::AdwPasswordEntryRowDefault => Some("adw-password-entry-row-default"),
            Self::AdwPreferencesGroupDefault => Some("adw-preferences-group-default"),
            Self::AdwPreferencesGroupWithDescription => Some("adw-preferences-group-with-description"),
            Self::AdwPreferencesPageDefault => Some("adw-preferences-page-default"),
            Self::AdwPreferencesRowDefault => Some("adw-preferences-row-default"),
            Self::AdwSpinRowDefault => Some("adw-spin-row-default"),
            Self::AdwSwitchRowDefault => Some("adw-switch-row-default"),
            Self::AdwSwitchRowActive => Some("adw-switch-row-active"),
            Self::AdwToolbarViewDefault => Some("adw-toolbar-view-default"),
            Self::AdwToolbarViewWithBottom => Some("adw-toolbar-view-with-bottom"),
            Self::AdwViewSwitcherDefault => Some("adw-view-switcher-default"),
            Self::AvatarDefault => Some("avatar-default"),
            Self::AvatarInitials => Some("avatar-initials"),
            Self::AvatarSmall => Some("avatar-small"),
            Self::BannerRevealed => Some("banner-revealed"),
            Self::BannerWithButton => Some("banner-with-button"),
            Self::CarouselDefault => Some("carousel-default"),
            Self::ClampDefault => Some("clamp-default"),
            Self::StatusPageDefault => Some("status-page-default"),
            Self::StatusPageNoIcon => Some("status-page-no-icon"),
            Self::ToastOverlayDefault => Some("toast-overlay-default"),
            Self::BoxHorizontalDefault => Some("box-horizontal-default"),
            Self::BoxVerticalDefault => Some("box-vertical-default"),
            Self::BoxSpacing => Some("box-spacing"),
            Self::BoxHomogeneous => Some("box-homogeneous"),
            Self::BoxHexpand => Some("box-hexpand"),
            Self::CenterBoxDefault => Some("center-box-default"),
            Self::ExpanderDefault => Some("expander-default"),
            Self::ExpanderExpanded => Some("expander-expanded"),
            Self::FlowBoxDefault => Some("flow-box-default"),
            Self::FrameDefault => Some("frame-default"),
            Self::HeaderbarDefault => Some("headerbar-default"),
            Self::HeaderbarStartEnd => Some("headerbar-start-end"),
            Self::HeaderbarWithTitle => Some("headerbar-with-title"),
            Self::FrameNoLabel => Some("frame-no-label"),
            Self::GridDefault => Some("grid-default"),
            Self::OverlayDefault => Some("overlay-default"),
            Self::PanedHorizontal => Some("paned-horizontal"),
            Self::PanedVertical => Some("paned-vertical"),
            Self::ButtonValignCenterHbox => Some("button-valign-center-hbox"),
            Self::ButtonValignEndHbox => Some("button-valign-end-hbox"),
            Self::ButtonHalignCenterVbox => Some("button-halign-center-vbox"),
            Self::ButtonHalignEndVbox => Some("button-halign-end-vbox"),
            Self::DropdownDefault => Some("dropdown-default"),
            Self::ButtonTextDefault => Some("button-text-default"),
            Self::ButtonTextFlat => Some("button-text-flat"),
            Self::ButtonTextSuggested => Some("button-text-suggested"),
            Self::ButtonTextDestructive => Some("button-text-destructive"),
            Self::ButtonIcon => Some("button-icon"),
            Self::ButtonCircular => Some("button-circular"),
            Self::ButtonContentIconLabel => Some("button-content-icon-label"),
            Self::ButtonContentLabelOnly => Some("button-content-label-only"),
            Self::ButtonContentIconOnly => Some("button-content-icon-only"),
            Self::ButtonPill => Some("button-pill"),
            Self::ButtonDisabled => Some("button-disabled"),
            Self::ButtonRowDefault => Some("button-row-default"),
            Self::ButtonRowStartIcon => Some("button-row-start-icon"),
            Self::ButtonRowDestructive => Some("button-row-destructive"),
            Self::CalendarDefault => Some("calendar-default"),
            Self::CheckButtonDefault => Some("check-button-default"),
            Self::CheckButtonChecked => Some("check-button-checked"),
            Self::CheckButtonIndeterminate => Some("check-button-indeterminate"),
            Self::CheckButtonDisabled => Some("check-button-disabled"),
            Self::CheckButtonCheckedDisabled => Some("check-button-checked-disabled"),
            Self::CheckButtonNoLabel => Some("check-button-no-label"),
            Self::EditableLabelDisplayDefault => Some("editable-label-display-default"),
            Self::EditableLabelDisplayEmpty => Some("editable-label-display-empty"),
            Self::EditableLabelEditingActive => Some("editable-label-editing-active"),
            Self::EditableLabelDisabled => Some("editable-label-disabled"),
            Self::EntryDefault => Some("entry-default"),
            Self::EntryDisabled => Some("entry-disabled"),
            Self::EntryFlat => Some("entry-flat"),
            Self::EntryPlaceholder => Some("entry-placeholder"),
            Self::EntryPrimaryIcon => Some("entry-primary-icon"),
            Self::ImageDefault => Some("image-default"),
            Self::ImageNormalIcons => Some("image-normal-icons"),
            Self::ImageLargeIcons => Some("image-large-icons"),
            Self::ImagePixelSize24 => Some("image-pixel-size-24"),
            Self::ImageNoIconName => Some("image-no-icon-name"),
            Self::LabelDefault => Some("label-default"),
            Self::LabelWrapWord => Some("label-wrap-word"),
            Self::LabelWrapChar => Some("label-wrap-char"),
            Self::LabelEllipsize => Some("label-ellipsize"),
            Self::LabelJustifyCenter => Some("label-justify-center"),
            Self::LabelWidthChars => Some("label-width-chars"),
            Self::LabelXalign => Some("label-xalign"),
            Self::LabelDisabled => Some("label-disabled"),
            Self::ListboxDefault => Some("listbox-default"),
            Self::ListboxSeparators => Some("listbox-separators"),
            Self::LevelbarContinuousDefault => Some("levelbar-continuous-default"),
            Self::LevelbarContinuousLow => Some("levelbar-continuous-low"),
            Self::LevelbarContinuousFull => Some("levelbar-continuous-full"),
            Self::LevelbarContinuousVertical => Some("levelbar-continuous-vertical"),
            Self::LevelbarDiscreteDefault => Some("levelbar-discrete-default"),
            Self::LevelbarDiscreteInverted => Some("levelbar-discrete-inverted"),
            Self::LevelbarDisabled => Some("levelbar-disabled"),
            Self::LinkDefault => Some("link-default"),
            Self::LinkVisited => Some("link-visited"),
            Self::NotebookDefault => Some("notebook-default"),
            Self::MenuButtonTextDefault => Some("menu-button-text-default"),
            Self::MenuButtonIcon => Some("menu-button-icon"),
            Self::MenuButtonFlat => Some("menu-button-flat"),
            Self::MenuButtonCircular => Some("menu-button-circular"),
            Self::MenuButtonDisabled => Some("menu-button-disabled"),
            Self::PopoverDefault => Some("popover-default"),
            Self::PasswordEntryDefault => Some("password-entry-default"),
            Self::PasswordEntryDisabled => Some("password-entry-disabled"),
            Self::PasswordEntryPeekIcon => Some("password-entry-peek-icon"),
            Self::ProgressbarHorizontal50 => Some("progressbar-horizontal-50"),
            Self::ProgressbarHorizontal0 => Some("progressbar-horizontal-0"),
            Self::ProgressbarHorizontal100 => Some("progressbar-horizontal-100"),
            Self::ProgressbarVertical50 => Some("progressbar-vertical-50"),
            Self::ProgressbarInverted50 => Some("progressbar-inverted-50"),
            Self::ProgressbarTextCustom => Some("progressbar-text-custom"),
            Self::ProgressbarOsdHorizontal => Some("progressbar-osd-horizontal"),
            Self::ProgressbarFractionSmall => Some("progressbar-fraction-small"),
            Self::RadioButtonDefault => Some("radio-button-default"),
            Self::RadioButtonChecked => Some("radio-button-checked"),
            Self::ScaleDefault => Some("scale-default"),
            Self::ScrolledWindowDefault => Some("scrolled-window-default"),
            Self::ScrolledWindowFrame => Some("scrolled-window-frame"),
            Self::StackDefault => Some("stack-default"),
            Self::SearchEntryDefault => Some("search-entry-default"),
            Self::SearchEntryDisabled => Some("search-entry-disabled"),
            Self::SearchbarDefault => Some("searchbar-default"),
            Self::SearchbarWithCloseButton => Some("searchbar-with-close-button"),
            Self::ScrollbarDefault => Some("scrollbar-default"),
            Self::SeparatorHorizontalDefault => Some("separator-horizontal-default"),
            Self::SeparatorVertical => Some("separator-vertical"),
            Self::SeparatorSpacerHorizontal => Some("separator-spacer-horizontal"),
            Self::SpinButtonDefault => Some("spin-button-default"),
            Self::SpinButtonVertical => Some("spin-button-vertical"),
            Self::SpinnerDefault => Some("spinner-default"),
            Self::SpinnerSpinning => Some("spinner-spinning"),
            Self::SpinnerSpinningCustomSize => Some("spinner-spinning-custom-size"),
            Self::SpinnerDisabledNotSpinning => Some("spinner-disabled-not-spinning"),
            Self::SpinnerDisabledSpinning => Some("spinner-disabled-spinning"),
            Self::SplitButtonTextDefault => Some("split-button-text-default"),
            Self::SplitButtonIcon => Some("split-button-icon"),
            Self::SplitButtonFlat => Some("split-button-flat"),
            Self::SwitchOffDefault => Some("switch-off-default"),
            Self::SwitchOnDefault => Some("switch-on-default"),
            Self::SwitchOffDisabled => Some("switch-off-disabled"),
            Self::SwitchOnDisabled => Some("switch-on-disabled"),
            Self::TextViewDefault => Some("text-view-default"),
            Self::TextViewDisabled => Some("text-view-disabled"),
            Self::TextViewMonospace => Some("text-view-monospace"),
            Self::TextViewNonEditable => Some("text-view-non-editable"),
            Self::ToggleTextDefault => Some("toggle-text-default"),
            Self::ToggleTextChecked => Some("toggle-text-checked"),
            Self::ToggleTextFlat => Some("toggle-text-flat"),
            Self::ToggleDisabled => Some("toggle-disabled"),
            Self::ToggleGroupTextDefault => Some("toggle-group-text-default"),
            Self::ToggleGroupIcon => Some("toggle-group-icon"),
            Self::ToggleGroupHomogeneous => Some("toggle-group-homogeneous"),
            Self::WindowTitleTextDefault => Some("window-title-text-default"),
            Self::WindowTitleWithSubtitle => Some("window-title-with-subtitle"),
            Self::WindowTitleLongText => Some("window-title-long-text"),
            Self::WindowTitleNoSubtitle => Some("window-title-no-subtitle"),
            Self::WindowTitleBothEmpty => Some("window-title-both-empty"),
        }
    }
}

fn create_widget_for_case(name: &str) -> Option<(gtk::Widget, bool)> {
    match name {
        "actionbar-default" => {
            widget_case!(cases::actionbar_default::ActionbarDefault, false)
        }
        "adw-action-row-default" => {
            widget_case!(cases::adw_action_row_default::AdwActionRowDefault, false)
        }
        "adw-action-row-with-subtitle" => {
            widget_case!(cases::adw_action_row_with_subtitle::AdwActionRowWithSubtitle, false)
        }
        "adw-action-row-activatable" => {
            widget_case!(cases::adw_action_row_activatable::AdwActionRowActivatable, false)
        }
        "adw-breakpoint-bin-default" => {
            widget_case!(cases::adw_breakpoint_bin_default::AdwBreakpointBinDefault, false)
        }
        "adw-combo-row-default" => {
            widget_case!(cases::adw_combo_row_default::AdwComboRowDefault, false)
        }
        "adw-entry-row-default" => {
            widget_case!(cases::adw_entry_row_default::AdwEntryRowDefault, false)
        }
        "adw-entry-row-with-text" => {
            widget_case!(cases::adw_entry_row_with_text::AdwEntryRowWithText, false)
        }
        "adw-expander-row-default" => {
            widget_case!(cases::adw_expander_row_default::AdwExpanderRowDefault, false)
        }
        "adw-expander-row-expanded" => {
            widget_case!(cases::adw_expander_row_expanded::AdwExpanderRowExpanded, false)
        }
        "adw-headerbar-default" => {
            widget_case!(cases::adw_headerbar_default::AdwHeaderbarDefault, false)
        }
        "adw-headerbar-with-title" => {
            widget_case!(cases::adw_headerbar_with_title::AdwHeaderbarWithTitle, false)
        }
        "adw-headerbar-start-end" => {
            widget_case!(cases::adw_headerbar_start_end::AdwHeaderbarStartEnd, false)
        }
        "adw-navigation-view-default" => {
            widget_case!(cases::adw_navigation_view_default::AdwNavigationViewDefault, false)
        }
        "adw-overlay-split-view-default" => {
            widget_case!(cases::adw_overlay_split_view_default::AdwOverlaySplitViewDefault, false)
        }
        "adw-password-entry-row-default" => {
            widget_case!(cases::adw_password_entry_row_default::AdwPasswordEntryRowDefault, false)
        }
        "adw-preferences-group-default" => {
            widget_case!(cases::adw_preferences_group_default::AdwPreferencesGroupDefault, false)
        }
        "adw-preferences-group-with-description" => {
            widget_case!(cases::adw_preferences_group_with_description::AdwPreferencesGroupWithDescription, false)
        }
        "adw-preferences-page-default" => {
            widget_case!(cases::adw_preferences_page_default::AdwPreferencesPageDefault, false)
        }
        "adw-preferences-row-default" => {
            widget_case!(cases::adw_preferences_row_default::AdwPreferencesRowDefault, false)
        }
        "adw-spin-row-default" => {
            widget_case!(cases::adw_spin_row_default::AdwSpinRowDefault, false)
        }
        "adw-switch-row-default" => {
            widget_case!(cases::adw_switch_row_default::AdwSwitchRowDefault, false)
        }
        "adw-switch-row-active" => {
            widget_case!(cases::adw_switch_row_active::AdwSwitchRowActive, false)
        }
        "adw-toolbar-view-default" => {
            widget_case!(cases::adw_toolbar_view_default::AdwToolbarViewDefault, false)
        }
        "adw-toolbar-view-with-bottom" => {
            widget_case!(cases::adw_toolbar_view_with_bottom::AdwToolbarViewWithBottom, false)
        }
        "adw-view-switcher-default" => {
            widget_case!(cases::adw_view_switcher_default::AdwViewSwitcherDefault, false)
        }
        "avatar-default" => widget_case!(cases::avatar_default::AvatarDefault, false),
        "avatar-initials" => widget_case!(cases::avatar_initials::AvatarInitials, false),
        "avatar-small" => widget_case!(cases::avatar_small::AvatarSmall, false),
        "banner-revealed" => widget_case!(cases::banner_revealed::BannerRevealed, false),
        "banner-with-button" => {
            widget_case!(cases::banner_with_button::BannerWithButton, false)
        }
        "carousel-default" => widget_case!(cases::carousel_default::CarouselDefault, false),
        "clamp-default" => widget_case!(cases::clamp_default::ClampDefault, false),
        "status-page-default" => {
            widget_case!(cases::status_page_default::StatusPageDefault, false)
        }
        "status-page-no-icon" => {
            widget_case!(cases::status_page_no_icon::StatusPageNoIcon, false)
        }
        "toast-overlay-default" => {
            widget_case!(cases::toast_overlay_default::ToastOverlayDefault, false)
        }
        "box-horizontal-default" => {
            widget_case!(cases::box_horizontal_default::BoxHorizontalDefault, false)
        }
        "box-vertical-default" => {
            widget_case!(cases::box_vertical_default::BoxVerticalDefault, false)
        }
        "box-spacing" => widget_case!(cases::box_spacing::BoxSpacing, false),
        "box-homogeneous" => widget_case!(cases::box_homogeneous::BoxHomogeneous, false),
        "box-hexpand" => widget_case!(cases::box_hexpand::BoxHexpand, false),
        "center-box-default" => widget_case!(cases::center_box_default::CenterBoxDefault, false),
        "dropdown-default" => widget_case!(cases::dropdown_default::DropdownDefault, true),
        "expander-default" => widget_case!(cases::expander_default::ExpanderDefault, false),
        "expander-expanded" => widget_case!(cases::expander_expanded::ExpanderExpanded, false),
        "flow-box-default" => widget_case!(cases::flow_box_default::FlowBoxDefault, false),
        "frame-default" => widget_case!(cases::frame_default::FrameDefault, false),
        "headerbar-default" => {
            widget_case!(cases::headerbar_default::HeaderbarDefault, false)
        }
        "headerbar-start-end" => {
            widget_case!(cases::headerbar_start_end::HeaderbarStartEnd, false)
        }
        "headerbar-with-title" => {
            widget_case!(cases::headerbar_with_title::HeaderbarWithTitle, false)
        }
        "frame-no-label" => widget_case!(cases::frame_no_label::FrameNoLabel, false),
        "grid-default" => widget_case!(cases::grid_default::GridDefault, false),
        "listbox-default" => widget_case!(cases::listbox_default::ListboxDefault, false),
        "listbox-separators" => widget_case!(cases::listbox_separators::ListboxSeparators, false),
        "notebook-default" => widget_case!(cases::notebook_default::NotebookDefault, false),
        "overlay-default" => widget_case!(cases::overlay_default::OverlayDefault, false),
        "paned-horizontal" => widget_case!(cases::paned_horizontal::PanedHorizontal, false),
        "paned-vertical" => widget_case!(cases::paned_vertical::PanedVertical, false),
        "popover-default" => widget_case!(cases::popover_default::PopoverDefault, false),
        "button-valign-center-hbox" => {
            widget_case!(
                cases::button_valign_center_hbox::ButtonValignCenterHbox,
                true
            )
        }
        "button-valign-end-hbox" => {
            widget_case!(cases::button_valign_end_hbox::ButtonValignEndHbox, true)
        }
        "button-halign-center-vbox" => {
            widget_case!(
                cases::button_halign_center_vbox::ButtonHalignCenterVbox,
                true
            )
        }
        "button-halign-end-vbox" => {
            widget_case!(cases::button_halign_end_vbox::ButtonHalignEndVbox, true)
        }
        "button-text-default" => widget_case!(cases::button_text_default::ButtonTextDefault, false),
        "button-text-flat" => widget_case!(cases::button_text_flat::ButtonTextFlat, false),
        "button-text-suggested" => {
            widget_case!(cases::button_text_suggested::ButtonTextSuggested, false)
        }
        "button-text-destructive" => {
            widget_case!(cases::button_text_destructive::ButtonTextDestructive, false)
        }
        "button-icon" => widget_case!(cases::button_icon::ButtonIcon, false),
        "button-circular" => widget_case!(cases::button_circular::ButtonCircular, false),
        "button-content-icon-label" => {
            widget_case!(cases::button_content_icon_label::ButtonContentIconLabel, false)
        }
        "button-content-label-only" => {
            widget_case!(cases::button_content_label_only::ButtonContentLabelOnly, false)
        }
        "button-content-icon-only" => {
            widget_case!(cases::button_content_icon_only::ButtonContentIconOnly, false)
        }
        "button-pill" => widget_case!(cases::button_pill::ButtonPill, false),
        "button-disabled" => widget_case!(cases::button_disabled::ButtonDisabled, false),
        "button-row-default" => {
            widget_case!(cases::button_row_default::ButtonRowDefault, true)
        }
        "button-row-start-icon" => {
            widget_case!(cases::button_row_start_icon::ButtonRowStartIcon, true)
        }
        "button-row-destructive" => {
            widget_case!(cases::button_row_destructive::ButtonRowDestructive, true)
        }
        "calendar-default" => widget_case!(cases::calendar_default::CalendarDefault, false),
        "check-button-default" => {
            widget_case!(cases::check_button_default::CheckButtonDefault, false)
        }
        "check-button-checked" => {
            widget_case!(cases::check_button_checked::CheckButtonChecked, false)
        }
        "check-button-indeterminate" => {
            widget_case!(
                cases::check_button_indeterminate::CheckButtonIndeterminate,
                false
            )
        }
        "check-button-disabled" => {
            widget_case!(cases::check_button_disabled::CheckButtonDisabled, false)
        }
        "check-button-checked-disabled" => {
            widget_case!(
                cases::check_button_checked_disabled::CheckButtonCheckedDisabled,
                false
            )
        }
        "check-button-no-label" => {
            widget_case!(cases::check_button_no_label::CheckButtonNoLabel, false)
        }
        "editable-label-display-default" => {
            widget_case!(
                cases::editable_label_display_default::EditableLabelDisplayDefault,
                false
            )
        }
        "editable-label-display-empty" => {
            widget_case!(
                cases::editable_label_display_empty::EditableLabelDisplayEmpty,
                false
            )
        }
        "editable-label-editing-active" => {
            widget_case!(
                cases::editable_label_editing_active::EditableLabelEditingActive,
                false
            )
        }
        "editable-label-disabled" => {
            widget_case!(cases::editable_label_disabled::EditableLabelDisabled, false)
        }
        "entry-default" => widget_case!(cases::entry_default::EntryDefault, false),
        "entry-disabled" => widget_case!(cases::entry_disabled::EntryDisabled, false),
        "entry-flat" => widget_case!(cases::entry_flat::EntryFlat, false),
        "entry-placeholder" => widget_case!(cases::entry_placeholder::EntryPlaceholder, false),
        "entry-primary-icon" => widget_case!(cases::entry_primary_icon::EntryPrimaryIcon, false),
        "image-default" => widget_case!(cases::image_default::ImageDefault, false),
        "image-normal-icons" => widget_case!(cases::image_normal_icons::ImageNormalIcons, false),
        "image-large-icons" => widget_case!(cases::image_large_icons::ImageLargeIcons, false),
        "image-pixel-size-24" => widget_case!(cases::image_pixel_size_24::ImagePixelSize24, false),
        "image-no-icon-name" => widget_case!(cases::image_no_icon_name::ImageNoIconName, false),
        "label-default" => widget_case!(cases::label_default::LabelDefault, false),
        "label-wrap-word" => widget_case!(cases::label_wrap_word::LabelWrapWord, false),
        "label-wrap-char" => widget_case!(cases::label_wrap_char::LabelWrapChar, false),
        "label-ellipsize" => widget_case!(cases::label_ellipsize::LabelEllipsize, false),
        "label-justify-center" => {
            widget_case!(cases::label_justify_center::LabelJustifyCenter, false)
        }
        "label-width-chars" => widget_case!(cases::label_width_chars::LabelWidthChars, false),
        "label-xalign" => widget_case!(cases::label_xalign::LabelXalign, false),
        "label-disabled" => widget_case!(cases::label_disabled::LabelDisabled, false),
        "levelbar-continuous-default" => {
            widget_case!(
                cases::levelbar_continuous_default::LevelbarContinuousDefault,
                false
            )
        }
        "levelbar-continuous-low" => {
            widget_case!(cases::levelbar_continuous_low::LevelbarContinuousLow, false)
        }
        "levelbar-continuous-full" => {
            widget_case!(
                cases::levelbar_continuous_full::LevelbarContinuousFull,
                false
            )
        }
        "levelbar-continuous-vertical" => {
            widget_case!(
                cases::levelbar_continuous_vertical::LevelbarContinuousVertical,
                false
            )
        }
        "levelbar-discrete-default" => {
            widget_case!(
                cases::levelbar_discrete_default::LevelbarDiscreteDefault,
                false
            )
        }
        "levelbar-discrete-inverted" => {
            widget_case!(
                cases::levelbar_discrete_inverted::LevelbarDiscreteInverted,
                false
            )
        }
        "levelbar-disabled" => widget_case!(cases::levelbar_disabled::LevelbarDisabled, false),
        "link-default" => widget_case!(cases::link_default::LinkDefault, false),
        "link-visited" => widget_case!(cases::link_visited::LinkVisited, false),
        "menu-button-text-default" => {
            widget_case!(cases::menu_button_text_default::MenuButtonTextDefault, true)
        }
        "menu-button-icon" => widget_case!(cases::menu_button_icon::MenuButtonIcon, true),
        "menu-button-flat" => widget_case!(cases::menu_button_flat::MenuButtonFlat, true),
        "menu-button-circular" => {
            widget_case!(cases::menu_button_circular::MenuButtonCircular, true)
        }
        "menu-button-disabled" => {
            widget_case!(cases::menu_button_disabled::MenuButtonDisabled, true)
        }
        "password-entry-default" => {
            widget_case!(cases::password_entry_default::PasswordEntryDefault, false)
        }
        "password-entry-disabled" => {
            widget_case!(cases::password_entry_disabled::PasswordEntryDisabled, false)
        }
        "password-entry-peek-icon" => {
            widget_case!(
                cases::password_entry_peek_icon::PasswordEntryPeekIcon,
                false
            )
        }
        "progressbar-horizontal-50" => {
            widget_case!(
                cases::progressbar_horizontal_50::ProgressbarHorizontal50,
                false
            )
        }
        "progressbar-horizontal-0" => {
            widget_case!(
                cases::progressbar_horizontal_0::ProgressbarHorizontal0,
                false
            )
        }
        "progressbar-horizontal-100" => {
            widget_case!(
                cases::progressbar_horizontal_100::ProgressbarHorizontal100,
                false
            )
        }
        "progressbar-vertical-50" => {
            widget_case!(cases::progressbar_vertical_50::ProgressbarVertical50, false)
        }
        "progressbar-inverted-50" => {
            widget_case!(cases::progressbar_inverted_50::ProgressbarInverted50, false)
        }
        "progressbar-text-custom" => {
            widget_case!(cases::progressbar_text_custom::ProgressbarTextCustom, false)
        }
        "progressbar-osd-horizontal" => {
            widget_case!(
                cases::progressbar_osd_horizontal::ProgressbarOsdHorizontal,
                false
            )
        }
        "progressbar-fraction-small" => {
            widget_case!(
                cases::progressbar_fraction_small::ProgressbarFractionSmall,
                false
            )
        }
        "radio-button-default" => {
            widget_case!(cases::radio_button_default::RadioButtonDefault, false)
        }
        "radio-button-checked" => {
            widget_case!(cases::radio_button_checked::RadioButtonChecked, false)
        }
        "scale-default" => widget_case!(cases::scale_default::ScaleDefault, false),
        "scrolled-window-default" => {
            widget_case!(cases::scrolled_window_default::ScrolledWindowDefault, false)
        }
        "scrolled-window-frame" => {
            widget_case!(cases::scrolled_window_frame::ScrolledWindowFrame, false)
        }
        "stack-default" => widget_case!(cases::stack_default::StackDefault, false),
        "search-entry-default" => {
            widget_case!(cases::search_entry_default::SearchEntryDefault, false)
        }
        "search-entry-disabled" => {
            widget_case!(cases::search_entry_disabled::SearchEntryDisabled, false)
        }
        "searchbar-default" => {
            widget_case!(cases::searchbar_default::SearchbarDefault, false)
        }
        "searchbar-with-close-button" => {
            widget_case!(
                cases::searchbar_with_close_button::SearchbarWithCloseButton,
                false
            )
        }
        "scrollbar-default" => widget_case!(cases::scrollbar_default::ScrollbarDefault, false),
        "separator-horizontal-default" => {
            widget_case!(
                cases::separator_horizontal_default::SeparatorHorizontalDefault,
                false
            )
        }
        "separator-vertical" => widget_case!(cases::separator_vertical::SeparatorVertical, false),
        "separator-spacer-horizontal" => {
            widget_case!(
                cases::separator_spacer_horizontal::SeparatorSpacerHorizontal,
                false
            )
        }
        "spin-button-default" => {
            widget_case!(cases::spin_button_default::SpinButtonDefault, false)
        }
        "spin-button-vertical" => {
            widget_case!(cases::spin_button_vertical::SpinButtonVertical, false)
        }
        "spinner-default" => widget_case!(cases::spinner_default::SpinnerDefault, false),
        "spinner-spinning" => widget_case!(cases::spinner_spinning::SpinnerSpinning, false),
        "spinner-spinning-custom-size" => {
            widget_case!(
                cases::spinner_spinning_custom_size::SpinnerSpinningCustomSize,
                false
            )
        }
        "spinner-disabled-not-spinning" => {
            widget_case!(
                cases::spinner_disabled_not_spinning::SpinnerDisabledNotSpinning,
                false
            )
        }
        "spinner-disabled-spinning" => {
            widget_case!(
                cases::spinner_disabled_spinning::SpinnerDisabledSpinning,
                false
            )
        }
        "split-button-text-default" => {
            widget_case!(cases::split_button_text_default::SplitButtonTextDefault, false)
        }
        "split-button-icon" => {
            widget_case!(cases::split_button_icon::SplitButtonIcon, false)
        }
        "split-button-flat" => {
            widget_case!(cases::split_button_flat::SplitButtonFlat, false)
        }
        "switch-off-default" => widget_case!(cases::switch_off_default::SwitchOffDefault, false),
        "switch-on-default" => widget_case!(cases::switch_on_default::SwitchOnDefault, false),
        "switch-off-disabled" => widget_case!(cases::switch_off_disabled::SwitchOffDisabled, false),
        "switch-on-disabled" => widget_case!(cases::switch_on_disabled::SwitchOnDisabled, false),
        "text-view-default" => widget_case!(cases::text_view_default::TextViewDefault, false),
        "text-view-disabled" => widget_case!(cases::text_view_disabled::TextViewDisabled, false),
        "text-view-monospace" => widget_case!(cases::text_view_monospace::TextViewMonospace, false),
        "text-view-non-editable" => {
            widget_case!(cases::text_view_non_editable::TextViewNonEditable, false)
        }
        "toggle-text-default" => widget_case!(cases::toggle_text_default::ToggleTextDefault, false),
        "toggle-text-checked" => widget_case!(cases::toggle_text_checked::ToggleTextChecked, false),
        "toggle-text-flat" => widget_case!(cases::toggle_text_flat::ToggleTextFlat, false),
        "toggle-disabled" => widget_case!(cases::toggle_disabled::ToggleDisabled, false),
        "toggle-group-text-default" => {
            widget_case!(cases::toggle_group_text_default::ToggleGroupTextDefault, false)
        }
        "toggle-group-icon" => {
            widget_case!(cases::toggle_group_icon::ToggleGroupIcon, false)
        }
        "toggle-group-homogeneous" => {
            widget_case!(cases::toggle_group_homogeneous::ToggleGroupHomogeneous, false)
        }
        "window-title-text-default" => {
            widget_case!(
                cases::window_title_text_default::WindowTitleTextDefault,
                false
            )
        }
        "window-title-with-subtitle" => {
            widget_case!(
                cases::window_title_with_subtitle::WindowTitleWithSubtitle,
                false
            )
        }
        "window-title-long-text" => {
            widget_case!(cases::window_title_long_text::WindowTitleLongText, false)
        }
        "window-title-no-subtitle" => {
            widget_case!(
                cases::window_title_no_subtitle::WindowTitleNoSubtitle,
                false
            )
        }
        "window-title-both-empty" => {
            widget_case!(cases::window_title_both_empty::WindowTitleBothEmpty, false)
        }
        _ => None,
    }
}

fn is_known_case(name: &str) -> bool {
    matches!(
        name,
        "actionbar-default"
            | "adw-action-row-default"
            | "adw-action-row-with-subtitle"
            | "adw-action-row-activatable"
            | "adw-breakpoint-bin-default"
            | "adw-combo-row-default"
            | "adw-entry-row-default"
            | "adw-entry-row-with-text"
            | "adw-expander-row-default"
            | "adw-expander-row-expanded"
            | "adw-headerbar-default"
            | "adw-headerbar-with-title"
            | "adw-headerbar-start-end"
            | "adw-navigation-view-default"
            | "adw-overlay-split-view-default"
            | "adw-password-entry-row-default"
            | "adw-preferences-group-default"
            | "adw-preferences-group-with-description"
            | "adw-preferences-page-default"
            | "adw-preferences-row-default"
            | "adw-spin-row-default"
            | "adw-switch-row-default"
            | "adw-switch-row-active"
            | "adw-toolbar-view-default"
            | "adw-toolbar-view-with-bottom"
            | "adw-view-switcher-default"
            | "avatar-default"
            | "avatar-initials"
            | "avatar-small"
            | "banner-revealed"
            | "banner-with-button"
            | "carousel-default"
            | "clamp-default"
            | "status-page-default"
            | "status-page-no-icon"
            | "toast-overlay-default"
            | "box-horizontal-default"
            | "box-vertical-default"
            | "box-spacing"
            | "box-homogeneous"
            | "box-hexpand"
            | "center-box-default"
            | "dropdown-default"
            | "expander-default"
            | "expander-expanded"
            | "flow-box-default"
            | "frame-default"
            | "frame-no-label"
            | "headerbar-default"
            | "headerbar-start-end"
            | "headerbar-with-title"
            | "grid-default"
            | "listbox-default"
            | "listbox-separators"
            | "notebook-default"
            | "overlay-default"
            | "paned-horizontal"
            | "paned-vertical"
            | "popover-default"
            | "button-valign-center-hbox"
            | "button-valign-end-hbox"
            | "button-halign-center-vbox"
            | "button-halign-end-vbox"
            | "button-text-default"
            | "button-text-flat"
            | "button-text-suggested"
            | "button-text-destructive"
            | "button-icon"
            | "button-circular"
            | "button-content-icon-label"
            | "button-content-label-only"
            | "button-content-icon-only"
            | "button-pill"
            | "button-disabled"
            | "button-row-default"
            | "button-row-start-icon"
            | "button-row-destructive"
            | "calendar-default"
            | "check-button-default"
            | "check-button-checked"
            | "check-button-indeterminate"
            | "check-button-disabled"
            | "check-button-checked-disabled"
            | "check-button-no-label"
            | "editable-label-display-default"
            | "editable-label-display-empty"
            | "editable-label-editing-active"
            | "editable-label-disabled"
            | "entry-default"
            | "entry-disabled"
            | "entry-flat"
            | "entry-placeholder"
            | "entry-primary-icon"
            | "image-default"
            | "image-normal-icons"
            | "image-large-icons"
            | "image-pixel-size-24"
            | "image-no-icon-name"
            | "label-default"
            | "label-wrap-word"
            | "label-wrap-char"
            | "label-ellipsize"
            | "label-justify-center"
            | "label-width-chars"
            | "label-xalign"
            | "label-disabled"
            | "levelbar-continuous-default"
            | "levelbar-continuous-low"
            | "levelbar-continuous-full"
            | "levelbar-continuous-vertical"
            | "levelbar-discrete-default"
            | "levelbar-discrete-inverted"
            | "levelbar-disabled"
            | "link-default"
            | "link-visited"
            | "menu-button-text-default"
            | "menu-button-icon"
            | "menu-button-flat"
            | "menu-button-circular"
            | "menu-button-disabled"
            | "password-entry-default"
            | "password-entry-disabled"
            | "password-entry-peek-icon"
            | "progressbar-horizontal-50"
            | "progressbar-horizontal-0"
            | "progressbar-horizontal-100"
            | "progressbar-vertical-50"
            | "progressbar-inverted-50"
            | "progressbar-text-custom"
            | "progressbar-osd-horizontal"
            | "progressbar-fraction-small"
            | "radio-button-default"
            | "radio-button-checked"
            | "scale-default"
            | "scrolled-window-default"
            | "scrolled-window-frame"
            | "stack-default"
            | "search-entry-default"
            | "search-entry-disabled"
            | "searchbar-default"
            | "searchbar-with-close-button"
            | "scrollbar-default"
            | "separator-horizontal-default"
            | "separator-vertical"
            | "separator-spacer-horizontal"
            | "spin-button-default"
            | "spin-button-vertical"
            | "spinner-default"
            | "spinner-spinning"
            | "spinner-spinning-custom-size"
            | "spinner-disabled-not-spinning"
            | "spinner-disabled-spinning"
            | "split-button-text-default"
            | "split-button-icon"
            | "split-button-flat"
            | "switch-off-default"
            | "switch-on-default"
            | "switch-off-disabled"
            | "switch-on-disabled"
            | "text-view-default"
            | "text-view-disabled"
            | "text-view-monospace"
            | "text-view-non-editable"
            | "toggle-text-default"
            | "toggle-text-checked"
            | "toggle-text-flat"
            | "toggle-disabled"
            | "toggle-group-text-default"
            | "toggle-group-icon"
            | "toggle-group-homogeneous"
            | "window-title-text-default"
            | "window-title-with-subtitle"
            | "window-title-long-text"
            | "window-title-no-subtitle"
            | "window-title-both-empty"
    )
}

fn configure_environment() {
    unsafe {
        std::env::set_var("GDK_SCALE", "1");
        // Snapshots are read from render nodes, so no GPU renderer is needed,
        // and the GL/Vulkan setup each new window does can stall on a headless
        // X server. Accessibility isn't used either, and registering every
        // window with an unreachable AT-SPI bus blocks on D-Bus timeouts.
        // Both can still be overridden from the environment.
        if std::env::var_os("GSK_RENDERER").is_none() {
            std::env::set_var("GSK_RENDERER", "cairo");
        }
        if std::env::var_os("GTK_A11Y").is_none() {
            std::env::set_var("GTK_A11Y", "none");
        }
    }
}

fn configure_rendering() {
    let settings = gtk::Settings::default().expect("Failed to get GtkSettings");
    settings.set_gtk_font_name(Some("Cantarell 11"));

    let style_manager = adw::StyleManager::default();
    style_manager.set_color_scheme(adw::ColorScheme::ForceLight);
}

fn render_snapshot_json(widget: &gtk::Widget, use_inner: bool) -> Result<String, String> {
    let target = if use_inner {
        widget
            .first_child()
            .ok_or_else(|| "render_and_extract_inner: widget has no first child".to_string())?
    } else {
        widget.clone()
    };

    let target_width = target.width();
    let target_height = target.height();

    if target_width <= 0 || target_height <= 0 {
        let label = if use_inner { "Inner widget" } else { "Widget" };
        return Err(format!(
            "{label} has zero size, layout may not have completed"
        ));
    }

    let result = extract::extract_widget_tree(&target);

    serde_json::to_string_pretty(&result).map_err(|err| err.to_string())
}

fn render_widget(
    app: Option<&adw::Application>,
    widget: gtk::Widget,
    use_inner: bool,
    on_complete: impl FnOnce(Result<String, String>) + 'static,
) {
    let window = adw::Window::builder()
        .decorated(false)
        .default_width(200)
        .default_height(100)
        .build();
    if let Some(app) = app {
        window.set_application(Some(app));
    }

    window.set_content(Some(&widget));
    window.present();

    gtk::glib::idle_add_local_once(move || {
        let result = render_snapshot_json(&widget, use_inner);
        on_complete(result);
        window.close();
    });
}

fn run_single_snapshot(case_name: &'static str, output: Option<PathBuf>) {
    configure_environment();
    let app = adw::Application::builder()
        .application_id("org.gtkjs.test")
        .build();

    app.connect_activate(move |app| {
        configure_rendering();

        let Some((widget, use_inner)) = create_widget_for_case(case_name) else {
            eprintln!("Unknown case: {case_name}");
            app.quit();
            return;
        };

        let output = output.clone();
        let app = app.clone();
        let quit_app = app.clone();
        render_widget(Some(app.as_ref()), widget, use_inner, move |result| {
            match result {
                Ok(json) => {
                    if let Some(ref path) = output {
                        if let Err(err) = std::fs::write(path, &json) {
                            eprintln!("Failed to write output file: {err}");
                        }
                    } else {
                        println!("{json}");
                    }
                }
                Err(err) => eprintln!("{err}"),
            }

            quit_app.quit();
        });
    });

    app.run_with_args::<&str>(&[]);
}

fn handle_snapshot_request(request: NativeRequest) {
    debug_log(format!("received request for {}", request.case_name));
    let Some((widget, use_inner)) = create_widget_for_case(&request.case_name) else {
        let _ = request
            .response
            .send(Err(format!("Unknown case: {}", request.case_name)));
        return;
    };

    render_widget(None, widget, use_inner, move |result| {
        debug_log("completed request");
        let _ = request.response.send(result);
    });
}

async fn snapshot_handler(
    Path(case_name): Path<String>,
    State(state): State<ServerState>,
) -> Result<String, (StatusCode, String)> {
    if !state.ready.load(Ordering::Relaxed) {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "GTK server is not ready yet".to_string(),
        ));
    }

    if !is_known_case(&case_name) {
        return Err((StatusCode::NOT_FOUND, format!("Unknown case: {case_name}")));
    }

    let (response_tx, response_rx) = mpsc::sync_channel(1);
    state
        .sender
        .send(NativeRequest {
            case_name,
            response: response_tx,
        })
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "GTK request channel closed".to_string(),
            )
        })?;

    let response = tokio::task::spawn_blocking(move || response_rx.recv());
    tokio::time::timeout(Duration::from_secs(10), response)
        .await
        .map_err(|_| {
            (
                StatusCode::GATEWAY_TIMEOUT,
                "GTK render timed out".to_string(),
            )
        })?
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "GTK response channel closed".to_string(),
            )
        })?
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err))
}

async fn ready_handler(State(state): State<ServerState>) -> Result<&'static str, StatusCode> {
    if state.ready.load(Ordering::Relaxed) {
        Ok("ok")
    } else {
        Err(StatusCode::SERVICE_UNAVAILABLE)
    }
}

fn run_server(port_file: Option<PathBuf>) {
    configure_environment();
    gtk::init().expect("Failed to initialize GTK");
    adw::init().expect("Failed to initialize libadwaita");
    configure_rendering();

    let (sender, receiver) = mpsc::channel::<NativeRequest>();
    let receiver = Arc::new(Mutex::new(receiver));
    let ready = Arc::new(AtomicBool::new(true));
    let main_loop = gtk::glib::MainLoop::new(None, false);

    let receiver_for_loop = Arc::clone(&receiver);
    gtk::glib::timeout_add_local(Duration::from_millis(1), move || {
        loop {
            let request = match receiver_for_loop
                .lock()
                .expect("receiver poisoned")
                .try_recv()
            {
                Ok(request) => request,
                Err(mpsc::TryRecvError::Empty) => break,
                Err(mpsc::TryRecvError::Disconnected) => return gtk::glib::ControlFlow::Break,
            };

            handle_snapshot_request(request);
        }

        gtk::glib::ControlFlow::Continue
    });
    debug_log("gtk request loop ready");

    thread::spawn(move || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to build tokio runtime");

        runtime.block_on(async move {
            let listener = std::net::TcpListener::bind("127.0.0.1:0")
                .expect("Failed to bind native HTTP server");
            listener
                .set_nonblocking(true)
                .expect("Failed to make listener nonblocking");
            let port = listener
                .local_addr()
                .expect("Failed to get native server address")
                .port();

            let listener = tokio::net::TcpListener::from_std(listener)
                .expect("Failed to create tokio listener");
            let state = ServerState { sender, ready };
            let router = Router::new()
                .route("/ready", get(ready_handler))
                .route("/{case}", get(snapshot_handler))
                .with_state(state);
            debug_log(format!("http server listening on 127.0.0.1:{port}"));
            if let Some(path) = port_file {
                std::fs::write(&path, format!("{port}\n")).expect("Failed to write port file");
            }
            println!("LISTENING:{port}");
            std::io::stdout().flush().expect("Failed to flush stdout");

            axum::serve(listener, router)
                .await
                .expect("Native HTTP server failed");
        });
    });

    main_loop.run();
}

fn main() {
    let cli = Cli::parse();
    let output = cli.output;

    match cli.command {
        Command::Serve { port_file } => run_server(port_file),
        command => run_single_snapshot(command.case_name().expect("case command"), output),
    }
}
