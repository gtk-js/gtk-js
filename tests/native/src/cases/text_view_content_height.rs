use gtk::prelude::*;
use relm4::prelude::*;

pub struct TextViewContentHeight;

#[relm4::component(pub)]
impl SimpleComponent for TextViewContentHeight {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // A text view is as tall as its text and needs no width but its
        // margins (gtk_text_view_measure()), so it takes the box's width.
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_width_request: 100,
            gtk::TextView {
                set_buffer: Some(&gtk::TextBuffer::builder().text("1\n2\n3").build()),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        // The text view measures its text in an idle after its first
        // allocation (first_validate_callback()); allocate the box again,
        // as the next frame would, before the snapshot.
        let widget = root.clone();
        gtk::glib::idle_add_local_once(move || {
            let allocation = gtk::Allocation::new(0, 0, widget.width(), widget.height());
            widget.size_allocate(&allocation, -1);
        });
        ComponentParts { model, widgets }
    }
}
