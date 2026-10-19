use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwViewSwitcherNarrowLabel;

#[relm4::component(pub)]
impl SimpleComponent for AdwViewSwitcherNarrowLabel {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::ViewSwitcher {
            set_policy: adw::ViewSwitcherPolicy::Narrow,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // A long title, so the narrow label's 0.75rem font size shows in its width.
        let stack = adw::ViewStack::new();
        stack.add_titled_with_icon(
            &gtk::Label::new(Some("Notifications and Preferences")),
            Some("page"),
            "Notifications and Preferences",
            "open-menu-symbolic",
        );
        root.set_stack(Some(&stack));

        ComponentParts { model, widgets }
    }
}
