use gtk::prelude::*;
use relm4::prelude::*;

pub struct EditableLabelDisplayEmpty;

#[relm4::component(pub)]
impl SimpleComponent for EditableLabelDisplayEmpty {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::EditableLabel {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_text: "",
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
