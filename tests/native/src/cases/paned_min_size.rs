use gtk::prelude::*;
use relm4::prelude::*;

/// gtk_paned_compute_position(): a child that can't shrink keeps the handle
/// off its minimum size, and one that can is still allocated its minimum,
/// against the handle. resize-end-child=false keeps the end child's size.
pub struct PanedMinSize;

fn frame(label: &str) -> gtk::Frame {
    gtk::Frame::builder()
        .child(&gtk::Label::new(Some(label)))
        .build()
}

fn buttons() -> gtk::Box {
    let b = gtk::Box::new(gtk::Orientation::Horizontal, 6);
    for label in ["One", "Two", "Three"] {
        b.append(&gtk::Button::with_label(label));
    }
    b
}

#[relm4::component(pub)]
impl SimpleComponent for PanedMinSize {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            gtk::Paned {
                set_size_request: (400, 48),
                set_position: 150,
                set_shrink_start_child: false,
                set_start_child: Some(&buttons()),
                set_end_child: Some(&frame("End")),
            },
            gtk::Paned {
                set_size_request: (400, 48),
                set_position: 60,
                set_start_child: Some(&buttons()),
                set_end_child: Some(&frame("End")),
            },
            gtk::Paned {
                set_size_request: (400, 48),
                set_position: 150,
                set_resize_end_child: false,
                set_start_child: Some(&frame("Start")),
                set_end_child: Some(&frame("End")),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
