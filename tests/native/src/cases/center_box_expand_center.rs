use gtk::prelude::*;
use relm4::prelude::*;

/// An expanding center child gets size - 2 × (max(start, end) + spacing), so it
/// reaches the wider side child and stays centered.
pub struct CenterBoxExpandCenter;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxExpandCenter {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 480,
            #[wrap(Some)]
            set_start_widget = &gtk::Button::with_label("Open"),
            #[wrap(Some)]
            set_center_widget = &gtk::Entry::builder().hexpand(true).build(),
            #[wrap(Some)]
            set_end_widget = &gtk::Button::with_label("Save and Close"),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
