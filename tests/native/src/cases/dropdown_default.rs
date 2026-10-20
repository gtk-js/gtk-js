use gtk::prelude::*;
use relm4::prelude::*;

pub struct DropdownDefault;

#[relm4::component(pub)]
impl SimpleComponent for DropdownDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::DropDown::from_strings(&["Option 1", "Option 2", "Option 3"]) {
            set_selected: 0,
            // Its natural width, not the window's.
            set_halign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
