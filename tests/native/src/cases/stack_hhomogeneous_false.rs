use gtk::prelude::*;
use relm4::prelude::*;

/// With hhomogeneous off, the stack is as wide as its visible page, and a
/// hidden page counts for its height laid out at that width
/// (gtk_stack_measure()), not at its narrowest: the hidden wrapping label
/// fits on one line, rather than taking one line per word.
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
                .label("A few words")
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
