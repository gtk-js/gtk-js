use gtk::prelude::*;
use relm4::prelude::*;

pub struct DropdownFill;

#[relm4::component(pub)]
impl SimpleComponent for DropdownFill {
    type Init = ();
    type Input = ();
    type Output = ();

    // A dropdown wider than its button's natural size: it allocates the button
    // its full size (gtk_drop_down_size_allocate()), and the label stays at the
    // start while the arrow goes to the end.
    view! {
        gtk::DropDown::from_strings(&["Option 1", "Option 2", "Option 3"]) {
            set_selected: 0,
            set_width_request: 300,
            set_halign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
