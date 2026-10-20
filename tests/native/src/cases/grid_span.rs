use gtk::prelude::*;
use relm4::prelude::*;

pub struct GridSpan;

#[relm4::component(pub)]
impl SimpleComponent for GridSpan {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // The docs example: children fill their cells, "3" spans both columns.
        gtk::Grid {
            set_halign: gtk::Align::Start,
            set_width_request: 360,
            set_column_spacing: 8,
            set_row_spacing: 8,
            set_column_homogeneous: true,
            attach[0, 0, 1, 1] = &gtk::Button { set_label: "1" },
            attach[1, 0, 1, 1] = &gtk::Button { set_label: "2", set_halign: gtk::Align::End },
            attach[0, 1, 2, 1] = &gtk::Button { set_label: "3" },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
