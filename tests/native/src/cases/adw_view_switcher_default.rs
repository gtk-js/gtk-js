use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwViewSwitcherDefault;

#[relm4::component(pub)]
impl SimpleComponent for AdwViewSwitcherDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    // At its natural size, so the buttons' widths can be compared.
    view! {
        adw::ViewSwitcher {
            set_policy: adw::ViewSwitcherPolicy::Wide,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let stack = adw::ViewStack::new();
        stack.add_titled_with_icon(&gtk::Label::new(Some("Page 1")), Some("page1"), "Page 1", "open-menu-symbolic");
        stack.add_titled_with_icon(&gtk::Label::new(Some("Page 2")), Some("page2"), "Page 2", "open-menu-symbolic");
        root.set_stack(Some(&stack));

        ComponentParts { model, widgets }
    }
}
