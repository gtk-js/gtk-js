use relm4::adw;
use relm4::adw::prelude::*;
use relm4::prelude::*;

pub struct AdwExpanderRowWidgets;

#[relm4::component(pub)]
impl SimpleComponent for AdwExpanderRowWidgets {
    type Init = ();
    type Input = ();
    type Output = ();

    view! {
        adw::Clamp {
            set_maximum_size: 360,
            set_tightening_threshold: 360,
            set_width_request: 360,

            gtk::ListBox {
                set_selection_mode: gtk::SelectionMode::None,
                add_css_class: "boxed-list",

                adw::ExpanderRow {
                    set_title: "A very long expander row title that should be ellipsized after one line",
                    set_subtitle: "A very long subtitle that should also be ellipsized after one line",
                    set_title_lines: 1,
                    set_subtitle_lines: 1,
                    set_show_enable_switch: true,
                },
            },
        }
    }

    fn init(_: (), root: Self::Root, _sender: ComponentSender<Self>) -> ComponentParts<Self> {
        let model = Self;
        let widgets = view_output!();

        if let Some(row) = root
            .child()
            .and_then(|list| list.first_child())
            .and_then(|w| w.downcast::<adw::ExpanderRow>().ok())
        {
            row.add_prefix(&gtk::Image::from_icon_name("edit-find-symbolic"));
            row.add_prefix(&gtk::Image::from_icon_name("edit-find-symbolic"));
            let button = gtk::Button::from_icon_name("edit-delete-symbolic");
            button.add_css_class("flat");
            button.set_valign(gtk::Align::Center);
            row.add_suffix(&button);
            row.add_row(&adw::ActionRow::builder().title("Child Row").build());
        }

        ComponentParts { model, widgets }
    }
}
