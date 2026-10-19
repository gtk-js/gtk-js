use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupIcon;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupIcon {
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

        let t1 = adw::Toggle::builder().name("list").icon_name("view-list-symbolic").build();
        root.add(t1);

        let t2 = adw::Toggle::builder().name("grid").icon_name("view-grid-symbolic").build();
        root.add(t2);

        ComponentParts { model, widgets }
    }
}
