/**
 * The elements that can take the keyboard focus: the candidates Tab moves
 * between, like the widgets gtk_widget_child_focus() visits. Callers still
 * skip the ones that can't take it now: a negative tabIndex (can-focus
 * FALSE), insensitive, inert or not shown.
 */
export const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable]:not([contenteditable="false"])';
