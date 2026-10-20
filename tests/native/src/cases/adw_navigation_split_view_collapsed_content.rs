use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwNavigationSplitViewCollapsedContent;

// Collapsed after showing the content: the content page is shown, with a
// back button (the web case pushes it while uncollapsed, then collapses).
#[relm4::component(pub)]
impl SimpleComponent for AdwNavigationSplitViewCollapsedContent {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::NavigationSplitView {
            set_size_request: (400, 240),
            set_show_content: true,
            set_collapsed: true,

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
