use gtk::prelude::*;
use relm4::prelude::*;

/// Baseline-aligned children in a box taller than they need sit at the bottom
/// with baseline-position=bottom.
pub struct CenterBoxBaselineBottom;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxBaselineBottom {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_size_request: (240, 60),
            set_baseline_position: gtk::BaselinePosition::Bottom,
            #[wrap(Some)]
            set_start_widget = &gtk::Label::builder()
                .label("Bottom")
                .valign(gtk::Align::BaselineCenter)
                .build(),
            #[wrap(Some)]
            set_end_widget = &gtk::Button::builder()
                .label("Baseline")
                .valign(gtk::Align::BaselineCenter)
                .build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
