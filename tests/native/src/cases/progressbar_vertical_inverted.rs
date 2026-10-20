use gtk::prelude::*;
use relm4::prelude::*;

/// Vertical and inverted: the trough fills the bar's height and the progress
/// is the fraction of it from the bottom.
pub struct ProgressbarVerticalInverted;

#[relm4::component(pub)]
impl SimpleComponent for ProgressbarVerticalInverted {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ProgressBar {
            set_orientation: gtk::Orientation::Vertical,
            set_fraction: 0.3,
            set_inverted: true,
            set_height_request: 200,
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
