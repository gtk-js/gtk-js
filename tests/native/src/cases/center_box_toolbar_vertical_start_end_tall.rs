use gtk::prelude::*;
use relm4::prelude::*;

/// A tall vertical box with start and end children: the start child at the
/// top, the end child at the bottom, both as wide as the box.
pub struct CenterBoxToolbarVerticalStartEndTall;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarVerticalStartEndTall {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_height_request: 112,
            add_css_class: "toolbar",
            #[wrap(Some)]
            set_start_widget = &gtk::Label::builder().label("Side").build(),
            #[wrap(Some)]
            set_end_widget = &gtk::Label::builder().label("Wider side").build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
