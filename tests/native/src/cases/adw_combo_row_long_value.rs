use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

/// A combo row whose selected item is too long for the row: the default
/// factory's label ellipsizes it at 20 characters.
pub struct AdwComboRowLongValue;

#[relm4::component(pub)]
impl SimpleComponent for AdwComboRowLongValue {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",
            set_size_request: (360, -1),

            adw::ComboRow {
                set_title: "Appearance",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let items = gtk::StringList::new(&[
            "Automatic (follow the system setting when possible)",
            "Light",
            "Dark",
        ]);
        if let Some(row) = root.first_child().and_then(|w| w.downcast::<adw::ComboRow>().ok()) {
            row.set_model(Some(&items));
            row.set_selected(0);
        }

        ComponentParts { model, widgets }
    }
}
