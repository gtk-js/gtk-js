use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwSwitchRowPrefixSuffix;

#[relm4::component(pub)]
impl SimpleComponent for AdwSwitchRowPrefixSuffix {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::SwitchRow {
                set_title: "Switch Row",
                add_prefix = &gtk::Image {
                    set_icon_name: Some("airplane-mode-symbolic"),
                },
                add_suffix = &gtk::Button {
                    set_icon_name: "document-edit-symbolic",
                    set_valign: gtk::Align::Center,
                    add_css_class: "flat",
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
