use gtk::prelude::*;
use relm4::prelude::*;

pub struct TextViewScrolled;

#[relm4::component(pub)]
impl SimpleComponent for TextViewScrolled {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // A text view scrolls its own text, so the scrolled window allocates
        // it the whole viewport, wider and taller than its text.
        gtk::ScrolledWindow {
            set_has_frame: true,
            set_width_request: 200,
            set_height_request: 100,
            gtk::TextView {},
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
