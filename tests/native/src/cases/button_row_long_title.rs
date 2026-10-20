use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct ButtonRowLongTitle;

#[relm4::component(pub)]
impl SimpleComponent for ButtonRowLongTitle {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",
            set_width_request: 350,

            adw::ButtonRow {
                set_title: "A very long button row title that ellipsizes at the end",
                set_start_icon_name: Some("list-add-symbolic"),
            }
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
