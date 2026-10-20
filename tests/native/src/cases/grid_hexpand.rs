use gtk::prelude::*;
use relm4::prelude::*;

pub struct GridHexpand;

#[relm4::component(pub)]
impl SimpleComponent for GridHexpand {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // Only the middle column expands: its button computes expand from its
        // label. The others keep their natural width (gtk_grid_request_allocate()).
        gtk::Grid {
            set_halign: gtk::Align::Start,
            set_width_request: 360,
            set_column_spacing: 6,
            attach[0, 0, 1, 1] = &gtk::Button { set_label: "a" },
            attach[1, 0, 1, 1] = &gtk::Button {
                #[wrap(Some)]
                set_child = &gtk::Label { set_label: "b", set_hexpand: true },
            },
            attach[2, 0, 1, 1] = &gtk::Button { set_label: "c" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
