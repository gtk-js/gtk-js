use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwNavigationViewScrolled;

#[relm4::component(pub)]
impl SimpleComponent for AdwNavigationViewScrolled {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::NavigationView {
            set_width_request: 200,
            set_height_request: 150,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // A page with more content than fits in the view, in a box: the
        // scrolled window shrinks to the view and scrolls.
        let rows = gtk::Box::new(gtk::Orientation::Vertical, 0);
        for i in 1..=12 {
            rows.append(&gtk::Label::new(Some(&format!("Row {i}"))));
        }
        // It fills the box, as a page's scrolled window does.
        let scrolled = gtk::ScrolledWindow::builder()
            .child(&rows)
            .vexpand(true)
            .build();
        let content = gtk::Box::new(gtk::Orientation::Vertical, 0);
        content.append(&scrolled);
        let page = adw::NavigationPage::builder()
            .title("Home")
            .tag("home")
            .child(&content)
            .build();
        root.push(&page);

        ComponentParts { model, widgets }
    }
}
