import {
  cloneElement,
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
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
 * markers. Rows and GtkListBox give their own children no container: a
 * GtkListBox tells its rows their state through {@link GtkListBoxSlotContext}.
 *
 * A server render has no DOM to portal into: there the container renders its
 * children in its list, where its rows render in place (see
 * {@link useRowContainer}).
 */
export interface GtkRowContainer {
  /**
   * Where the rows go; null when they render in place, in the container's list.
   * Have it from the container's first render, so the rows are in it when the
   * container's parents first measure it.
   */
  list: HTMLElement | null;
}

export const GtkListBoxRowContext = createContext<GtkRowContainer | null>(null);

/**
 * What a GtkListBox tells the row of each of its children, like
 * gtk_list_box_update_row(). Rows get it through {@link useListBoxRow}, so a
 * row that an app component renders gets it too.
 */
export interface GtkListBoxSlot {
  /** The row's index in the list. */
  index: number;
  /** Whether the list can select the row: it's selectable and the list's selection mode isn't "none". */
  canSelect: boolean;
  selected: boolean;
  /** Whether the list is insensitive, which makes its rows insensitive too. */
  disabled: boolean;
}

export const GtkListBoxSlotContext = createContext<GtkListBoxSlot | null>(null);

/**
 * Makes a row the list's row for its slot. A row component puts .activatable
 * on its row when the row is activatable (GtkListBoxRow:activatable); a row the
 * list can select gets it too, and only such a row exposes its selected state
 * (gtk_list_box_update_row()). Rows inside the row aren't the list's.
 */
function slotRow(row: ReactElement, slot: GtkListBoxSlot): ReactNode {
  const { className = "" } = row.props as { className?: string };
  const activatable = className.split(/\s+/).includes("activatable");
  return (
    <GtkListBoxSlotContext.Provider value={null}>
      {cloneElement(row as ReactElement<Record<string, unknown>>, {
        className: activatable || !slot.canSelect ? className : `${className} activatable`,
        "aria-selected": slot.canSelect ? slot.selected : undefined,
        "data-gtk-row-index": slot.index,
        "data-gtk-activatable": activatable || undefined,
        ...(slot.disabled && { "aria-disabled": true, "data-disabled": true }),
      })}
    </GtkListBoxSlotContext.Provider>
  );
}

/** Places the calling component's row in the enclosing container: wrap what it renders. */
export function useListBoxRow(): (row: ReactElement) => ReactNode {
  const container = useContext(GtkListBoxRowContext);
  const slot = useContext(GtkListBoxSlotContext);
  const id = useId();
  return (row) => {
    if (!container) return slot ? slotRow(row, slot) : row;
    const marked = (
      <GtkListBoxRowContext.Provider value={null}>
        <GtkListBoxSlotContext.Provider value={null}>
          {cloneElement(row as ReactElement<Record<string, unknown>>, { "data-gtk-row": id })}
        </GtkListBoxSlotContext.Provider>
      </GtkListBoxRowContext.Provider>
    );
    if (!container.list) return marked;
    return (
      <>
        <template data-gtk-row={id} />
        {createPortal(marked, container.list)}
      </>
    );
  };
}

const subscribeNever = () => () => {};

/** Whether everything in `list` is a row that useListBoxRow placed there. */
function onlyRows(list: HTMLElement): boolean {
  for (const node of list.childNodes) {
    if (node instanceof Element ? !node.hasAttribute("data-gtk-row") : node instanceof Text)
      return false;
  }
  return true;
}

/**
 * The {@link GtkRowContainer} of a container that renders its children in
 * `root`, its list first. When `rendersList` is true, the container renders
 * that list itself, as `ownList`: with its children in it while `list` is null.
 *
 * A client render's list is there from its first render, outside React: the
 * hook puts it at the start of `root`, with `className`, and the container
 * renders its children after it. A server render has none: the container
 * renders its own list with its children in it, so the rows are in place in
 * the server's HTML, and stay there when it hydrates. Its own list becomes
 * `list`, and its children move after it, once something that isn't a row
 * renders in it.
 */
export function useRowContainer(
  root: RefObject<HTMLElement | null>,
  ownList: RefObject<HTMLElement | null>,
  className: string,
): { container: GtkRowContainer; rendersList: boolean } {
  // True on the server and while hydrating.
  const serverRender = useSyncExternalStore(
    subscribeNever,
    () => false,
    () => true,
  );
  const [created] = useState(() => (serverRender ? null : document.createElement("div")));
  const [adopted, setAdopted] = useState<HTMLElement | null>(null);
  const list = created ?? adopted;

  useLayoutEffect(() => {
    const box = root.current;
    if (!created || !box) return;
    created.setAttribute("role", "list");
    box.prepend(created);
    return () => created.remove();
  }, [created, root]);
  useLayoutEffect(() => {
    if (created) created.className = className;
  }, [created, className]);
  useLayoutEffect(() => {
    const box = root.current;
    if (list && box) return orderRows(list, box);
  }, [list, root]);
  // After every render, and when a child renders something else.
  useLayoutEffect(() => {
    const own = ownList.current;
    if (list || !own) return;
    const check = () => {
      if (!onlyRows(own)) setAdopted(own);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(own, { childList: true });
    return () => observer.disconnect();
  });

  const container = useMemo(() => ({ list }), [list]);
  return { container, rendersList: !created };
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
