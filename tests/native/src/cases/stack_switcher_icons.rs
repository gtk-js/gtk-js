use gtk::prelude::*;
use relm4::prelude::*;

/// gtk_stack_switcher rebuild_child(): a page with an icon gets an image
/// button (its title is only the tooltip), a page with a title a centered
/// label, which anchors the needs-attention dot, and a page with neither no
/// button at all.
pub struct StackSwitcherIcons;

#[relm4::component(pub)]
impl SimpleComponent for StackSwitcherIcons {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::StackSwitcher {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let stack = gtk::Stack::new();
        let open = stack.add_titled(&gtk::Label::new(Some("Open")), Some("open"), "Open");
        open.set_icon_name("document-open-symbolic");
        let find = stack.add_named(&gtk::Label::new(Some("Find")), Some("find"));
        find.set_icon_name("edit-find-symbolic");
        let text = stack.add_titled(&gtk::Label::new(Some("Text")), Some("text"), "Attention");
        text.set_needs_attention(true);
        stack.add_named(&gtk::Label::new(Some("Untitled")), Some("untitled"));
        root.set_stack(Some(&stack));

        ComponentParts { model, widgets }
    }
}
