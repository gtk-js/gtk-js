use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScaleMarksInverted;

#[relm4::component(pub)]
impl SimpleComponent for ScaleMarksInverted {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Scale::new(
            gtk::Orientation::Horizontal,
            Some(&gtk::Adjustment::new(20.0, 0.0, 100.0, 1.0, 10.0, 0.0))
        ) {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 250,
            set_inverted: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        root.add_mark(0.0, gtk::PositionType::Bottom, Some("Low"));
        root.add_mark(50.0, gtk::PositionType::Top, Some("Mid"));
        root.add_mark(75.0, gtk::PositionType::Top, None);
        root.add_mark(100.0, gtk::PositionType::Bottom, Some("High"));
        ComponentParts { model, widgets }
    }
}
