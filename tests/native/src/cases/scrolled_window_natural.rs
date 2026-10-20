use gtk::prelude::*;
use relm4::prelude::*;

pub struct ScrolledWindowNatural;

#[relm4::component(pub)]
impl SimpleComponent for ScrolledWindowNatural {
    type Init = ();
    type Input = ();
    type Output = ();

    // Without propagate-natural-height, a scrolled window is as tall as its
    // scrollbar's minimum, however tall its content.
    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            gtk::ScrolledWindow {
                set_has_frame: true,
                gtk::Label {
                    set_label: &(1..=10).map(|i| format!("Line {i}")).collect::<Vec<_>>().join("\n"),
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
