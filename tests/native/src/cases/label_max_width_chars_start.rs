use gtk::prelude::*;
use relm4::prelude::*;

/// A wrapping label with max-width-chars that doesn't fill its vertical box
/// is measured for the height it gets at the box's width: one line, as wide as
/// the same text without max-width-chars above it.
pub struct LabelMaxWidthCharsStart;

#[relm4::component(pub)]
impl SimpleComponent for LabelMaxWidthCharsStart {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            gtk::Label {
                set_label: "The quick brown fox jumps over the lazy dog",
                set_wrap: true,
                set_halign: gtk::Align::Start,
            },
            gtk::Label {
                set_label: "The quick brown fox jumps over the lazy dog",
                set_wrap: true,
                set_max_width_chars: 10,
                set_halign: gtk::Align::Start,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
