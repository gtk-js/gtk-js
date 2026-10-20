use gtk::prelude::*;
use relm4::prelude::*;

/// A flow box with its second child selected.
pub struct FlowBoxSelected;

#[relm4::component(pub)]
impl SimpleComponent for FlowBoxSelected {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::FlowBox {
            set_valign: gtk::Align::Start,
            set_halign: gtk::Align::Start,
            set_can_focus: false,
            gtk::FlowBoxChild { gtk::Label { set_label: "One" } },
            gtk::FlowBoxChild { gtk::Label { set_label: "Two" } },
            gtk::FlowBoxChild { gtk::Label { set_label: "Three" } },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        if let Some(child) = root.child_at_index(1) {
            root.select_child(&child);
        }
        ComponentParts { model, widgets }
    }
}
