use gtk::prelude::*;
use relm4::prelude::*;

pub struct ToggleGrouped;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGrouped {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            add_css_class: "linked",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,

            #[name = "one"]
            gtk::ToggleButton {
                set_label: "One",
            },
            #[name = "two"]
            gtk::ToggleButton {
                set_label: "Two",
            },
            #[name = "three"]
            gtk::ToggleButton {
                set_label: "Three",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // Grouped toggles are exclusive, and clicking the active one keeps it
        // active: clicking One, Two, Two leaves Two active.
        widgets.two.set_group(Some(&widgets.one));
        widgets.three.set_group(Some(&widgets.one));
        widgets.one.emit_clicked();
        widgets.two.emit_clicked();
        widgets.two.emit_clicked();

        ComponentParts { model, widgets }
    }
}
