use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ClampSizes;

#[relm4::component(pub)]
impl SimpleComponent for ClampSizes {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Clamps below the tightening threshold, on the eased curve, and past
        // the point where the child gets the maximum size. The child's
        // allocation includes its margins.
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            adw::Clamp {
                set_halign: gtk::Align::Start,
                set_width_request: 300,
                gtk::Label { set_label: "Clamped", set_margin_start: 12, set_margin_end: 12 },
            },
            adw::Clamp {
                set_halign: gtk::Align::Start,
                set_width_request: 500,
                gtk::Label { set_label: "Clamped", set_margin_start: 12, set_margin_end: 12 },
            },
            adw::Clamp {
                set_halign: gtk::Align::Start,
                set_width_request: 700,
                gtk::Label { set_label: "Clamped", set_margin_start: 12, set_margin_end: 12 },
            },
            adw::Clamp {
                set_halign: gtk::Align::Start,
                set_width_request: 1200,
                gtk::Label { set_label: "Clamped", set_margin_start: 12, set_margin_end: 12 },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
