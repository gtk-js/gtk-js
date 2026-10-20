use gtk::prelude::*;
use relm4::prelude::*;

/// The children get the full height unless their valign says otherwise, and an
/// expanding start child takes the room up to the center child.
pub struct CenterBoxFillExpand;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxFillExpand {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 360,
            #[wrap(Some)]
            set_start_widget = &gtk::Button::builder().label("Start").hexpand(true).build(),
            #[wrap(Some)]
            set_center_widget = &gtk::Button::builder().label("Tall").height_request(70).build(),
            #[wrap(Some)]
            set_end_widget = &gtk::Button::builder()
                .label("End")
                .valign(gtk::Align::Start)
                .build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
