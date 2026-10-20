use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwActionRowSubtitleOnly;

#[relm4::component(pub)]
impl SimpleComponent for AdwActionRowSubtitleOnly {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::ActionRow {
                set_title: "",
                set_subtitle: "Only a subtitle",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
