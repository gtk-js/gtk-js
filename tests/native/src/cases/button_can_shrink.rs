use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ButtonCanShrink;

#[relm4::component(pub)]
impl SimpleComponent for ButtonCanShrink {
    type Init = ();
    type Input = ();
    type Output = ();

    // A button narrower than its label: with can-shrink the label ellipsizes.
    view! {
        adw::Clamp {
            set_maximum_size: 120,
            set_tightening_threshold: 120,

            gtk::Button {
                set_label: "A very long button label here",
                set_can_shrink: true,
                set_valign: gtk::Align::Start,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
