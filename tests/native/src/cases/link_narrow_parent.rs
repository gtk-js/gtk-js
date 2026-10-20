use gtk::prelude::*;
use relm4::prelude::*;

// GTK never allocates a widget less than its minimum width, and a button's
// label doesn't wrap: in a parent narrower than it, the link keeps its natural
// size.
pub struct LinkNarrowParent;

#[relm4::component(pub)]
impl SimpleComponent for LinkNarrowParent {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::LinkButton {
            set_label: "A long link label",
            set_uri: "https://example.com",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
