use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScrolledWindowOverflow;

#[relm4::component(pub)]
impl SimpleComponent for ScrolledWindowOverflow {
    type Init = ();
    type Input = ();
    type Output = ();

    // Content taller than the window: the vertical scrollbar is an overlay
    // indicator along the right edge, over the full-width viewport.
    view! {
        gtk::ScrolledWindow {
            set_width_request: 200,
            set_height_request: 150,
            gtk::Label {
                set_label: &(1..=30).map(|i| format!("Line {i}")).collect::<Vec<_>>().join("\n"),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
