use gtk::prelude::*;
use relm4::prelude::*;

/// Only a center child: GtkCenterLayout adds no spacing (.toolbar: 6px).
pub struct CenterBoxToolbarCenterOnly;

#[relm4::component(pub)]
impl SimpleComponent for CenterBoxToolbarCenterOnly {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CenterBox {
            set_halign: gtk::Align::Start,
            add_css_class: "toolbar",
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
