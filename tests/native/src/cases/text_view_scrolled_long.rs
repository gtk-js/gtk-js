use gtk::prelude::*;
use relm4::prelude::*;

pub struct TextViewScrolledLong;

#[relm4::component(pub)]
impl SimpleComponent for TextViewScrolledLong {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Text taller than the viewport, which the text view scrolls: its
        // vadjustment's upper is the text's height, 30 lines of 18px.
        gtk::ScrolledWindow {
            set_has_frame: true,
            set_width_request: 200,
            set_height_request: 100,
            gtk::TextView {
                set_buffer: Some(&gtk::TextBuffer::builder().text(
                    (1..=30).map(|i| format!("Line {i}")).collect::<Vec<_>>().join("\n"),
                ).build()),
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
