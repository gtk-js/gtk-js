use gtk::prelude::*;
use relm4::prelude::*;

/// A stack gives its page all of its size, and the page's widget aligns
/// itself in it (gtk_stack_size_allocate()): a centered button in a stack
/// with a size request of 300×80.
pub struct StackChildAlign;

#[relm4::component(pub)]
impl SimpleComponent for StackChildAlign {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Stack {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_size_request: (300, 80),
            add_named[Some("page")] = &gtk::Button::builder()
                .label("Centered")
                .halign(gtk::Align::Center)
                .valign(gtk::Align::Center)
                .build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
