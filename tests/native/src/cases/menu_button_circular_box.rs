use gtk::prelude::*;
use relm4::prelude::*;

pub struct MenuButtonCircularBox;

#[relm4::component(pub)]
impl SimpleComponent for MenuButtonCircularBox {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            // Its natural size, not the test window's.
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_spacing: 6,

            gtk::Button {
                set_icon_name: "list-add-symbolic",
            },

            gtk::MenuButton {
                set_popover: Some(&gtk::Popover::new()),
                add_css_class: "circular",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
