use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

/// Pages that don't expand get the largest child's natural width: the current
/// one is centered and the next one shows beside it, `spacing` apart.
pub struct CarouselNaturalPages;

#[relm4::component(pub)]
impl SimpleComponent for CarouselNaturalPages {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Carousel {
            set_spacing: 12,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_size_request: (300, 100),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        for width in [100, 80, 60] {
            let page = gtk::Box::new(gtk::Orientation::Vertical, 0);
            page.set_size_request(width, -1);
            root.append(&page);
        }

        ComponentParts { model, widgets }
    }
}
