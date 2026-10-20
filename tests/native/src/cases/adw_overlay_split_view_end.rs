use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwOverlaySplitViewEnd;

#[relm4::component(pub)]
impl SimpleComponent for AdwOverlaySplitViewEnd {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::OverlaySplitView {
            set_width_request: 600,
            set_height_request: 200,
            set_sidebar_position: gtk::PackType::End,

            #[wrap(Some)]
            set_sidebar = &gtk::Label {
                set_label: "Sidebar",
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
