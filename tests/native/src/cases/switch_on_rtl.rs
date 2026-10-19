use gtk::prelude::*;
use relm4::prelude::*;

pub struct SwitchOnRtl;

#[relm4::component(pub)]
impl SimpleComponent for SwitchOnRtl {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Switch {
            set_direction: gtk::TextDirection::Rtl,
            set_halign: gtk::Align::Center,
            set_valign: gtk::Align::Center,
            set_active: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
