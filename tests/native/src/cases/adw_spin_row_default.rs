use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwSpinRowDefault;

#[relm4::component(pub)]
impl SimpleComponent for AdwSpinRowDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::ListBox {
            set_selection_mode: gtk::SelectionMode::None,
            add_css_class: "boxed-list",

            adw::SpinRow {
                set_title: "Spin Row",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let adjustment = gtk::Adjustment::new(50.0, 0.0, 100.0, 1.0, 10.0, 0.0);
        if let Some(row) = root.first_child()
            .and_then(|w| w.downcast::<adw::SpinRow>().ok()) { row.set_adjustment(Some(&adjustment)) }

        ComponentParts { model, widgets }
    }
}
