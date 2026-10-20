use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

/// A homogeneous flow box 300px wide: equal columns, the spacing left out.
pub struct FlowBoxHomogeneous;

#[relm4::component(pub)]
impl SimpleComponent for FlowBoxHomogeneous {
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
                set_homogeneous: true,
                set_max_children_per_line: 3,
                set_column_spacing: 6,
                set_row_spacing: 6,
                gtk::FlowBoxChild { gtk::Label { set_label: "A" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Bravo" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Charlie charlie" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "D" } },
                gtk::FlowBoxChild { gtk::Label { set_label: "Echo" } },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
