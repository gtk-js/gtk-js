use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupFill;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupFill {
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

        // 300px wide: the toggles share the extra width.
        let group = adw::ToggleGroup::builder()
            .halign(gtk::Align::Start)
            .width_request(300)
            .build();
        group.add(adw::Toggle::builder().name("list").label("List").build());
        group.add(adw::Toggle::builder().name("grid").label("Grid").build());
        group.add(adw::Toggle::builder().name("compact").label("Compact").build());
        group.set_active(1);
        root.append(&group);

        ComponentParts { model, widgets }
    }
}
