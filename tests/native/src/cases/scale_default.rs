use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScaleDefault;

#[relm4::component(pub)]
impl SimpleComponent for ScaleDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Scale::new(
            gtk::Orientation::Horizontal,
            Some(&gtk::Adjustment::new(50.0, 0.0, 100.0, 1.0, 10.0, 0.0))
        ) {
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
