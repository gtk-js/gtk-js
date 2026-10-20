use gtk::prelude::*;
use relm4::prelude::*;

pub struct ButtonIconLabel;

#[relm4::component(pub)]
impl SimpleComponent for ButtonIconLabel {
    type Init = ();
    type Input = ();
    type Output = ();

    // GtkButton holds one child: an icon and a label go in a box, centered,
    // like AdwButtonContent's, and the theme spaces them (.image-text-button).
    view! {
        gtk::Button {
            add_css_class: "image-text-button",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,

            gtk::Box {
                set_halign: gtk::Align::Center,

                gtk::Image {
                    set_icon_name: Some("open-menu-symbolic"),
                    set_valign: gtk::Align::Center,
                },
                gtk::Label {
                    set_label: "Open",
                },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
