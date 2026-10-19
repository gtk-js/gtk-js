use relm4::adw;
use relm4::prelude::*;

/// A header bar too narrow for its title: the title shrinks between the start
/// and end boxes, which keep their 6px theme margins (_header-bar.scss).
pub struct HeaderbarNarrowTitle;

#[relm4::component(pub)]
impl SimpleComponent for HeaderbarNarrowTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::HeaderBar {
            set_show_title_buttons: false,
            pack_start = &gtk::Button::with_label("Start") {},
            pack_end = &gtk::Button::with_label("End") {},
            set_title_widget: Some(&adw::WindowTitle::builder()
                .title("A Very Long Window Title Here")
                .build()),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
