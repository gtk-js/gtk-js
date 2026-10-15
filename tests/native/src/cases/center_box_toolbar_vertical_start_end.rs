use gtk::prelude::*;
use relm4::prelude::*;

/// A vertical box with start and end children only: one spacing (.toolbar:
/// 6px) between them.
pub struct CenterBoxToolbarVerticalStartEnd;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarVerticalStartEnd {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
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
