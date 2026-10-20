use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct ClampChildMin;

#[relm4::component(pub)]
impl SimpleComponent for ClampChildMin {
    type Init = ();
    type Input = ();
    type Output = ();

    // The child needs more than the maximum size, and the leftover space
    // (801 - 462) is odd.
    view! {
        adw::Clamp {
            set_size_request: (801, -1),
            set_maximum_size: 300,

            gtk::Box {
                set_size_request: (462, 20),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
