use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct BannerRevealed;

#[relm4::component(pub)]
impl SimpleComponent for BannerRevealed {
    type Init = ();
    type Input = ();
    type Output = ();

    // Start-aligned, the banner gets its natural height and the larger of its
    // natural width and the width it requests.
    view! {
        adw::Banner {
            set_title: "This is a banner",
            set_revealed: true,
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
            set_width_request: 200,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
