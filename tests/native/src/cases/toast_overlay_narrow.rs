use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ToastOverlayNarrow;

#[relm4::component(pub)]
impl SimpleComponent for ToastOverlayNarrow {
    type Init = ();
    type Input = ();
    type Output = ();

    // AdwWindow is at least 360px wide, so a clamp narrows the overlay to 300px.
    view! {
        adw::Clamp {
            set_maximum_size: 300,
            set_tightening_threshold: 300,
            set_valign: gtk::Align::Start,

            #[name = "overlay"]
            adw::ToastOverlay {
                gtk::Label {
                    set_label: "Content under toasts",
                    set_valign: gtk::Align::Start,
                },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        // Added before the overlay is mapped, so it shows without animating.
        let toast = adw::Toast::new("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt");
        toast.set_timeout(0);
        widgets.overlay.add_toast(toast);
        ComponentParts { model, widgets }
    }
}
