use gtk::prelude::*;
use relm4::prelude::*;

pub struct ProgressbarVertical50;

#[relm4::component(pub)]
impl SimpleComponent for ProgressbarVertical50 {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ProgressBar {
            set_fraction: 0.5,
            set_orientation: gtk::Orientation::Vertical,
            set_height_request: 200,
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
