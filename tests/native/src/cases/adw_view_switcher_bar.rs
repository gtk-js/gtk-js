use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwViewSwitcherBar;

#[relm4::component(pub)]
impl SimpleComponent for AdwViewSwitcherBar {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::ViewSwitcherBar {
            set_reveal: true,
            set_size_request: (400, -1),
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let stack = adw::ViewStack::new();
        stack.add_titled_with_icon(&gtk::Label::new(Some("Home")), Some("home"), "Home", "go-home-symbolic");
        stack.add_titled_with_icon(&gtk::Label::new(Some("Search")), Some("search"), "Search", "system-search-symbolic");
        stack.add_titled_with_icon(&gtk::Label::new(Some("Settings")), Some("settings"), "Settings", "preferences-system-symbolic");
        root.set_stack(Some(&stack));

        ComponentParts { model, widgets }
    }
}
