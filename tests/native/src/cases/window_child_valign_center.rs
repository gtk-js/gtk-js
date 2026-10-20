use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct WindowChildValignCenter;

#[relm4::component(pub)]
impl SimpleComponent for WindowChildValignCenter {
    type Init = ();
    type Input = ();
    type Output = ();

    // A 200×100 window content area: its child gets all of it, and its valign
    // centers it there.
    view! {
        adw::Bin {
            set_size_request: (200, 100),
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,

            #[wrap(Some)]
            set_child = &gtk::Label {
                set_label: "Content",
                set_valign: gtk::Align::Center,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
