use gtk::prelude::*;
use relm4::prelude::*;

/// An ellipsizing label's minimum width is the ellipsis, or width-chars if
/// wider (get_static_size()), not its text: next to "Fixed" in boxes at their
/// minimum width, it shows just the ellipsis, or 5 characters with width-chars 5.
pub struct LabelEllipsizeMinWidth;

#[relm4::component(pub)]
impl SimpleComponent for LabelEllipsizeMinWidth {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            // Scrolled windows that don't scroll horizontally or take their
            // child's natural width allocate the child its minimum width.
            gtk::ScrolledWindow {
                set_halign: gtk::Align::Start,
                set_hscrollbar_policy: gtk::PolicyType::Never,
                set_vscrollbar_policy: gtk::PolicyType::Never,
                set_propagate_natural_width: false,
                set_propagate_natural_height: true,
                #[wrap(Some)]
                set_child = &gtk::Box {
                    gtk::Label {
                        set_label: "A fairly long ellipsizing label",
                        set_ellipsize: gtk::pango::EllipsizeMode::End,
                    },
                    gtk::Label { set_label: "Fixed" },
                },
            },
            gtk::ScrolledWindow {
                set_halign: gtk::Align::Start,
                set_hscrollbar_policy: gtk::PolicyType::Never,
                set_vscrollbar_policy: gtk::PolicyType::Never,
                set_propagate_natural_width: false,
                set_propagate_natural_height: true,
                #[wrap(Some)]
                set_child = &gtk::Box {
                    gtk::Label {
                        set_label: "A fairly long ellipsizing label",
                        set_ellipsize: gtk::pango::EllipsizeMode::End,
                        set_width_chars: 5,
                    },
                    gtk::Label { set_label: "Fixed" },
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
