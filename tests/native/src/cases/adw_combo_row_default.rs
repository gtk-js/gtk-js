use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwComboRowDefault;

#[relm4::component(pub)]
impl SimpleComponent for AdwComboRowDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::ComboRow {
                set_title: "Combo Row",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let items = gtk::StringList::new(&["Option 1", "Option 2", "Option 3"]);
        if let Some(row) = root.first_child().and_then(|w| w.downcast::<adw::ComboRow>().ok()) {
            row.set_model(Some(&items));
            row.set_selected(0);
        }

        ComponentParts { model, widgets }
    }
}
