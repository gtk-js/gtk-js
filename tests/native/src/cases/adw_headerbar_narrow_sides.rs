use relm4::adw;
use relm4::prelude::*;

/// shrink-center-last FALSE: the title shrinks first, then each side is clamped
/// by the other's minimum, so the end side overlaps the title. The clamp holds
/// the header bar at 300px, below its natural width.
pub struct AdwHeaderbarNarrowSides;

#[relm4::component(pub)]
impl SimpleComponent for AdwHeaderbarNarrowSides {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Clamp {
            set_maximum_size: 300,
            set_tightening_threshold: 300,
            #[wrap(Some)]
            set_child = &adw::HeaderBar {
                set_show_start_title_buttons: false,
                set_show_end_title_buttons: false,
                set_show_back_button: false,
                #[wrap(Some)]
                set_title_widget = &adw::WindowTitle::new("Document Title", "") {},
                pack_start = &adw::WindowTitle::new("A long start title", "") {},
                pack_end = &adw::WindowTitle::new("Another long end title", "") {},
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
