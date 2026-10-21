use relm4::gtk;
use relm4::gtk::prelude::*;

/// Wrapped paragraphs of several rows, one, three and none: Pango rounds each
/// paragraph's height (gtk_text_layout_get_line_display()), not each row's.
pub fn wrap() -> (gtk::Widget, bool) {
    let parent = gtk::Box::new(gtk::Orientation::Vertical, 0);
    parent.set_halign(gtk::Align::Start);
    parent.set_valign(gtk::Align::Start);
    let text = "Pango rounds each paragraph to whole pixels, not each row of it, so a paragraph that wraps onto several rows can be a pixel taller than its rows rounded one by one.\none\nThe third paragraph wraps onto a few rows as well.\n";
    let view = gtk::TextView::builder()
        .buffer(&gtk::TextBuffer::builder().text(text).build())
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

/// Words broken by character and word-character wrapping, in the monospace
/// and the proportional font: Pango breaks a row inside a word with a hyphen
/// (break_inserts_hyphen), and not after a space or a hyphen, between words
/// and punctuation, or in digits.
pub const WORDS: &str = "The quick brown fox jumps over the lazy dog; extraordinarily long words like incomprehensibilities wrap.\nshort\n\tindented text-with-hyphens and_underscores 12345678901234567890123 end";

pub fn words() -> (gtk::Widget, bool) {
    let parent = gtk::Box::new(gtk::Orientation::Vertical, 12);
    parent.set_halign(gtk::Align::Start);
    parent.set_valign(gtk::Align::Start);
    for (monospace, wrap) in [
        (true, gtk::WrapMode::Char),
        (true, gtk::WrapMode::WordChar),
        (false, gtk::WrapMode::Char),
        (false, gtk::WrapMode::WordChar),
    ] {
        let view = gtk::TextView::builder()
            .buffer(&gtk::TextBuffer::builder().text(WORDS).build())
            .monospace(monospace)
            .wrap_mode(wrap)
            .width_request(200)
            .build();
        parent.append(&view);
    }
    let widget = parent.clone();
    gtk::glib::idle_add_local_once(move || {
        let allocation = gtk::Allocation::new(0, 0, widget.width(), widget.height());
        widget.size_allocate(&allocation, -1);
    });
    (parent.upcast(), false)
}
