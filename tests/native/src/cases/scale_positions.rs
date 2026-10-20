use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScalePositions;

#[relm4::component(pub)]
impl SimpleComponent for ScalePositions {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            gtk::Scale::new(
                gtk::Orientation::Horizontal,
                Some(&gtk::Adjustment::new(30.0, 0.0, 100.0, 1.0, 10.0, 0.0))
            ) {
                set_width_request: 250,
            },
            gtk::Scale::new(
                gtk::Orientation::Horizontal,
                Some(&gtk::Adjustment::new(30.0, 0.0, 100.0, 1.0, 10.0, 0.0))
            ) {
                set_width_request: 250,
                set_inverted: true,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
