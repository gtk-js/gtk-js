use gtk::prelude::*;
use relm4::prelude::*;

pub struct NotebookScrollable;

#[relm4::component(pub)]
impl SimpleComponent for NotebookScrollable {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Notebook {
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_size_request: (242, -1),
            set_scrollable: true,
            append_page[Some(&gtk::Label::new(Some("Alpha")))] = &gtk::Label::builder().label("Alpha content").build(),
            append_page[Some(&gtk::Label::new(Some("Beta")))] = &gtk::Label::builder().label("Beta content").build(),
            append_page[Some(&gtk::Label::new(Some("Gamma")))] = &gtk::Label::builder().label("Gamma content").build(),
            append_page[Some(&gtk::Label::new(Some("Delta")))] = &gtk::Label::builder().label("Delta content").build(),
            append_page[Some(&gtk::Label::new(Some("Epsilon")))] = &gtk::Label::builder().label("Epsilon content").build(),
            append_page[Some(&gtk::Label::new(Some("Zeta")))] = &gtk::Label::builder().label("Zeta content").build(),
            append_page[Some(&gtk::Label::new(Some("Eta")))] = &gtk::Label::builder().label("Eta content").build(),
            append_page[Some(&gtk::Label::new(Some("Theta")))] = &gtk::Label::builder().label("Theta content").build(),
            set_current_page: Some(5),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
