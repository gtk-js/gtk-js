//! GtkSourceView cases. Each view is given a width: a text view asks for no
//! width but its margins (gtk_text_view_measure()).

use relm4::gtk;
use relm4::gtk::prelude::*;
use sourceview5::prelude::*;

struct Options {
    text: &'static str,
    scheme: &'static str,
    line_numbers: bool,
    current_line: bool,
    /// The line the cursor is on.
    cursor_line: i32,
    tab_width: u32,
    wrap: gtk::WrapMode,
    sensitive: bool,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            text: "int main (void)\n{\n\treturn 0;\n}",
            scheme: "classic",
            line_numbers: false,
            current_line: false,
            cursor_line: 0,
            tab_width: 8,
            wrap: gtk::WrapMode::None,
            sensitive: true,
        }
    }
}

fn view(options: Options) -> sourceview5::View {
    sourceview5::init();
    let buffer = sourceview5::Buffer::new(None);
    buffer.set_text(options.text);
    let scheme = sourceview5::StyleSchemeManager::default().scheme(options.scheme);
    buffer.set_style_scheme(scheme.as_ref());
    if let Some(iter) = buffer.iter_at_line(options.cursor_line) {
        buffer.place_cursor(&iter);
    }
    let view = sourceview5::View::with_buffer(&buffer);
    view.set_monospace(true);
    view.set_show_line_numbers(options.line_numbers);
    view.set_highlight_current_line(options.current_line);
    view.set_tab_width(options.tab_width);
    view.set_wrap_mode(options.wrap);
    view.set_sensitive(options.sensitive);
    view
}

/// The view, 200px wide, in a box; the case's target is the view.
fn in_box(view: sourceview5::View) -> (gtk::Widget, bool) {
    let parent = gtk::Box::new(gtk::Orientation::Vertical, 0);
    parent.set_halign(gtk::Align::Start);
    parent.set_valign(gtk::Align::Start);
    view.set_width_request(200);
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

pub fn default() -> (gtk::Widget, bool) {
    in_box(view(Options::default()))
}

pub fn line_numbers() -> (gtk::Widget, bool) {
    in_box(view(Options {
        scheme: "Adwaita",
        line_numbers: true,
        cursor_line: 1,
        ..Default::default()
    }))
}

pub fn current_line() -> (gtk::Widget, bool) {
    in_box(view(Options {
        scheme: "Adwaita-dark",
        line_numbers: true,
        current_line: true,
        cursor_line: 2,
        ..Default::default()
    }))
}

pub fn solarized() -> (gtk::Widget, bool) {
    in_box(view(Options {
        scheme: "solarized-light",
        line_numbers: true,
        current_line: true,
        cursor_line: 3,
        ..Default::default()
    }))
}

pub fn disabled() -> (gtk::Widget, bool) {
    in_box(view(Options {
        scheme: "Adwaita",
        line_numbers: true,
        current_line: true,
        sensitive: false,
        ..Default::default()
    }))
}

/// Three tabs and an "x" fit in 200px with tabs 4 characters wide, and
/// wrap with 8. (After a first line: a view whose one line starts with a
/// tab has no height yet when the snapshot is taken.)
pub fn tab_width() -> (gtk::Widget, bool) {
    in_box(view(Options {
        text: "tabs\n\t\t\tx",
        tab_width: 4,
        wrap: gtk::WrapMode::Char,
        ..Default::default()
    }))
}

/// A wrapped line's number is on its first row.
pub fn wrap() -> (gtk::Widget, bool) {
    in_box(view(Options {
        text: "int x = call (first argument, second argument);\nreturn x;",
        scheme: "Adwaita",
        line_numbers: true,
        wrap: gtk::WrapMode::Word,
        ..Default::default()
    }))
}

/// 120 lines take three digits; the view scrolls them with its gutter.
pub fn scrolled() -> (gtk::Widget, bool) {
    let text: &'static str = Box::leak(
        (1..=120)
            .map(|i| format!("line {i}"))
            .collect::<Vec<_>>()
            .join("\n")
            .into_boxed_str(),
    );
    let view = view(Options {
        text,
        scheme: "Adwaita",
        line_numbers: true,
        ..Default::default()
    });
    let window = gtk::ScrolledWindow::new();
    window.set_has_frame(true);
    window.set_size_request(200, 100);
    window.set_child(Some(&view));
    (window.upcast(), false)
}
