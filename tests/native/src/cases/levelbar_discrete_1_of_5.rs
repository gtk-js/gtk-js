use gtk::prelude::*;
use relm4::prelude::*;

/// 1 of 5 is at the "full" offset (1.0): offsets aren't scaled by the maximum.
pub struct LevelbarDiscrete1Of5;

#[relm4::component(pub)]
impl SimpleComponent for LevelbarDiscrete1Of5 {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::LevelBar {
            set_mode: gtk::LevelBarMode::Discrete,
            set_max_value: 5.0,
            set_value: 1.0,
            set_width_request: 200,
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
