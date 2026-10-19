use gtk::prelude::*;
use relm4::prelude::*;

pub struct PopoverNoArrow;

#[relm4::component(pub)]
impl SimpleComponent for PopoverNoArrow {
    type Init = ();
    type Input = ();
    type Output = ();

    // A popover without an arrow: its contents start at its edge, with no
    // room for the arrow (tail_height in gtk_popover_size_allocate()).
    view! {
        gtk::Box {
            gtk::Label { set_label: "Anchor" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let widgets = view_output!();

        let popover = gtk::Popover::new();
        popover.set_child(Some(&gtk::Label::new(Some("Popover content"))));
        popover.set_has_arrow(false);
        popover.set_autohide(false);
        popover.set_parent(&root);
        // A popover can only open once its parent is in a window.
        root.connect_map(move |_| popover.popup());

        let model = Self;
        ComponentParts { model, widgets }
    }
}
