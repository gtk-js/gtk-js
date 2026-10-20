use gtk::prelude::*;
use relm4::prelude::*;

pub struct HeaderbarControlsPressed;

/// The first descendant of `widget` with the CSS class `class`.
fn find_by_class(widget: &gtk::Widget, class: &str) -> Option<gtk::Widget> {
    let mut child = widget.first_child();
    while let Some(c) = child {
        if c.has_css_class(class) {
            return Some(c);
        }
        if let Some(found) = find_by_class(&c, class) {
            return Some(found);
        }
        child = c.next_sibling();
    }
    None
}

#[relm4::component(pub)]
impl SimpleComponent for HeaderbarControlsPressed {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        gtk::HeaderBar {
            set_decoration_layout: Some(":close"),
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();
        // The snapshot is taken right away, so show the pressed colors without
        // the 200ms transition to them (for the display: no other case changes
        // a window control's state).
        let provider = gtk::CssProvider::new();
        provider.load_from_string("windowcontrols > button > image { transition: none; }");
        gtk::style_context_add_provider_for_display(
            &root.display(),
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
        // The window controls make their buttons once they're in a window.
        // The close button is held down, as during a click.
        root.connect_realize(|bar| {
            if let Some(close) = find_by_class(bar.upcast_ref(), "close") {
                close.set_state_flags(gtk::StateFlags::ACTIVE, false);
            }
        });
        ComponentParts { model, widgets }
    }
}
