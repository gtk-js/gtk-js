use gtk::prelude::*;
use relm4::prelude::*;

pub struct NotebookHomogeneous;

#[relm4::component(pub)]
impl SimpleComponent for NotebookHomogeneous {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Notebook {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            append_page[Some(&gtk::Label::new(Some("Large")))] = &gtk::Box {
                set_size_request: (200, 120),
            },
            append_page[Some(&gtk::Label::new(Some("Small")))] = &gtk::Label::builder().label("Small page").build(),
            set_current_page: Some(1),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
