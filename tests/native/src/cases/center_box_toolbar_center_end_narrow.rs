use gtk::prelude::*;
use relm4::prelude::*;

/// A narrow center + end box: the center child is pushed one spacing
/// (.toolbar: 6px) away from the end child.
pub struct CenterBoxToolbarCenterEndNarrow;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarCenterEndNarrow {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            set_width_request: 120,
            add_css_class: "toolbar",
            #[wrap(Some)]
            set_center_widget = &gtk::Label::builder().label("Center").build(),
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
