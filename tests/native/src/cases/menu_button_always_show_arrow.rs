use gtk::prelude::*;
use relm4::prelude::*;

pub struct MenuButtonAlwaysShowArrow;

#[relm4::component(pub)]
impl SimpleComponent for MenuButtonAlwaysShowArrow {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::MenuButton {
            // Its natural size, not the test window's.
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_icon_name: "open-menu-symbolic",
            set_always_show_arrow: true,
            set_popover: Some(&gtk::Popover::new()),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
