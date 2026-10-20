use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct ToggleGroupCanShrink;

#[relm4::component(pub)]
impl SimpleComponent for ToggleGroupCanShrink {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Clamp {
            set_maximum_size: 120,
            set_tightening_threshold: 120,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // 120px wide, narrower than its natural width: the labels ellipsize.
        let group = adw::ToggleGroup::builder().valign(gtk::Align::Start).build();
        group.add(adw::Toggle::builder().name("overview").label("Overview").build());
        group.add(adw::Toggle::builder().name("statistics").label("Statistics").build());
        group.set_active(0);
        root.set_child(Some(&group));

        ComponentParts { model, widgets }
    }
}
