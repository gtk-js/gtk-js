use gtk::prelude::*;
use relm4::prelude::*;

pub struct BoxExpandSet;

#[relm4::component(pub)]
impl SimpleComponent for BoxExpandSet {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Like GtkCalendar's header: a button that expands itself, aligned to
        // the start of its allocation, so the widgets after it go to the end.
        // The box set not to expand doesn't, whatever its label does.
        gtk::Box {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_spacing: 12,
            gtk::Box {
                set_width_request: 360,
                gtk::Button { set_label: "Next", set_hexpand: true, set_halign: gtk::Align::Start },
                gtk::Label { set_label: "Year" },
                gtk::Box {
                    set_hexpand: false,
                    gtk::Label { set_label: "Box", set_hexpand: true },
                },
            },
            gtk::Box {
                set_orientation: gtk::Orientation::Vertical,
                set_height_request: 150,
                gtk::Button { set_label: "Top", set_vexpand: true, set_valign: gtk::Align::Start },
                gtk::Label { set_label: "Bottom" },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
