import { type RefObject, useEffect, useRef } from "react";

/**
 * Escape for popovers and dialogs. GTK gives keys to the focused widget, and
 * a popover or dialog consumes Escape: a navigation view inside the topmost
 * dialog pops its page first, otherwise only the topmost popover or dialog
 * closes. Here, an Escape that nothing in the page handled goes to the layer
 * opened last, and widgets underneath it leave the key alone
 * (isCoveredByLayer()).
 */
interface Layer {
  element: RefObject<Element | null>;
  onEscape: () => void;
}

const layers: Layer[] = [];

function handleKeyDown(e: KeyboardEvent) {
  const top = layers.at(-1);
  if (e.key !== "Escape" || e.defaultPrevented || !top) return;
  e.preventDefault();
  top.onEscape();
}

/** Registers an open popover or dialog: Escape calls `onEscape` while it's on top. */
export function useEscapeLayer(
  open: boolean,
  element: RefObject<Element | null>,
  onEscape: () => void,
): void {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    if (!open) return;
    const layer: Layer = { element, onEscape: () => latest.current() };
    if (layers.length === 0) document.addEventListener("keydown", handleKeyDown);
    layers.push(layer);
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      if (layers.length === 0) document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, element]);
}

/**
 * Whether an open popover or dialog that doesn't contain `element` is on top,
 * so it gets the keyboard instead of `element`.
 */
export function isCoveredByLayer(element: Element): boolean {
  const top = layers.at(-1)?.element.current;
  return !!top && !top.contains(element);
}
