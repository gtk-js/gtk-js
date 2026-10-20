use relm4::gtk::prelude::*;
use relm4::prelude::*;

pub struct HeaderbarWindowTitle;

#[relm4::component(pub)]
impl SimpleComponent for HeaderbarWindowTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    // No title widget: the header bar shows its window's title.
    view! {
        gtk::HeaderBar {
            set_show_title_buttons: false,
            connect_realize => |bar| {
                if let Some(window) = bar.root().and_downcast::<gtk::Window>() {
                    window.set_title(Some("My App"));
                }
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
