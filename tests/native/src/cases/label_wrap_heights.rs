use gtk::prelude::*;
use relm4::prelude::*;

/// Wrapping labels are whole pixels tall (gtk_label_measure() takes the
/// layout's pixel size): two 20.53px lines of body text make a 42px label,
/// and the label after it starts on a whole pixel.
pub struct LabelWrapHeights;

#[relm4::component(pub)]
impl SimpleComponent for LabelWrapHeights {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 200,
            gtk::Label {
                set_label: "Typeset is an app that doesn’t exist.",
                set_wrap: true,
                set_wrap_mode: gtk::pango::WrapMode::WordChar,
                set_xalign: 0.0,
                // Only the box's width decides where the text wraps.
                set_max_width_chars: 1,
                add_css_class: "body",
            },
            gtk::Label {
                set_label: "Two lines of the default font in a wrapping label.",
                set_wrap: true,
                set_wrap_mode: gtk::pango::WrapMode::WordChar,
                set_xalign: 0.0,
                set_max_width_chars: 1,
            },
            gtk::Label { set_label: "After", set_xalign: 0.0 },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
