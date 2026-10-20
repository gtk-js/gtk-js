use gtk::prelude::*;
use relm4::prelude::*;

/// An image without an icon size takes the -gtk-icon-size it inherits:
/// 32px in a .large-icons box (gtk_icon_helper_get_size()).
pub struct ImageInheritInLargeIcons;

#[relm4::component(pub)]
impl SimpleComponent for ImageInheritInLargeIcons {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            add_css_class: "large-icons",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            gtk::Image {
                set_icon_name: Some("open-menu-symbolic"),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
