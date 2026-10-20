use gtk::prelude::*;
use relm4::prelude::*;

/// A switch in a box with a large font (`.title-1`, 20pt): its size doesn't depend on it.
pub struct SwitchOffTitle1;

#[relm4::component(pub)]
impl SimpleComponent for SwitchOffTitle1 {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            add_css_class: "title-1",
            set_halign: gtk::Align::Center,
            set_valign: gtk::Align::Center,
            gtk::Switch {},
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
