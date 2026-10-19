use gtk::prelude::*;
use relm4::prelude::*;

/// A theme with a smaller slider and a smaller switch min-width, like Fluent's
/// (_common-4.0.scss): GtkSwitch's layout still makes it twice the slider's width.
pub struct SwitchOnSmallSlider;

#[relm4::component(pub)]
impl SimpleComponent for SwitchOnSmallSlider {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Switch {
            add_css_class: "small-slider",
            set_halign: gtk::Align::Center,
            set_valign: gtk::Align::Center,
            set_active: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let provider = gtk::CssProvider::new();
        provider.load_from_string(
            "switch.small-slider { min-width: 22px; padding: 0; }
             switch.small-slider > slider { min-width: 12px; min-height: 12px; margin: 5px; }",
        );
        gtk::style_context_add_provider_for_display(
            &root.display(),
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
