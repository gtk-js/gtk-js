use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwOverlaySplitViewWideSidebar;

#[relm4::component(pub)]
impl SimpleComponent for AdwOverlaySplitViewWideSidebar {
    type Init = ();
    type Input = ();
    type Output = ();

    // A sidebar child whose minimum width (400) is more than max-sidebar-width
    // (280): get_sidebar_width() gives it its minimum.
    view! {
        adw::OverlaySplitView {
            set_width_request: 1000,
            set_height_request: 60,

            #[wrap(Some)]
            set_sidebar = &gtk::Box {
                set_width_request: 400,
            },

            #[wrap(Some)]
            set_content = &gtk::Label {
                set_label: "Content",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
