use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupHomogeneous;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupHomogeneous {
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

        // At its natural size, as the web case: the window would stretch it, and
        // without can-shrink so that it doesn't squeeze it into its ~350px either.
        let group = adw::ToggleGroup::builder()
            .halign(gtk::Align::Start)
            .homogeneous(true)
            .can_shrink(false)
            .build();
        group.add(adw::Toggle::builder().name("a").label("Short").build());
        group.add(adw::Toggle::builder().name("b").label("Medium Text").build());
        group.add(adw::Toggle::builder().name("c").label("Long Label Here").build());
        group.set_active(1);
        root.append(&group);

        ComponentParts { model, widgets }
    }
}
