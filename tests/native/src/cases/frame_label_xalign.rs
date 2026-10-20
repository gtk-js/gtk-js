use gtk::prelude::*;
use relm4::prelude::*;

pub struct FrameLabelXalign;

#[relm4::component(pub)]
impl SimpleComponent for FrameLabelXalign {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        // gtk_frame_size_allocate() puts the label at label-xalign of the free
        // width (1 - label-xalign in RTL) and gives the child the rest.
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_spacing: 12,
            set_width_request: 360,
            gtk::Frame {
                set_label: Some("Frame"),
                gtk::Label { set_label: "Content" },
            },
            gtk::Frame {
                set_label: Some("Quarter"),
                set_label_align: 0.25,
                gtk::Label { set_label: "Content" },
            },
            gtk::Frame {
                set_label: Some("Quarter"),
                set_label_align: 0.25,
                set_direction: gtk::TextDirection::Rtl,
                gtk::Label { set_label: "Content" },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
