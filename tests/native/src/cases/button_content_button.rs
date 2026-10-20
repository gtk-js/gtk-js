use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ButtonContentButton;

#[relm4::component(pub)]
impl SimpleComponent for ButtonContentButton {
    type Init = ();
    type Input = ();
    type Output = ();

    // The button gets .image-text-button from its content
    // (adw_button_content_root()), which is centered in a wider button.
    view! {
        gtk::Button {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 150,
            #[wrap(Some)]
            set_child = &adw::ButtonContent {
                set_icon_name: "document-open-symbolic",
                set_label: "Open",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
