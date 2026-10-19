use gtk::prelude::*;
use relm4::prelude::*;

pub struct OverlayMeasure;

const LONG: &str = "A much longer overlay label";

#[relm4::component(pub)]
impl SimpleComponent for OverlayMeasure {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::Box {
            set_orientation: gtk::Orientation::Vertical,
            set_spacing: 12,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let label = |halign, valign| {
            gtk::Label::builder()
                .label(LONG)
                .halign(halign)
                .valign(valign)
                .build()
        };

        // Overlays without measure: the overlay is as big as its child.
        let unmeasured = gtk::Overlay::builder().halign(gtk::Align::Start).build();
        unmeasured.set_child(Some(&gtk::Button::with_label("Main")));
        unmeasured.add_overlay(&label(gtk::Align::Start, gtk::Align::Start));
        let end = label(gtk::Align::End, gtk::Align::End);
        unmeasured.add_overlay(&end);
        unmeasured.set_clip_overlay(&end, true);
        root.append(&unmeasured);

        // An overlay with measure sizes the overlay like the child.
        let measured = gtk::Overlay::builder().halign(gtk::Align::Start).build();
        measured.set_child(Some(&gtk::Button::with_label("Main")));
        let overlay = label(gtk::Align::Start, gtk::Align::Start);
        measured.add_overlay(&overlay);
        measured.set_measure_overlay(&overlay, true);
        root.append(&measured);

        ComponentParts { model, widgets }
    }
}
