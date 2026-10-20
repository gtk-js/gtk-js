use gtk::prelude::*;
use relm4::prelude::*;

pub struct BoxDisabled;

#[relm4::component(pub)]
impl SimpleComponent for BoxDisabled {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Horizontal,
            set_spacing: 6,
            set_sensitive: false,
            gtk::Label { set_label: "Label" },
            gtk::Button { set_label: "Button" },
            gtk::Switch {},
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
