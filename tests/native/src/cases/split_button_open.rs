use gtk::gio;
use gtk::prelude::*;
use relm4::adw;
use relm4::prelude::*;

pub struct SplitButtonOpen;

#[relm4::component(pub)]
impl SimpleComponent for SplitButtonOpen {
    type Init = ();
    type Input = ();
    type Output = ();

    // A flat split button with its menu open: the popover is a surface of its
    // own, so the split button keeps its size, and it's :checked.
    view! {
        adw::SplitButton {
            set_label: "Save",
            add_css_class: "flat",
            set_halign: gtk::Align::Start,
            set_valign: gtk::Align::Start,
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        let menu = gio::Menu::new();
        menu.append(Some("Save As…"), Some("doc.save-as"));
        menu.append(Some("Save All"), Some("doc.save-all"));
        root.set_menu_model(Some(&menu));
        let actions = gio::SimpleActionGroup::new();
        for name in ["save-as", "save-all"] {
            actions.add_action(&gio::SimpleAction::new(name, None));
        }
        root.insert_action_group("doc", Some(&actions));
        // A popover can only open once its parent is in a window.
        root.connect_map(|button| button.popup());

        ComponentParts { model, widgets }
    }
}
