use gtk::prelude::*;
use relm4::prelude::*;

pub struct SpinButtonDefault;

#[relm4::component(pub)]
impl SimpleComponent for SpinButtonDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::SpinButton::with_range(0.0, 100.0, 1.0) {
            set_value: 50.0,
            // Its natural size, not the window's.
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
