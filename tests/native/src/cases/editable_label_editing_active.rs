use gtk::prelude::*;
use relm4::prelude::*;

pub struct EditableLabelEditingActive;

#[relm4::component(pub)]
impl SimpleComponent for EditableLabelEditingActive {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::EditableLabel {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_text: "Editable",
            set_editing: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
