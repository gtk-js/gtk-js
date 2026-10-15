use gtk::prelude::*;
use relm4::prelude::*;

/// A homogeneous stack (the default) is as large as its largest page, here
/// the hidden one: as wide as the label with the same text below it.
pub struct StackHomogeneous;

#[relm4::component(pub)]
impl SimpleComponent for StackHomogeneous {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            gtk::Stack {
                set_halign: gtk::Align::Start,
                add_named[Some("short")] = &gtk::Label::builder().label("A").build(),
                add_named[Some("long")] = &gtk::Label::builder().label("A much longer page").build(),
                set_visible_child_name: "short",
            },
            gtk::Label { set_label: "A much longer page" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
