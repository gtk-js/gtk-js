import { GtkWindow, type GtkWindowProps } from "@gtk-js/gtk4";
import { forwardRef, type ReactNode } from "react";
import { type AdwBreakpoint, AdwBreakpointBin } from "./breakpoint-bin.tsx";

export interface AdwWindowProps extends Omit<GtkWindowProps, "titlebar" | "content"> {
  /** The window's content (AdwWindow:content); `children` when not set. */
  content?: ReactNode;
  /** The window's breakpoints (adw_window_add_breakpoint()); the last matching one wins. */
  breakpoints?: AdwBreakpoint[];
}

/**
 * AdwWindow — A freeform window.
 *
 * A GtkWindow (its title, window controls, maximized state, resize edges)
 * without a titlebar: the content gets the whole window. Dialogs presented in
 * it cover the window, and it applies breakpoints for its size.
 *
 * CSS node:
 *   window.background.csd
 *     └── dialog-host
 *           └── widget (AdwBreakpointBin)
 *                 └── [content]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Window.html
 * @see upstream/libadwaita/src/adw-window.c — adw_window_init()
 */
export const AdwWindow = forwardRef<HTMLDivElement, AdwWindowProps>(function AdwWindow(
  { content, breakpoints, children, ...rest },
  ref,
) {
  return (
    <GtkWindow ref={ref} {...rest}>
      <div className="gtk-dialog-host gtk-bin-layout">
        <AdwBreakpointBin className="gtk-bin-layout" breakpoints={breakpoints}>
          {content ?? children}
        </AdwBreakpointBin>
      </div>
    </GtkWindow>
  );
});
