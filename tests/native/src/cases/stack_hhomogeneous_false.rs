use gtk::prelude::*;
use relm4::prelude::*;

/// With hhomogeneous off, the stack is as wide as its visible page, and a
/// hidden page counts for its height at that width (gtk_stack_measure()):
/// the hidden wrapping label takes four lines, not one per word.
pub struct StackHhomogeneousFalse;

#[relm4::component(pub)]
impl SimpleComponent for StackHhomogeneousFalse {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Stack {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_hhomogeneous: false,
            add_named[Some("short")] = &gtk::Label::new(Some("Short visible page")),
            add_named[Some("long")] = &gtk::Label::builder()
                .label("This hidden page holds a wrapping label with quite a few words in it")
                .wrap(true)
                .build(),
            set_visible_child_name: "short",
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
