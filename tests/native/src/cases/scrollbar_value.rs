use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScrollbarValue;

#[relm4::component(pub)]
impl SimpleComponent for ScrollbarValue {
    type Init = ();
    type Input = ();
    type Output = ();

    // gtk-js's value is the scroll position from 0 to 1: 0.3 is 0.21 of an
    // adjustment from 0 to 1 with a 0.3 page.
    view! {
        gtk::Scrollbar::new(
            gtk::Orientation::Vertical,
            Some(&gtk::Adjustment::new(0.21, 0.0, 1.0, 0.01, 0.1, 0.3))
        ) {
            set_height_request: 150,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
