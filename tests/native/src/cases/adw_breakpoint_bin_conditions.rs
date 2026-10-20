use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwBreakpointBinConditions;

#[relm4::component(pub)]
impl SimpleComponent for AdwBreakpointBinConditions {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::BreakpointBin {
            set_size_request: (450, 100),

            #[wrap(Some)]
            set_child = &gtk::Label {
                set_label: "Breakpoint content",
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        // The last added breakpoint that matches wins: 400pt is 533px, so the
        // first one applies, and the second one doesn't.
        for (condition, opacity) in [
            ("max-width: 400pt", 0.5),
            ("(max-width: 300px) and (max-height: 100px)", 0.2),
        ] {
            let condition = adw::BreakpointCondition::parse(condition).expect("valid condition");
            let breakpoint = adw::Breakpoint::new(condition);
            breakpoint.add_setter(&root, "opacity", Some(&opacity.to_value()));
            root.add_breakpoint(breakpoint);
        }

        ComponentParts { model, widgets }
    }
}
