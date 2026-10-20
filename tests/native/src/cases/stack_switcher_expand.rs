use gtk::prelude::*;
use relm4::prelude::*;

/// A switcher's buttons expand (gtk_stack_switcher add_child()): in a box
/// with a width request of 500, the three tabs share its whole width.
pub struct StackSwitcherExpand;

#[relm4::component(pub)]
impl SimpleComponent for StackSwitcherExpand {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_orientation: gtk::Orientation::Vertical,
            set_spacing: 8,
            set_size_request: (500, -1),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let stack = gtk::Stack::new();
        let pages = [
            ("page1", "First", "One"),
            ("page2", "Second", "Two"),
            ("page3", "Third", "Three"),
        ];
        for (name, title, text) in pages {
            stack.add_titled(&gtk::Label::new(Some(text)), Some(name), title);
        }
        let switcher = gtk::StackSwitcher::new();
        switcher.set_stack(Some(&stack));
        root.append(&switcher);
        root.append(&stack);

        ComponentParts { model, widgets }
    }
}
