import { createContext, useContext } from "react";

export interface WindowControlsAPI {
  close?: () => void;
  minimize?: () => void;
  maximize?: () => void;
  drag?: () => void;
  /**
   * Decoration layout for header bars that don't set their own, e.g.
   * ":close" inside dialogs, which only offer a close button.
   */
  decorationLayout?: string;
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
