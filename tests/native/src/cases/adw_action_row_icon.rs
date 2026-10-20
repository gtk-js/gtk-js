use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwActionRowIcon;

#[relm4::component(pub)]
impl SimpleComponent for AdwActionRowIcon {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            #[name = "row"]
            adw::ActionRow {
                set_title: "Action Row",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        // AdwActionRow:icon-name, deprecated since libadwaita 1.3 but still shown.
        #[allow(deprecated)]
        widgets.row.set_icon_name(Some("edit-delete-symbolic"));
        ComponentParts { model, widgets }
    }
}
