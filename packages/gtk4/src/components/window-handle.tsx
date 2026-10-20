import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { useWindowControls } from "../window-controls-context.tsx";
import { GtkPopover } from "./popover.tsx";
import { type GtkMenuModel, GtkPopoverMenu, PopoverMenuCloseProvider } from "./popover-menu.tsx";

export interface GtkWindowHandleProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  children?: ReactNode;
}

/**
 * Widgets that claim a primary press with a gesture of their own, so the
 * window handle doesn't act on it. Popovers and dialogs are surfaces of their
 * own. The same list is no-drag in reset.css.
 */
const CLAIMS_PRESS = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  ".gtk-checkbutton",
  ".gtk-dialog",
  ".gtk-entry",
  ".gtk-menubutton",
  ".gtk-popover",
  ".gtk-scale",
  ".gtk-spinbutton",
  ".gtk-switch",
].join(", ");

/**
 * Widgets with a secondary-click action of their own: text has a context
 * menu, so does a link. Buttons only take the primary button, so a right click
 * on them opens the window menu.
 */
const CLAIMS_SECONDARY =
  'a[href], input, textarea, [contenteditable="true"], .gtk-dialog, .gtk-entry, .gtk-popover';

/** gtk-dnd-drag-threshold. */
const DRAG_THRESHOLD = 8;

/**
 * Whether a press on `target` is the handle's own: no widget inside it claims
 * the press, and no window handle nested in it is closer.
 */
function isOwnPress(handle: Element, target: EventTarget, claims: string): boolean {
  return target instanceof Element && target.closest(`${claims}, .gtk-windowhandle`) === handle;
}

/**
 * GtkWindowHandle — Moves the window when dragged, like a title bar. It acts
 * on the enclosing GtkWindow (WindowControlsContext), only for presses no
 * child claims:
 *   - a primary press dragged past the drag threshold starts a window move
 *     (`drag`); a second press never does;
 *   - a primary double click toggles maximization (gtk-titlebar-double-click
 *     = toggle-maximize);
 *   - a secondary click opens the window menu: Restore, Minimize, Maximize,
 *     Close (gtk-titlebar-right-click = menu, with GTK's fallback menu).
 *
 * CSS node: windowhandle (BinLayout)
 *
 * @see https://docs.gtk.org/gtk4/class.WindowHandle.html
 * @see upstream/gtk/gtk/gtkwindowhandle.c
 */
export const GtkWindowHandle = forwardRef<HTMLDivElement, GtkWindowHandleProps>(
  function GtkWindowHandle(
    {
      children,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onMouseDown,
      onContextMenu,
      ...rest
    },
    ref,
  ) {
    const controls = useWindowControls();
    // The press the drag gesture follows, until it passes the threshold.
    const press = useRef<{ pointerId: number; x: number; y: number } | null>(null);
    // The window menu, at the pointer relative to the handle.
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const menuAnchor = useRef<HTMLSpanElement>(null);

    const classes = ["gtk-windowhandle", "gtk-bin-layout"];
    if (className) classes.push(className);

    const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(e);
      if (e.button !== 0 || !isOwnPress(e.currentTarget, e.target, CLAIMS_PRESS)) return;
      press.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      // The gesture keeps the pointer until it's released, wherever it goes.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    };

    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(e);
      const start = press.current;
      if (!start || start.pointerId !== e.pointerId) return;
      // gtk_drag_check_threshold_double()
      if (
        Math.abs(e.clientX - start.x) <= DRAG_THRESHOLD &&
        Math.abs(e.clientY - start.y) <= DRAG_THRESHOLD
      )
        return;
      press.current = null;
      controls?.drag?.(e);
    };

    const endPress = (e: PointerEvent<HTMLDivElement>) => {
      if (press.current?.pointerId === e.pointerId) press.current = null;
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
      onMouseDown?.(e);
      // A second press denies the drag; a primary double click toggles
      // maximization (click_gesture_pressed_cb()).
      if (e.detail < 2 || !isOwnPress(e.currentTarget, e.target, CLAIMS_PRESS)) return;
      press.current = null;
      if (e.button === 0 && e.detail === 2) controls?.maximize?.();
    };

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
      onContextMenu?.(e);
      if (
        e.defaultPrevented ||
        !controls ||
        !isOwnPress(e.currentTarget, e.target, CLAIMS_SECONDARY)
      )
        return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    // do_popup_fallback(): Restore and Maximize follow the maximized state.
    // An action the window doesn't handle is insensitive, like an
    // unresolved action.
    const maximized = !!controls?.maximized;
    const menuModel: GtkMenuModel = [
      [
        {
          label: "Restore",
          onActivate: controls?.maximize,
          disabled: !controls?.maximize || !maximized,
        },
        { label: "Minimize", onActivate: controls?.minimize, disabled: !controls?.minimize },
        {
          label: "Maximize",
          onActivate: controls?.maximize,
          disabled: !controls?.maximize || maximized,
        },
      ],
      [{ label: "Close", onActivate: controls?.close, disabled: !controls?.close }],
    ];
    const closeMenu = () => setMenu(null);

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => {
          onPointerUp?.(e);
          endPress(e);
        }}
        onPointerCancel={(e) => {
          onPointerCancel?.(e);
          endPress(e);
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        {children}
        {menu && (
          <>
            {/* The 1×1 rectangle at the pointer the menu points to. */}
            <span
              ref={menuAnchor}
              aria-hidden
              style={{
                position: "relative",
                left: menu.x,
                top: menu.y,
                width: 1,
                height: 1,
                justifySelf: "start",
                alignSelf: "start",
                pointerEvents: "none",
              }}
            />
            <GtkPopover
              visible
              hasArrow={false}
              halign="start"
              className="menu"
              pointingTo={menuAnchor}
              onClosed={closeMenu}
            >
              <PopoverMenuCloseProvider value={closeMenu}>
                <GtkPopoverMenu model={menuModel} />
              </PopoverMenuCloseProvider>
            </GtkPopover>
          </>
        )}
      </div>
    );
  },
);
