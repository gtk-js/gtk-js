use gtk::prelude::*;
use relm4::prelude::*;

pub struct EntryPrimaryIcon;

#[relm4::component(pub)]
impl SimpleComponent for EntryPrimaryIcon {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Entry {
            // At its natural size, not the test window's.
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_text: "Hello",
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        root.set_icon_from_icon_name(gtk::EntryIconPosition::Primary, Some("edit-find-symbolic"));
        ComponentParts { model, widgets }
    }
}
