use gtk::prelude::*;
use relm4::prelude::*;

pub struct ToggleIcon;

#[relm4::component(pub)]
impl SimpleComponent for ToggleIcon {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ToggleButton {
            set_icon_name: "open-menu-symbolic",
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
