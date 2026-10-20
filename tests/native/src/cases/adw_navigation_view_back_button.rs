use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwNavigationViewBackButton;

fn page(title: &str, tag: &str) -> adw::NavigationPage {
    let header_bar = adw::HeaderBar::builder()
        .show_start_title_buttons(false)
        .show_end_title_buttons(false)
        .build();
    let toolbar_view = adw::ToolbarView::new();
    toolbar_view.add_top_bar(&header_bar);
    toolbar_view.set_content(Some(&gtk::Label::new(Some(title))));
    adw::NavigationPage::builder()
        .title(title)
        .tag(tag)
        .child(&toolbar_view)
        .build()
}

#[relm4::component(pub)]
impl SimpleComponent for AdwNavigationViewBackButton {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::NavigationView {
            set_width_request: 300,
            set_height_request: 200,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // The second page's header bar has a back button (AdwBackButton).
        root.add(&page("Home", "home"));
        root.add(&page("Details", "details"));
        root.push_by_tag("details");

        ComponentParts { model, widgets }
    }
}
