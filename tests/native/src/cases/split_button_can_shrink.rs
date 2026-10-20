use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct SplitButtonCanShrink;

#[relm4::component(pub)]
impl SimpleComponent for SplitButtonCanShrink {
    type Init = ();
    type Input = ();
    type Output = ();

    // Narrower than its label: the label ellipsizes on one line.
    view! {
        adw::Clamp {
            set_maximum_size: 100,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            #[wrap(Some)]
            set_child = &adw::SplitButton {
                set_label: "Save document as",
                set_can_shrink: true,
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
