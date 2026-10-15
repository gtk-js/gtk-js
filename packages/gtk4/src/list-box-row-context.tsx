import {
  cloneElement,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

/**
 * A container that puts its GtkListBoxRows apart from its other children, like
 * GTK_IS_LIST_BOX_ROW() lets it natively: AdwPreferencesGroup puts rows in its
 * list and other widgets below it.
 *
 * Every component that renders a row does so through {@link useListBoxRow},
 * which also works when an app component wraps the row. In such a container,
 * the row is portaled into `list` and a `<template data-gtk-row>` marker is left
 * where it was rendered: the row is never moved between containers (which
 * would remount it), and the container puts the rows in the order of their
 * markers. Rows and GtkListBox give their own children no container.
 *
 * A server render has no DOM to portal into: rows render in place there, and
 * hydrate in place before they move into the list.
 */
export interface GtkRowContainer {
  /** Where the rows go; null until the container has mounted. */
  list: HTMLElement | null;
}

export const GtkListBoxRowContext = createContext<GtkRowContainer | null>(null);

const subscribeNever = () => () => {};

/** Places the calling component's row in the enclosing container: wrap what it renders. */
export function useListBoxRow(): (row: ReactElement) => ReactNode {
  const container = useContext(GtkListBoxRowContext);
  const id = useId();
  // False on the server and while hydrating.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  return (row) => {
    if (!container || !hydrated) return row;
    return (
      <>
        <template data-gtk-row={id} />
        {container.list &&
          createPortal(
            <GtkListBoxRowContext.Provider value={null}>
              {cloneElement(row as ReactElement<Record<string, unknown>>, { "data-gtk-row": id })}
            </GtkListBoxRowContext.Provider>,
            container.list,
          )}
      </>
    );
  };
}

/**
 * Keeps a container's rows in the order of their markers in `root`. Rows join
 * the list in the order they mount, and a row's marker moves without the row
 * when its component does. Returns the cleanup.
 */
export function orderRows(list: HTMLElement, root: HTMLElement): () => void {
  const order = () => {
    const rows = new Map<string, Element>();
    for (const row of list.children) {
      const id = row.getAttribute("data-gtk-row");
      if (id) rows.set(id, row);
    }
    let next = list.firstElementChild;
    for (const marker of root.querySelectorAll("template[data-gtk-row]")) {
      const row = rows.get(marker.getAttribute("data-gtk-row") ?? "");
      if (!row) continue;
      if (row === next) {
        next = row.nextElementSibling;
        continue;
      }
      // Moving an element blurs it in most browsers.
      const focused = row.contains(document.activeElement) ? document.activeElement : null;
      list.insertBefore(row, next);
      if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    }
  };
  order();
  const observer = new MutationObserver(order);
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
