use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwPreferencesGroupFooter;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesGroupFooter {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::PreferencesGroup {
            set_title: "Group Title",

            adw::ActionRow {
                set_title: "Row",
            },
            // Not a row: adw_preferences_group_add() puts it below the list.
            gtk::Label {
                set_label: "Footer",
                set_xalign: 0.0,
                add_css_class: "caption",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
