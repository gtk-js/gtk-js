use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwNavigationSplitViewToolbar;

// Uncollapsed at an odd width (1002 px: a 250 px sidebar), with toolbar views
// whose header bars have title buttons on both sides.
#[relm4::component(pub)]
impl SimpleComponent for AdwNavigationSplitViewToolbar {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::NavigationSplitView {
            set_size_request: (1002, 300),

            #[wrap(Some)]
            set_sidebar = &adw::NavigationPage {
                set_title: "Sidebar",
                set_tag: Some("sidebar"),

                #[wrap(Some)]
                set_child = &adw::ToolbarView {
                    add_top_bar = &adw::HeaderBar {
                        set_decoration_layout: Some("close:close"),
                    },

                    #[wrap(Some)]
                    set_content = &gtk::Label {
                        set_label: "Sidebar",
                    },
                },
            },

            #[wrap(Some)]
            set_content = &adw::NavigationPage {
                set_title: "Content",
                set_tag: Some("content"),

                #[wrap(Some)]
                set_child = &adw::ToolbarView {
                    add_top_bar = &adw::HeaderBar {
                        set_decoration_layout: Some("close:close"),
                    },

                    #[wrap(Some)]
                    set_content = &gtk::Label {
                        set_label: "Content",
                    },

                    add_bottom_bar = &gtk::ActionBar {
                        pack_start = &gtk::Label::new(Some("Bottom bar")) {},
                    },
                },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
