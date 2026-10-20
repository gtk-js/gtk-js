use gtk::prelude::*;
use relm4::prelude::*;

pub struct CalendarDisabled;

#[relm4::component(pub)]
impl SimpleComponent for CalendarDisabled {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Calendar {
            set_year: 2024,
            set_month: 0,
            set_day: 15,
            set_sensitive: false,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        ComponentParts { model, widgets }
    }
}
