import { useEscapeLayer, useWindowElement } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  animateSpring,
  DIALOG_SPRING,
  DIALOG_SPRING_EPSILON,
  type SpringAnimationHandle,
} from "../spring.ts";

/** Upstream MIN_SCALE in adw-floating-sheet.c. */
const MIN_SCALE = 0.8;

/**
 * adw_floating_sheet_size_allocate(): the space kept around the sheet grows
 * linearly with the window size, from 30px (horizontally) and 20px
 * (vertically) at 720px up to 120px at 1440px.
 */
function sheetPadding(size: number, minValue: number): number {
  const t = Math.max(0, (size - 720) / (1440 - 720));
  return Math.trunc(minValue + (120 - minValue) * t);
}

export interface FloatingSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the dialog is presented. Closing plays the close animation before unmounting. */
  open: boolean;
  /** CSS classes for the `dialog` node (besides `gtk-dialog`). */
  dialogClasses: string[];
  /** Style for the `sheet` node. */
  sheetStyle?: CSSProperties;
  /** Clicking the dimmed area. */
  onDimmingClick?: () => void;
  /** Escape, while this is the topmost dialog or popover. */
  onEscape?: () => void;
  /** Called once the close animation finished and the dialog is gone. */
  onCloseAnimationDone?: () => void;
  /**
   * AdwDialog:follows-content-size. When false (AdwDialog's default), the
   * sheet keeps the natural size it had when presented (set_content_size() on
   * root), so e.g. navigating to a shorter page doesn't shrink it. Sizes set
   * in `sheetStyle` are kept either way.
   */
  followsContentSize?: boolean;
  portal?: boolean | HTMLElement;
  children?: ReactNode;
}

/**
 * Internal: the floating presentation shared by AdwDialog, AdwAlertDialog and
 * AdwAboutDialog, mirroring AdwFloatingSheet. Opening fades the dimming and
 * sheet in while the sheet scales from 0.8 with a spring (damping 0.62,
 * mass 1, stiffness 500); closing runs it backwards, clamped.
 *
 * CSS node:
 *   dialog-host
 *     └── dialog.background.floating
 *         └── floating-sheet
 *             ├── dimming
 *             └── sheet
 *
 * @see upstream/libadwaita/src/adw-floating-sheet.c
 */
export const FloatingSheet = forwardRef<HTMLDivElement, FloatingSheetProps>(function FloatingSheet(
  {
    open,
    dialogClasses,
    sheetStyle,
    onDimmingClick,
    followsContentSize = false,
    onEscape,
    onCloseAnimationDone,
    portal = false,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const windowElement = useWindowElement();
  const [mounted, setMounted] = useState(open);
  const progress = useRef(0);
  const dimmingRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const animation = useRef<SpringAnimationHandle | null>(null);
  const doneRef = useRef(onCloseAnimationDone);
  doneRef.current = onCloseAnimationDone;
  // Only the topmost dialog closes, as the dialog on top has the focus in GTK.
  useEscapeLayer(open, sheetRef, () => onEscape?.());

  if (open && !mounted) setMounted(true);

  // Like AdwDialogHost (and a dialog shadowed by another): presenting takes the
  // focus from whatever had it, which gets it back when the dialog closes
  // (last_focus). Read before the dialog's content can autofocus anything.
  const lastFocus = useRef<Element | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    lastFocus.current = document.activeElement;
  }
  wasOpen.current = open;
  useLayoutEffect(() => {
    if (open) {
      // gtk_widget_grab_focus (dialog): unless its content took the focus (an
      // alert dialog's default response), the dialog has it, and Tab moves on
      // into its content.
      const sheet = sheetRef.current;
      if (sheet && !sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true });
      return;
    }
    // Closing (not an effect cleanup, which also runs while still open).
    const last = lastFocus.current;
    lastFocus.current = null;
    if (last instanceof HTMLElement && last.isConnected && !last.closest("[inert]")) {
      last.focus({ preventScroll: true });
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const apply = (value: number) => {
      progress.current = value;
      const opacity = String(Math.min(1, Math.max(0, value)));
      if (dimmingRef.current) dimmingRef.current.style.opacity = opacity;
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.opacity = opacity;
        // None at rest: any transform makes the sheet the containing block of
        // its position: fixed descendants, so popovers in the dialog would be
        // placed and clipped against the sheet instead of the window.
        sheet.style.transform =
          value === 1 ? "none" : `scale(${MIN_SCALE + (1 - MIN_SCALE) * value})`;
      }
    };
    apply(progress.current);
    const to = open ? 1 : 0;
    if (progress.current === to) {
      if (!open) {
        setMounted(false);
        doneRef.current?.();
      }
      return;
    }
    animation.current?.cancel();
    animation.current = animateSpring({
      params: DIALOG_SPRING,
      epsilon: DIALOG_SPRING_EPSILON,
      from: progress.current,
      to,
      clamp: !open,
      onValue: apply,
      onDone: () => {
        animation.current = null;
        if (!open) {
          setMounted(false);
          doneRef.current?.();
        }
      },
    });
    return () => animation.current?.cancel();
  }, [open, mounted]);

  // Fix the natural size at presentation (see followsContentSize). offset*
  // sizes are layout sizes, unaffected by the opening scale transform.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!mounted || !sheet || followsContentSize) return;
    const fixWidth = sheetStyle?.width === undefined;
    const fixHeight = sheetStyle?.height === undefined;
    if (!fixWidth && !fixHeight) return;
    const { maxWidth, maxHeight } = sheet.style;
    sheet.style.maxWidth = "none";
    sheet.style.maxHeight = "none";
    const { offsetWidth, offsetHeight } = sheet;
    sheet.style.maxWidth = maxWidth;
    sheet.style.maxHeight = maxHeight;
    if (fixWidth) sheet.style.width = `${offsetWidth}px`;
    if (fixHeight) sheet.style.height = `${offsetHeight}px`;
    return () => {
      if (fixWidth) sheet.style.width = "";
      if (fixHeight) sheet.style.height = "";
    };
    // Only when presented, like upstream: sheetStyle is read once.
  }, [mounted, followsContentSize]);

  // The sheet never gets closer to the window's edges than upstream allows.
  useLayoutEffect(() => {
    const floating = floatingRef.current;
    if (!mounted || !floating) return;
    const update = () => {
      const { width, height } = floating.getBoundingClientRect();
      floating.style.padding = `${sheetPadding(height, 20)}px ${sheetPadding(width, 30)}px`;
    };
    update();
    // The border box doesn't change with the padding, so this can't loop.
    const observer = new ResizeObserver(update);
    observer.observe(floating, { box: "border-box" });
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) return null;

  const hostInWindow = portal === false && windowElement !== null;
  const classes = ["gtk-dialog", ...dialogClasses];
  if (className) classes.push(className);

  const content = (
    <div className="gtk-dialog-host" style={{ display: "contents" }}>
      <div
        ref={ref}
        className={classes.join(" ")}
        role="dialog"
        aria-modal="true"
        style={{
          // Inside a GtkWindow the dialog covers the window (its dialog host);
          // otherwise the whole viewport.
          position: hostInWindow ? "absolute" : "fixed",
          inset: 0,
          zIndex: 1000,
          // Like gtk_widget_set_can_target (…, FALSE) while closing.
          pointerEvents: open ? undefined : "none",
          ...style,
        }}
        {...rest}
      >
        <div
          ref={floatingRef}
          className="gtk-floating-sheet"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            ref={dimmingRef}
            className="gtk-dimming"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
            onClick={onDimmingClick}
          />
          <div
            ref={sheetRef}
            className="gtk-sheet"
            tabIndex={-1}
            style={{
              position: "relative",
              opacity: 0,
              transform: `scale(${MIN_SCALE})`,
              // Within the padding (see sheetPadding()), like the allocation.
              maxWidth: "100%",
              maxHeight: "100%",
              outline: "none",
              ...sheetStyle,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  if (portal === true) return createPortal(content, document.body);
  if (portal) return createPortal(content, portal);
  if (hostInWindow) return createPortal(content, windowElement);
  return content;
});
