use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupTextDefault;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupTextDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // At its natural size, as the web case: the window would stretch it.
        let group = adw::ToggleGroup::builder().halign(gtk::Align::Start).build();
        group.add(adw::Toggle::builder().name("first").label("First").build());
        group.add(adw::Toggle::builder().name("second").label("Second").build());
        group.add(adw::Toggle::builder().name("third").label("Third").build());
        group.set_active(0);
        root.append(&group);

        ComponentParts { model, widgets }
    }
}
