use gtk::prelude::*;
use relm4::prelude::*;

pub struct HeaderbarTallControls;

#[relm4::component(pub)]
impl SimpleComponent for HeaderbarTallControls {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::HeaderBar {
            add_css_class: "tall-controls-case",
            set_valign: gtk::Align::Start,
            set_decoration_layout: Some(":close"),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        // Taller than its buttons, as in a theme whose buttons are shorter
        // than the bar (the class keeps the rule to this case).
        let provider = gtk::CssProvider::new();
        provider.load_from_string("headerbar.tall-controls-case { min-height: 72px; }");
        gtk::style_context_add_provider_for_display(
            &root.display(),
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
        ComponentParts { model, widgets }
    }
}
