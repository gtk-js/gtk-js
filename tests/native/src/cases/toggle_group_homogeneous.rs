use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupHomogeneous;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupHomogeneous {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::ToggleGroup {
            set_active: 1,
            set_homogeneous: true,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let t1 = adw::Toggle::builder().name("a").label("Short").build();
        root.add(t1);

        let t2 = adw::Toggle::builder().name("b").label("Medium Text").build();
        root.add(t2);

        let t3 = adw::Toggle::builder().name("c").label("Long Label Here").build();
        root.add(t3);

        ComponentParts { model, widgets }
    }
}
