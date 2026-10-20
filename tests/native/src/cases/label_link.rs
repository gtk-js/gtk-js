use gtk::prelude::*;
use relm4::prelude::*;

/// A label with a link: the link is drawn in the link color with the
/// label's alpha (get_color() in gskpango.c).
pub struct LabelLink;

#[relm4::component(pub)]
impl SimpleComponent for LabelLink {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Label {
            set_label: "Visit <a href=\"https://gnome.org\">GNOME</a>",
            set_use_markup: true,
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
