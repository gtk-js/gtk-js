use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwEntryRowDisabled;

#[relm4::component(pub)]
impl SimpleComponent for AdwEntryRowDisabled {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::EntryRow {
                set_title: "Entry Row",
                set_text: "Hello World",
                set_sensitive: false,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
