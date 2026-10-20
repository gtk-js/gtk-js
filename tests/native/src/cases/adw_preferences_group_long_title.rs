use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwPreferencesGroupLongTitle;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesGroupLongTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Clamp {
            set_maximum_size: 300,
            set_tightening_threshold: 300,

            #[wrap(Some)]
            set_child = &adw::PreferencesGroup {
                set_title: "A very long group title that will not fit on one line at all",

                adw::ActionRow {
                    set_title: "Row 1",
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
