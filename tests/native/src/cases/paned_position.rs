use gtk::prelude::*;
use relm4::prelude::*;

/// The start child gets the position, the handle its size and the end child
/// the rest, each child its whole pane (gtk_paned_size_allocate()). A lone
/// child gets the whole paned.
pub struct PanedPosition;

fn frame(label: &str) -> gtk::Frame {
    gtk::Frame::builder()
        .child(&gtk::Label::new(Some(label)))
        .build()
}

#[relm4::component(pub)]
impl SimpleComponent for PanedPosition {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            gtk::Paned {
                set_size_request: (400, 80),
                set_position: 150,
                set_start_child: Some(&frame("Start")),
                set_end_child: Some(&frame("End")),
            },
            gtk::Paned {
                set_orientation: gtk::Orientation::Vertical,
                set_size_request: (400, 200),
                set_position: 60,
                set_start_child: Some(&frame("Top")),
                set_end_child: Some(&frame("Bottom")),
            },
            gtk::Paned {
                set_size_request: (400, 48),
                set_position: 150,
                set_start_child: Some(&frame("Only child")),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
