use gtk::prelude::*;
use relm4::prelude::*;

/// Labels whose text is a fraction of a pixel wide or tall: GTK rounds a
/// label's size up to whole pixels (gtk_label_measure()), so the buttons and
/// what follows them sit on whole pixels.
pub struct LabelFractionalText;

#[relm4::component(pub)]
impl SimpleComponent for LabelFractionalText {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_spacing: 6,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            gtk::Button { set_label: "Save" },
            gtk::Button { set_label: "Flat", add_css_class: "flat" },
            gtk::Button { set_label: "Up" },
            gtk::Label { set_label: "Two\nlines", set_valign: gtk::Align::Start },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
