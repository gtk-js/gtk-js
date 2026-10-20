use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

/// A vertical carousel stacks its pages downwards, each as tall as the
/// carousel when they expand, and shows the first.
pub struct CarouselVertical;

#[relm4::component(pub)]
impl SimpleComponent for CarouselVertical {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Carousel {
            set_orientation: gtk::Orientation::Vertical,
            set_spacing: 12,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_size_request: (240, 100),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        for i in 1..=3 {
            let page = gtk::Label::new(Some(&format!("Page {i}")));
            page.set_vexpand(true);
            root.append(&page);
        }

        ComponentParts { model, widgets }
    }
}
