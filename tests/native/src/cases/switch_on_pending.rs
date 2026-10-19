use gtk::prelude::*;
use relm4::prelude::*;

/// A delayed state change: the switch is on (`active`), its backend isn't yet (`state`).
pub struct SwitchOnPending;

#[relm4::component(pub)]
impl SimpleComponent for SwitchOnPending {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Switch {
            set_halign: gtk::Align::Center,
            set_valign: gtk::Align::Center,
            set_active: true,
            set_state: false,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
