use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupTextDefault;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupTextDefault {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::ToggleGroup {
            set_active: 0,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let t1 = adw::Toggle::builder().name("first").label("First").build();
        root.add(t1);

        let t2 = adw::Toggle::builder().name("second").label("Second").build();
        root.add(t2);

        let t3 = adw::Toggle::builder().name("third").label("Third").build();
        root.add(t3);

        ComponentParts { model, widgets }
    }
}
