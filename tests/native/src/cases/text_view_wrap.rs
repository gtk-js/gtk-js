use relm4::gtk;
use relm4::gtk::prelude::*;

/// Wrapped paragraphs of eight rows, one, three and none: Pango rounds each
/// paragraph's height (gtk_text_layout_get_line_display()), not each row's.
pub fn wrap() -> (gtk::Widget, bool) {
    let parent = gtk::Box::new(gtk::Orientation::Vertical, 0);
    parent.set_halign(gtk::Align::Start);
    parent.set_valign(gtk::Align::Start);
    let text = format!("{}\none\n{}\n", "0123456789".repeat(17), "9876543210".repeat(6));
    let view = gtk::TextView::builder()
        .buffer(&gtk::TextBuffer::builder().text(text.as_str()).build())
        .monospace(true)
        .wrap_mode(gtk::WrapMode::Char)
        .width_request(200)
        .build();
    parent.append(&view);
    // The text view measures its text in an idle after its first allocation
    // (first_validate_callback()); allocate again, as the next frame would.
    let widget = parent.clone();
    gtk::glib::idle_add_local_once(move || {
        let allocation = gtk::Allocation::new(0, 0, widget.width(), widget.height());
        widget.size_allocate(&allocation, -1);
    });
    (parent.upcast(), true)
}
