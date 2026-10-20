use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwSpinRowLongTitle;

#[relm4::component(pub)]
impl SimpleComponent for AdwSpinRowLongTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    // The title doesn't expand, the spin button does
    // (adw_action_row_set_expand_suffixes()): a long title wraps beside the
    // spin button, which is as wide as its range needs.
    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_width_request: 360,

            gtk::ListBox {
                set_selection_mode: gtk::SelectionMode::None,
                add_css_class: "boxed-list",

                adw::SpinRow {
                    set_title: "Maximum simultaneous downloads",
                    set_adjustment: Some(&gtk::Adjustment::new(4.0, 1.0, 16.0, 1.0, 10.0, 0.0)),
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
