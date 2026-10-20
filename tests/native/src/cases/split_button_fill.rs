use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct SplitButtonFill;

#[relm4::component(pub)]
impl SimpleComponent for SplitButtonFill {
    type Init = ();
    type Input = ();
    type Output = ();

    // Given more width than it needs, the split button gives it to its action
    // button, which expands (adw_split_button_init()).
    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 200,
            adw::SplitButton {
                set_label: "Fill",
                set_popover: Some(&gtk::Popover::new()),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
