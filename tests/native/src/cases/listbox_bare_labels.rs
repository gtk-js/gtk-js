use relm4::prelude::*;

pub struct ListboxBareLabels;

// Widgets that aren't rows go in one (gtk_list_box_insert()).
#[relm4::component(pub)]
impl SimpleComponent for ListboxBareLabels {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            gtk::Label { set_label: "Row 1" },
            gtk::Label { set_label: "Row 2" },
            gtk::Label { set_label: "Row 3" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
