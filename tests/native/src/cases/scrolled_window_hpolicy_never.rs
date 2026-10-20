use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScrolledWindowHpolicyNever;

#[relm4::component(pub)]
impl SimpleComponent for ScrolledWindowHpolicyNever {
    type Init = ();
    type Input = ();
    type Output = ();

    // A box narrower than the label: with the never policy the scrolled window
    // is at least as wide as its child.
    view! {
        gtk::Box {
            set_width_request: 80,
            gtk::ScrolledWindow {
                set_has_frame: true,
                set_hscrollbar_policy: gtk::PolicyType::Never,
                set_height_request: 60,
                gtk::Label { set_label: "Never-scrolls-horizontally" },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
