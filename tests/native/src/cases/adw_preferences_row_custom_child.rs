use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwPreferencesRowCustomChild;

#[relm4::component(pub)]
impl SimpleComponent for AdwPreferencesRowCustomChild {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::PreferencesRow {
                set_title: "Preferences Row",
                #[wrap(Some)]
                set_child = &gtk::Label {
                    set_label: "Custom child",
                    set_margin_all: 12,
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
