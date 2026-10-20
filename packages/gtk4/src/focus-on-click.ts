import type { MouseEventHandler, PointerEvent, PointerEventHandler } from "react";

export interface NoFocusOnClickHandlers<T extends Element> {
  onMouseDown: MouseEventHandler<T>;
  onPointerDown: PointerEventHandler<T>;
}

/**
 * Handlers for a widget a click doesn't focus: one with focus-on-click FALSE
 * (gtk_widget_set_focus_on_click()) or can-focus FALSE, like window controls.
 * Spread them on the widget's element, passing its own mousedown and
 * pointerdown handlers, which run after them.
 *
 * Preventing mousedown's default keeps the focus where it is, but keeps
 * Firefox from making the element :active too. So a press with the primary
 * button sets data-pressed, which gtk-css matches as :active, on the widget
 * and its ancestors until the button is released: GTK sets the active state
 * on the pressed widget and its ancestors until the release, wherever the
 * pointer goes meanwhile (set_widget_active_state() in gtkwindow.c), as
 * browsers do with :active.
 */
export function noFocusOnClick<T extends Element>(
  own: Partial<NoFocusOnClickHandlers<T>> = {},
): NoFocusOnClickHandlers<T> {
  return {
    onMouseDown(e) {
      e.preventDefault();
      own.onMouseDown?.(e);
    },
    onPointerDown(e) {
      markPressed(e);
      own.onPointerDown?.(e);
    },
  };
}

function markPressed(e: PointerEvent<Element>) {
  const view = e.currentTarget.ownerDocument.defaultView;
  if (e.button !== 0 || !view) return;
  // Insensitive widgets never get the active state (gtk_widget_set_sensitive()).
  if (e.currentTarget.closest("[data-disabled], :disabled")) return;
  // Up to the provider's root: what's above it isn't a widget.
  const root = e.currentTarget.closest("[data-gtk-provider]");
  const pressed: Element[] = [];
  for (let el: Element | null = e.currentTarget; el; el = el === root ? null : el.parentElement) {
    el.setAttribute("data-pressed", "");
    pressed.push(el);
  }
  // The release can happen anywhere, and handlers may stop its propagation.
  const done = new AbortController();
  const release = () => {
    for (const el of pressed) el.removeAttribute("data-pressed");
    done.abort();
  };
  const end = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId === e.pointerId) release();
  };
  view.addEventListener("pointerup", end, { capture: true, signal: done.signal });
  view.addEventListener("pointercancel", end, { capture: true, signal: done.signal });
  // Like a broken grab (GDK_GRAB_BROKEN): the window lost the pointer.
  view.addEventListener("blur", release, { signal: done.signal });
}
