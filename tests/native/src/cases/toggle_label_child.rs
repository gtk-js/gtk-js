use gtk::prelude::*;
use relm4::prelude::*;

pub struct ToggleLabelChild;

#[relm4::component(pub)]
impl SimpleComponent for ToggleLabelChild {
    type Init = ();
    type Input = ();
    type Output = ();

    // A label child makes it a .text-button (gtk_button_set_child()).
    view! {
        gtk::ToggleButton {
            #[wrap(Some)]
            set_child = &gtk::Label {
                set_label: "Child label",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
