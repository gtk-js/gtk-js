use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScaleDrawValue;

#[relm4::component(pub)]
impl SimpleComponent for ScaleDrawValue {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Scale::new(
            gtk::Orientation::Horizontal,
            Some(&gtk::Adjustment::new(25.0, 0.0, 100.0, 1.0, 10.0, 0.0))
        ) {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 250,
            set_draw_value: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
