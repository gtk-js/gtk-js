use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwPreferencesGroupLabelOnly;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesGroupLabelOnly {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // No rows: the list stays hidden.
        adw::PreferencesGroup {
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
