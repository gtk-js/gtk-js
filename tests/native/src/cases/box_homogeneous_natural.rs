use gtk::prelude::*;
use relm4::prelude::*;

pub struct BoxHomogeneousNatural;

#[relm4::component(pub)]
impl SimpleComponent for BoxHomogeneousNatural {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // A homogeneous box is n times its largest child
        // (gtk_box_layout_compute_size()), and each child is placed in its
        // equal slot by its halign/valign (gtk_box_layout_allocate()).
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_spacing: 12,
            set_halign: gtk::Align::Start,
            set_width_request: 360,
            gtk::Box {
                set_homogeneous: true,
                set_spacing: 6,
                set_halign: gtk::Align::Start,
                gtk::Button { set_label: "A" },
                gtk::Button { set_label: "Much longer label" },
            },
            gtk::Box {
                set_homogeneous: true,
                set_spacing: 6,
                gtk::Button { set_label: "Fill" },
                gtk::Button { set_label: "Center", set_halign: gtk::Align::Center },
            },
            gtk::Box {
                set_orientation: gtk::Orientation::Vertical,
                set_homogeneous: true,
                set_spacing: 6,
                set_height_request: 120,
                gtk::Button { set_label: "End", set_halign: gtk::Align::End },
                gtk::Button { set_label: "Center", set_valign: gtk::Align::Center },
            },
            // A non-homogeneous box gives each expanding child an equal share
            // of the extra space, in which "c" is placed by its alignment.
            gtk::Box {
                set_spacing: 6,
                gtk::Button { set_label: "a" },
                gtk::Button { set_label: "b hexpand", set_hexpand: true },
                gtk::Button {
                    set_label: "c center",
                    set_hexpand: true,
                    set_halign: gtk::Align::Center,
                },
            },
            gtk::Box {
                set_orientation: gtk::Orientation::Vertical,
                set_spacing: 6,
                set_height_request: 160,
                gtk::Button { set_label: "a", set_halign: gtk::Align::End },
                gtk::Button { set_label: "b vexpand", set_vexpand: true },
                gtk::Button {
                    set_label: "c center",
                    set_vexpand: true,
                    set_valign: gtk::Align::Center,
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
