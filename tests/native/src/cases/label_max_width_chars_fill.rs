use gtk::prelude::*;
use relm4::prelude::*;

/// max-width-chars only limits a label's natural width: filling a 400px box,
/// the wrapping label is laid out on one line at 400px (get_default_widths()).
pub struct LabelMaxWidthCharsFill;

#[relm4::component(pub)]
impl SimpleComponent for LabelMaxWidthCharsFill {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_width_request: 400,
            gtk::Label {
                set_label: "The quick brown fox jumps over the lazy dog",
                set_wrap: true,
                set_max_width_chars: 10,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
