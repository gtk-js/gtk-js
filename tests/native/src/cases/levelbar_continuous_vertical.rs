use gtk::prelude::*;
use relm4::prelude::*;

pub struct LevelbarContinuousVertical;

#[relm4::component(pub)]
impl SimpleComponent for LevelbarContinuousVertical {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::LevelBar {
            set_value: 0.4,
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
