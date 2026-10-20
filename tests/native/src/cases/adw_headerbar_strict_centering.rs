use relm4::adw;
use relm4::prelude::*;

/// A header bar with a wide start widget and a narrow end one, too narrow for
/// its title: centering-policy STRICT gives both sides the wider one's width,
/// so the title stays centered and shrinks (adw_header_bar_set_centering_policy()).
pub struct AdwHeaderbarStrictCentering;

#[relm4::component(pub)]
impl SimpleComponent for AdwHeaderbarStrictCentering {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::HeaderBar {
            set_show_start_title_buttons: false,
            set_show_end_title_buttons: false,
            set_show_back_button: false,
            set_centering_policy: adw::CenteringPolicy::Strict,
            pack_start = &gtk::Button::with_label("Open") {},
            pack_end = &gtk::Button::from_icon_name("open-menu-symbolic") {},
            set_title_widget: Some(&adw::WindowTitle::builder()
                .title("A Rather Long Window Title Here")
                .build()),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
