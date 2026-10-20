use relm4::adw;
use relm4::gtk::prelude::*;
use relm4::prelude::*;

/// Two top bars over content extended to the top edge: the content gets the
/// whole view (adw_toolbar_view_size_allocate()), and the bar box gets
/// .collapse-spacing, which makes the header bar thinner (update_collapse_style()).
pub struct AdwToolbarViewExtendTwoBars;

#[relm4::component(pub)]
impl SimpleComponent for AdwToolbarViewExtendTwoBars {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::ToolbarView {
            set_size_request: (360, 220),
            set_extend_content_to_top_edge: true,
            add_top_bar = &adw::HeaderBar {
                set_show_start_title_buttons: false,
                set_show_end_title_buttons: false,
                set_show_back_button: false,
                set_show_title: false,
            },
            add_top_bar = &gtk::SearchBar {
                set_search_mode: true,
                #[wrap(Some)]
                set_child = &gtk::Entry {},
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
