use gtk::prelude::*;
use relm4::prelude::*;

/// A narrow start + center box: the center child is pushed one spacing
/// (.toolbar: 6px) away from the start child.
pub struct CenterBoxToolbarStartCenterNarrow;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarStartCenterNarrow {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            set_width_request: 120,
            add_css_class: "toolbar",
            #[wrap(Some)]
            set_start_widget = &gtk::Label::builder().label("Side").build(),
            #[wrap(Some)]
            set_center_widget = &gtk::Label::builder().label("Center").build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
