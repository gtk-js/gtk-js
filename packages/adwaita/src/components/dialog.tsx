import { WindowControlsContext } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import type { AdwDialogPresentationMode } from "../types.ts";
import { FloatingSheet } from "./floating-sheet.tsx";
import { HeaderBarTitleContext } from "./header-bar-title.ts";

export interface AdwDialogProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  child?: ReactNode;
  visible?: boolean;
  canClose?: boolean;
  presentationMode?: AdwDialogPresentationMode;
  contentWidth?: number;
  contentHeight?: number;
  followsContentSize?: boolean;
  portal?: boolean | HTMLElement;
  onClosed?: () => void;
  onCloseAttempt?: () => void;
  /**
   * Called once the close animation finished and the dialog is gone, like
   * when upstream removes the dialog after "closed". A dialog that's kept
   * around to be shown again resets its content here, not on close, so it
   * doesn't change while it animates out.
   */
  onHidden?: () => void;
}

/**
 * AdwDialog — An adaptive dialog (floating on desktop, bottom-sheet on mobile).
 *
 * Upstream CSS node name: "dialog" (mapped to .gtk-dialog)
 * Layout manager: GTK_TYPE_BIN_LAYOUT
 *
 * Native structure (floating mode):
 *   dialog-host > dialog.background[.floating] > floating-sheet > dimming
 *                                                                > sheet > child
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Dialog.html
 */
export const AdwDialog = forwardRef<HTMLDivElement, AdwDialogProps>(function AdwDialog(
  {
    title,
    child,
    visible = false,
    canClose = true,
    presentationMode = "auto",
    contentWidth = -1,
    contentHeight = -1,
    followsContentSize = false,
    portal = false,
    onClosed,
    onCloseAttempt,
    onHidden,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const close = useCallback(() => {
    if (!canClose) {
      onCloseAttempt?.();
      return;
    }
    onClosed?.();
  }, [canClose, onClosed, onCloseAttempt]);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, close]);

  // Header bars inside a dialog only get a close button, which closes the dialog.
  const controls = useMemo(
    () => ({ close: canClose ? close : undefined, decorationLayout: canClose ? ":close" : ":" }),
    [canClose, close],
  );

  // Upstream: presentation mode determines "floating" vs "bottom-sheet" CSS class.
  // "auto" defaults to floating on desktop.
  const modeClass = presentationMode === "bottom-sheet" ? "bottom-sheet" : "floating";

  const sheetStyle: React.CSSProperties = {
    width: contentWidth > 0 ? contentWidth : undefined,
    height: contentHeight > 0 ? contentHeight : undefined,
    maxWidth: "calc(100% - 24px)",
    maxHeight: "calc(100% - 24px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...style,
  };

  return (
    <FloatingSheet
      ref={ref}
      open={visible}
      dialogClasses={["background", modeClass]}
      className={className}
      sheetStyle={sheetStyle}
      onDimmingClick={close}
      onCloseAnimationDone={onHidden}
      portal={portal}
      aria-label={title}
      {...rest}
    >
      <WindowControlsContext.Provider value={controls}>
        <HeaderBarTitleContext.Provider value={title ?? ""}>
          {child ?? children}
        </HeaderBarTitleContext.Provider>
      </WindowControlsContext.Provider>
    </FloatingSheet>
  );
});
