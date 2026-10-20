use gtk::prelude::*;
use relm4::prelude::*;

pub struct PasswordEntryNaturalWidth;

#[relm4::component(pub)]
impl SimpleComponent for PasswordEntryNaturalWidth {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::PasswordEntry {
            set_show_peek_icon: true,
            set_halign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
