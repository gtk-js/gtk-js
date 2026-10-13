use gtk::prelude::*;
use relm4::prelude::*;

/// One line of text in each text style: GTK sizes labels by Pango's line
/// height (ascent + descent at `normal`), rounded up to whole pixels.
pub struct LabelHeights;

#[relm4::component(pub)]
impl SimpleComponent for LabelHeights {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            gtk::Label { set_label: "Label" },
            gtk::Label { set_label: "Body", add_css_class: "body" },
            gtk::Label { set_label: "Caption", add_css_class: "caption" },
            gtk::Label { set_label: "Heading", add_css_class: "heading" },
            gtk::Label { set_label: "Title", add_css_class: "title-1" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
