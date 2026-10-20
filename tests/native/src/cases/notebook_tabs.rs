use gtk::prelude::*;
use relm4::prelude::*;

pub struct NotebookTabs;

#[relm4::component(pub)]
impl SimpleComponent for NotebookTabs {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Notebook {
            append_page[Some(&gtk::Label::new(Some("One")))] = &gtk::Label::builder().label("Page 1").build(),
            append_page[Some(&gtk::Label::new(Some("Two")))] = &gtk::Label::builder().label("Page 2").build(),
            append_page[Some(&gtk::Label::new(Some("Three")))] = &gtk::Label::builder().label("Page 3").build(),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
