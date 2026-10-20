use gtk::prelude::*;
use relm4::prelude::*;

pub struct ListboxSelection;

// A selectable row is .activatable even when it isn't activatable itself
// (gtk_list_box_update_row()); the selected row is :selected.
#[relm4::component(pub)]
impl SimpleComponent for ListboxSelection {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            gtk::ListBoxRow {
                set_activatable: false,
                gtk::Label { set_label: "Selectable" },
            },
            gtk::ListBoxRow {
                set_activatable: false,
                set_selectable: false,
                gtk::Label { set_label: "Neither" },
            },
            #[name = "selected"]
            gtk::ListBoxRow {
                gtk::Label { set_label: "Selected" },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        root.select_row(Some(&widgets.selected));
        ComponentParts { model, widgets }
    }
}
