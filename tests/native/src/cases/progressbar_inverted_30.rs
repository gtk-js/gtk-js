use gtk::prelude::*;
use relm4::prelude::*;

/// Inverted: the progress is the fraction, drawn from the end.
pub struct ProgressbarInverted30;

#[relm4::component(pub)]
impl SimpleComponent for ProgressbarInverted30 {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ProgressBar {
            set_fraction: 0.3,
            set_inverted: true,
            set_width_request: 200,
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
