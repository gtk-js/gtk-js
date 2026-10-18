import { GtkPopover, GtkPopoverMenu, useIcons } from "@gtk-js/gtk4";
import { useLayoutEffect, useRef, useState } from "react";
import { type NavigationHistoryEntry, useNavigation } from "./navigation-view.tsx";

/** gtk-long-press-time: holding a press this long opens the menu. */
const LONG_PRESS_MS = 500;
/** gtk-dnd-drag-threshold: moving further cancels the long press. */
const DRAG_THRESHOLD = 8;

/**
 * AdwBackButton — the back button AdwHeaderBar shows on navigation pages.
 *
 * Pops the page. Its menu (right-click, long press, Shift+F10 or Menu) pops
 * to any page below, across nested navigation views.
 *
 * CSS node:
 *   widget
 *     └── button.image-button.back
 *
 * @see upstream/libadwaita/src/adw-back-button.c
 */
export function AdwBackButton() {
  const nav = useNavigation();
  const icons = useIcons();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // The menu's pages while it's open (create_navigation_menu()).
  const [history, setHistory] = useState<NavigationHistoryEntry[] | null>(null);
  const press = useRef<{ id: number; x: number; y: number; timer: number } | null>(null);
  const longPressed = useRef(false);

  // GTK picks go-previous-symbolic-rtl for an RTL widget.
  const [rtl, setRtl] = useState(false);
  useLayoutEffect(() => {
    if (rootRef.current) setRtl(getComputedStyle(rootRef.current).direction === "rtl");
  });

  const open = () => setHistory(nav.history?.() ?? []);
  const close = () => {
    // A popover closing with the focus in it gives it back, as in GTK.
    if (popoverRef.current?.contains(document.activeElement))
      buttonRef.current?.focus({ preventScroll: true });
    setHistory(null);
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const Icon = (rtl && icons.GoPreviousSymbolicRtl) || icons.GoPrevious;
  if (!nav.canPop || !Icon) return null;

  return (
    <div ref={rootRef} className="gtk-widget gtk-bin-layout">
      <button
        ref={buttonRef}
        className="gtk-button image-button back"
        type="button"
        aria-label="Back"
        aria-haspopup="menu"
        title={nav.previousTitle || "Back"}
        // :checked while the menu is open (open_navigation_menu()).
        data-checked={history ? true : undefined}
        onClick={() => {
          // A long press opened the menu instead; a click while it's open
          // only closes it.
          if (longPressed.current || history) {
            longPressed.current = false;
            close();
            return;
          }
          nav.pop();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          open();
        }}
        onKeyDown={(e) => {
          const modifiers = e.altKey || e.ctrlKey || e.metaKey;
          if (
            (e.key === "F10" && e.shiftKey && !modifiers) ||
            (e.key === "ContextMenu" && !modifiers && !e.shiftKey)
          ) {
            e.preventDefault();
            open();
          }
        }}
        onPointerDown={(e) => {
          // Not a window drag.
          e.stopPropagation();
          cancelPress();
          longPressed.current = false;
          if (e.button !== 0) return;
          const timer = window.setTimeout(() => {
            press.current = null;
            longPressed.current = true;
            open();
          }, LONG_PRESS_MS);
          press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, timer };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (
            p?.id === e.pointerId &&
            Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_THRESHOLD
          )
            cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
      >
        <span className="gtk-image">
          <Icon size={16} />
        </span>
      </button>
      {history && (
        <GtkPopover
          ref={popoverRef}
          visible
          hasArrow={false}
          halign="start"
          anchorRef={rootRef}
          pointingTo={rootRef}
          onClosed={close}
          className="menu"
        >
          <GtkPopoverMenu
            model={[
              history.map((entry) => ({
                label: entry.title,
                onActivate: () => {
                  close();
                  entry.popTo();
                },
              })),
            ]}
          />
        </GtkPopover>
      )}
    </div>
  );
}
