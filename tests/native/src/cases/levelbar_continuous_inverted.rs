use gtk::prelude::*;
use relm4::prelude::*;

/// Inverted: the filled block is the value, drawn from the end.
pub struct LevelbarContinuousInverted;

#[relm4::component(pub)]
impl SimpleComponent for LevelbarContinuousInverted {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::LevelBar {
            set_value: 0.3,
            set_inverted: true,
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
