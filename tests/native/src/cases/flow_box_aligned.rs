use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

/// A flow box 300px wide with seven labels of different widths: they flow
/// in aligned columns that share the extra width (gtk_flow_box_size_allocate()).
pub struct FlowBoxAligned;

#[relm4::component(pub)]
impl SimpleComponent for FlowBoxAligned {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Clamp {
            set_maximum_size: 300,
            set_tightening_threshold: 300,
            set_width_request: 300,

            gtk::FlowBox {
                set_valign: gtk::Align::Start,
                set_selection_mode: gtk::SelectionMode::None,
                set_min_children_per_line: 3,
                set_max_children_per_line: 3,
                gtk::FlowBoxChild { gtk::Label { set_label: "A" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Bravo" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Charlie charlie" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "D" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Echo" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Foxtrot" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "G" } },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
