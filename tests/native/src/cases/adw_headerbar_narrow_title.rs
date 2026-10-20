use relm4::adw;
use relm4::prelude::*;

/// A header bar too narrow for its title, with nothing at the start: the title
/// shrinks against the end box's 6px theme margin (_header-bar.scss), and the
/// empty start box is hidden with its margin (update_box_visibility()).
pub struct AdwHeaderbarNarrowTitle;

#[relm4::component(pub)]
impl SimpleComponent for AdwHeaderbarNarrowTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::HeaderBar {
            set_show_start_title_buttons: false,
            set_show_end_title_buttons: false,
            set_show_back_button: false,
            pack_end = &gtk::Button::with_label("End") {},
            set_title_widget: Some(&adw::WindowTitle::builder()
                .title("A Very Long Window Title That Goes On")
                .build()),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
