use gtk::prelude::*;
use relm4::prelude::*;

/// The extra space goes to the expanding children, equally: a box expands
/// when something in it does.
pub struct BoxHexpand;

#[relm4::component(pub)]
impl SimpleComponent for BoxHexpand {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_halign: gtk::Align::Start,
            set_width_request: 300,
            gtk::Box {
                set_orientation: gtk::Orientation::Vertical,
                gtk::Label { set_label: "Same", set_hexpand: true },
            },
            gtk::Label { set_label: "Same", set_hexpand: true },
            gtk::Label { set_label: "End" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
