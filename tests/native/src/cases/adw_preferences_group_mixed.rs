use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwPreferencesGroupMixed;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesGroupMixed {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Rows and other widgets added in turn: the rows go in the list, in
        // order, and the labels below it. Their sizes differ, so the test can
        // tell the order.
        adw::PreferencesGroup {
            set_title: "Group Title",

            gtk::Label {
                set_label: "Note",
                set_xalign: 0.0,
            },
            adw::ActionRow {
                set_title: "Row 1",
                set_subtitle: "Subtitle",
            },
            gtk::Label {
                set_label: "Footer",
                set_xalign: 0.0,
                add_css_class: "caption",
            },
            adw::ActionRow {
                set_title: "Row 2",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
