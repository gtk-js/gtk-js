use gtk::prelude::*;
use relm4::prelude::*;

/// Start and end children only: one spacing between them (.toolbar: 6px).
pub struct CenterBoxToolbarStartEnd;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarStartEnd {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            add_css_class: "toolbar",
            #[wrap(Some)]
            set_start_widget = &gtk::Label::builder().label("Side").build(),
            #[wrap(Some)]
            set_end_widget = &gtk::Label::builder().label("Side").build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
