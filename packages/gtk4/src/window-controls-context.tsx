import { createContext, type PointerEvent, useContext } from "react";

/**
 * The enclosing window's actions and state, which GtkWindowControls and
 * GtkWindowHandle find on their root GtkWindow.
 */
export interface WindowControlsAPI {
  /** The window.close action. */
  close?: () => void;
  /** The window.minimize action. */
  minimize?: () => void;
  /** The window.toggle-maximized action. */
  maximize?: () => void;
  /**
   * Starts moving the window, like gdk_toplevel_begin_move(): called once a
   * press on a window handle passes the drag threshold, with the pointer move
   * that passed it.
   */
  drag?: (event: PointerEvent<HTMLDivElement>) => void;
  /**
   * Decoration layout for header bars that don't set their own, e.g.
   * ":close" inside dialogs, which only offer a close button.
   */
  decorationLayout?: string;
  /** Whether the window is maximized (GtkWindow:maximized). */
  maximized?: boolean;
  /** The window's title (GtkWindow:title), shown by header bars without a title widget. */
  title?: string;
}

export const WindowControlsContext = createContext<WindowControlsAPI | undefined>(undefined);

export function useWindowControls(): WindowControlsAPI | undefined {
  return useContext(WindowControlsContext);
}

/**
 * The element of the enclosing GtkWindow. Window-modal surfaces (AdwDialog,
 * like upstream's AdwDialogHost) portal into it so they cover exactly the
 * window, clipped to its rounded corners.
 */
export const WindowElementContext = createContext<HTMLElement | null>(null);

export function useWindowElement(): HTMLElement | null {
  return useContext(WindowElementContext);
}
