import { createContext, useContext, useLayoutEffect } from "react";

/**
 * Lets a container tell GtkListBoxRows from its other children, like
 * GTK_IS_LIST_BOX_ROW() does natively (AdwPreferencesGroup puts rows in its
 * list and other widgets below it, for example).
 *
 * The container gives each child a registration function; every component
 * that renders a row calls it through {@link useListBoxRow}, which also works
 * when an app component wraps the row. Registering returns its own undo.
 */
export const GtkListBoxRowContext = createContext<(() => () => void) | null>(null);

/** Registers the calling component as a row with the enclosing container. */
export function useListBoxRow(): void {
  const register = useContext(GtkListBoxRowContext);
  useLayoutEffect(() => register?.(), [register]);
}
