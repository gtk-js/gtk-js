use gtk::prelude::*;
use relm4::prelude::*;

pub struct LabelMonospace;

#[relm4::component(pub)]
impl SimpleComponent for LabelMonospace {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Label {
            set_label: "Monospace label 01234567",
            add_css_class: "monospace",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
