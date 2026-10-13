use gtk::prelude::*;
use relm4::prelude::*;

/// A box's spacing adds to the theme's border-spacing (`.toolbar` sets 6px).
pub struct BoxSpacingToolbar;

#[relm4::component(pub)]
impl SimpleComponent for BoxSpacingToolbar {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Horizontal,
            set_spacing: 6,
            set_halign: gtk::Align::Start,
            add_css_class: "toolbar",
            gtk::Label { set_label: "One" },
            gtk::Label { set_label: "Two" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
