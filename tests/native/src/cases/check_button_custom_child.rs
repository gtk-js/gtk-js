use gtk::prelude::*;
use relm4::prelude::*;

pub struct CheckButtonCustomChild;

#[relm4::component(pub)]
impl SimpleComponent for CheckButtonCustomChild {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::CheckButton {
            #[wrap(Some)]
            set_child = &gtk::Box {
                set_orientation: gtk::Orientation::Vertical,

                gtk::Label {
                    set_label: "Title line",
                    set_xalign: 0.0,
                },
                gtk::Label {
                    set_label: "Second line of text",
                    set_xalign: 0.0,
                },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
