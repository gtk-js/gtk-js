import { forwardRef, type HTMLAttributes, type ReactNode, useCallback } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSearchBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether search mode is active (bar visible). Default: false. */
  searchModeEnabled?: boolean;
  /** Whether to show a close button. Default: false. */
  showCloseButton?: boolean;
  /** The search widget (typically a GtkSearchEntry). */
  child?: ReactNode;
  /** Callback when search mode should change. */
  onSearchModeChanged?: (enabled: boolean) => void;
}

/**
 * GtkSearchBar — A toolbar for search functionality.
 *
 * CSS node:
 *   searchbar
 *     └── revealer
 *         └── box
 *             ├── [child]
 *             └── [button.close]
 *
 * @see https://docs.gtk.org/gtk4/class.SearchBar.html
 */
export const GtkSearchBar = forwardRef<HTMLDivElement, GtkSearchBarProps>(function GtkSearchBar(
  {
    searchModeEnabled = false,
    showCloseButton = false,
    child,
    onSearchModeChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const CloseIcon = useIcon("WindowClose");

  const classes = ["gtk-searchbar"];
  if (className) classes.push(className);

  const handleClose = useCallback(() => {
    onSearchModeChanged?.(false);
  }, [onSearchModeChanged]);

  if (!searchModeEnabled) {
    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        style={{ display: "none" }}
        {...rest}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      role="search"
      {...rest}
    >
      <div className="gtk-revealer">
        <div className="gtk-box gtk-box-layout horizontal" style={{ gap: 6 }}>
          {child}
          {showCloseButton && (
            <button type="button" className="gtk-button flat close" onClick={handleClose}>
              <span className="gtk-image">{CloseIcon && <CloseIcon size={16} />}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
