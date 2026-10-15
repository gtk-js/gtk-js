use gtk::prelude::*;
use relm4::prelude::*;

pub struct BoxHexpandComputed;

#[relm4::component(pub)]
impl SimpleComponent for BoxHexpandComputed {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Only the button expands: it computes expand from its label
        // (gtk_button_compute_expand()). A GtkCenterBox has no compute_expand,
        // and a box set not to expand doesn't, whatever its children do.
        gtk::Box {
            set_halign: gtk::Align::Start,
            set_width_request: 360,
            gtk::Button {
                gtk::Label { set_label: "Button", set_hexpand: true },
            },
            gtk::CenterBox {
                #[wrap(Some)]
                set_center_widget = &gtk::Label { set_label: "Center", set_hexpand: true },
            },
            gtk::Box {
                set_hexpand: false,
                gtk::Label { set_label: "Box", set_hexpand: true },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
