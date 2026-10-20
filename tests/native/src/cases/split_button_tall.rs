use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct SplitButtonTall;

#[relm4::component(pub)]
impl SimpleComponent for SplitButtonTall {
    type Init = ();
    type Input = ();
    type Output = ();

    // A child taller than the arrow: both buttons are as tall as the split
    // button's box layout makes them.
    view! {
        adw::SplitButton {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_popover: Some(&gtk::Popover::new()),
            #[wrap(Some)]
            set_child = &gtk::Label {
                set_label: "Tall",
                set_height_request: 50,
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
