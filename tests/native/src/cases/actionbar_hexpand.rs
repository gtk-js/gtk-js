use gtk::prelude::*;
use relm4::prelude::*;

/// An expanding start child with no center widget: the start box takes all
/// the room up to the end box.
pub struct ActionbarHexpand;

#[relm4::component(pub)]
impl SimpleComponent for ActionbarHexpand {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ActionBar {
            set_width_request: 360,
            pack_start = &gtk::Button::with_label("Start") {
                set_hexpand: true,
            },
            pack_end = &gtk::Button::with_label("End") {},
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
