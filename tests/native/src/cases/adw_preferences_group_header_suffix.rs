use relm4::adw;
use relm4::adw::prelude::*;
use relm4::gtk;
use relm4::prelude::*;

pub struct AdwPreferencesGroupHeaderSuffix;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesGroupHeaderSuffix {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::PreferencesGroup {
            set_title: "Group Title",
            set_description: Some("A description"),
            set_header_suffix: Some(&gtk::Button::with_label("Add")),

            adw::ActionRow {
                set_title: "Row 1",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
