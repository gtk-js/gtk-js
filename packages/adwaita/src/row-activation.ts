import type { KeyboardEvent, MouseEvent } from "react";

/**
 * Widgets that claim a click in their own gestures: buttons, check buttons,
 * switches, text, ranges. A claim denies GtkListBox's gesture, so the row they
 * are in isn't activated (gtk_list_box_click_gesture_released() never runs).
 */
const CLAIMS =
  "button, input, textarea, select, a[href], [contenteditable='true'], " +
  ["button", "checkbox", "radio", "switch", "slider", "spinbutton", "textbox", "combobox", "link"]
    .map((role) => `[role='${role}']`)
    .join(", ");

/**
 * Whether a widget in the row claimed the click, so it doesn't activate the
 * row. A selectable label claims it to select its text
 * (gtk_label_click_gesture_pressed()). A click outside the row's own nodes,
 * like in a popover its widgets portal, never reaches the row natively.
 */
export function clickClaimed(e: MouseEvent<HTMLElement>): boolean {
  const row = e.currentTarget;
  if (!(e.target instanceof Element) || !row.contains(e.target)) return true;
  for (let el: Element | null = e.target; el && el !== row; el = el.parentElement) {
    if (el.matches(CLAIMS)) return true;
    if (el.classList.contains("gtk-label") && getComputedStyle(el).userSelect === "text") {
      return true;
    }
  }
  return false;
}

/** Enter or Space on the focused row itself: GtkWindow's activate-focus bindings. */
export function isActivationKey(e: KeyboardEvent<HTMLElement>): boolean {
  return e.target === e.currentTarget && (e.key === "Enter" || e.key === " ");
}

/**
 * Whether the row is in a GtkListBox, which handles Enter and Space on it: the
 * list then activates the row (gtk_list_box_activate()) and emits
 * row-activated, which it doesn't do for a key the row took. The lists of
 * AdwPreferencesGroup and AdwExpanderRow aren't GtkListBoxes here.
 */
export function inListBox(row: HTMLElement): boolean {
  return !!row.parentElement?.matches(".gtk-list[role='list']:not(.gtk-preferencesgroup-list)");
}

const FOCUSES =
  "input:not([type='checkbox'], [type='radio']), textarea, [contenteditable='true'], " +
  "[role='textbox'], [role='slider']";
const ACTIVATES =
  "button, a[href], [role='button'], [role='checkbox'], [role='radio'], [role='switch'], [role='link']";

/** Whether a widget is insensitive (GtkWidget:sensitive is false). */
export function isInsensitive(widget: Element): boolean {
  return widget.matches(":disabled, [data-disabled], [aria-disabled='true']");
}

/**
 * Like gtk_widget_mnemonic_activate(): activates a widget that has an activate
 * signal (buttons, check buttons, switches) and focuses one that hasn't
 * (entries, scales). A widget whose node wraps the one taking input, like a
 * menu button or spin button, passes it on.
 */
export function mnemonicActivate(widget: HTMLElement) {
  const takesInput = `${FOCUSES}, ${ACTIVATES}`;
  const target = widget.matches(takesInput)
    ? widget
    : (widget.querySelector<HTMLElement>(takesInput) ?? widget);
  if (target.matches(FOCUSES)) target.focus();
  else target.click();
}
