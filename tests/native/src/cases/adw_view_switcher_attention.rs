use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwViewSwitcherAttention;

#[relm4::component(pub)]
impl SimpleComponent for AdwViewSwitcherAttention {
    type Init = ();
    type Input = ();
    type Output = ();

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
        stack.add_titled_with_icon(&gtk::Label::new(Some("Home")), Some("home"), "Home", "go-home-symbolic");
        let mail = stack.add_titled_with_icon(&gtk::Label::new(Some("Mail")), Some("mail"), "Mail", "mail-unread-symbolic");
        mail.set_needs_attention(true);
        let chat = stack.add_titled_with_icon(&gtk::Label::new(Some("Chat")), Some("chat"), "Chat", "user-available-symbolic");
        chat.set_badge_number(5);
        chat.set_needs_attention(true);
        root.set_stack(Some(&stack));

        ComponentParts { model, widgets }
    }
}
