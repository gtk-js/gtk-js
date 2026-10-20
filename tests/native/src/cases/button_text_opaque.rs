use gtk::prelude::*;
use relm4::prelude::*;

pub struct ButtonTextOpaque;

#[relm4::component(pub)]
impl SimpleComponent for ButtonTextOpaque {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Button {
            set_label: "Button",
            add_css_class: "opaque",
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
