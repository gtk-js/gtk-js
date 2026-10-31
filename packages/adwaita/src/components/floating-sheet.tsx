import {
  FOCUSABLE,
  GtkProviderBoundary,
  isCoveredByLayer,
  useEscapeLayer,
  useWindowElement,
} from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  animateSpring,
  BOTTOM_SHEET_SPRING,
  BOTTOM_SHEET_SPRING_EPSILON,
  DIALOG_SPRING,
  DIALOG_SPRING_EPSILON,
  type SpringAnimationHandle,
} from "../spring.ts";
import type { AdwDialogPresentationMode } from "../types.ts";

/** Upstream MIN_SCALE in adw-floating-sheet.c. */
const MIN_SCALE = 0.8;
/** PORTRAIT_CONDITION and LANDSCAPE_CONDITION in adw-dialog.c. */
const NARROW_MAX_WIDTH = 450;
const SHORT_MAX_HEIGHT = 360;
/** adw_bottom_sheet_set_min_natural_width() in update_presentation(). */
const BOTTOM_SHEET_MIN_NATURAL_WIDTH = 360;

/**
 * adw_floating_sheet_size_allocate(): the space kept around the sheet grows
 * linearly with the window size, from 30px (horizontally) and 20px
 * (vertically) at 720px up to 120px at 1440px. A bottom sheet keeps 30px to
 * 120px above it the same way (adw_bottom_sheet_size_allocate()).
 */
function sheetPadding(size: number, minValue: number): number {
  const t = Math.max(0, (size - 720) / (1440 - 720));
  return Math.trunc(minValue + (120 - minValue) * t);
}

interface Breakpoint {
  narrow: boolean;
  short: boolean;
}

function breakpointFor(width: number, height: number): Breakpoint {
  return { narrow: width <= NARROW_MAX_WIDTH, short: height <= SHORT_MAX_HEIGHT };
}

/** The widgets in `root` that take the focus with Tab, in document order. */
function tabbables(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLButtonElement).disabled &&
      !el.closest("[inert]") &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== "hidden",
  );
}

const NON_TEXT_INPUTS = [
  "button",
  "checkbox",
  "radio",
  "reset",
  "submit",
  "image",
  "range",
  "color",
];

/** Text widgets, which use the arrow keys and Space themselves. */
function isEditable(el: Element): boolean {
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.includes(el.type);
  return el.matches("textarea, select, [contenteditable]:not([contenteditable='false'])");
}

/** Whether `el` or an ancestor below `boundary` can scroll further along `axis` in `dir`. */
function canScroll(el: Element | null, boundary: Element, axis: "x" | "y", dir: number): boolean {
  for (let node = el; node && node !== boundary; node = node.parentElement) {
    const overflow = getComputedStyle(node)[axis === "x" ? "overflowX" : "overflowY"];
    if (overflow !== "auto" && overflow !== "scroll") continue;
    const pos = axis === "x" ? node.scrollLeft : node.scrollTop;
    const max =
      axis === "x" ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
    if (dir < 0 ? pos > 0 : pos < max - 1) return true;
  }
  return false;
}

/**
 * GTK's directional focus (focus_sort_left_right() / focus_sort_up_down() in
 * gtkwidgetfocus.c): the nearest widget past the focused one along the
 * arrow's axis that overlaps it on the other axis.
 */
function directionalTarget(root: Element, from: Element, key: string): HTMLElement | null {
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const reverse = key === "ArrowLeft" || key === "ArrowUp";
  const center = (b: DOMRect) =>
    horizontal
      ? { pos: b.left + b.width / 2, other: b.top + b.height / 2 }
      : { pos: b.top + b.height / 2, other: b.left + b.width / 2 };
  const r = from.getBoundingClientRect();
  const own = center(r);
  let best: { el: HTMLElement; pos: number; distance: number } | null = null;
  for (const el of tabbables(root)) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    const overlaps = horizontal
      ? b.bottom > r.top && b.top < r.bottom
      : b.right > r.left && b.left < r.right;
    const { pos, other } = center(b);
    if (!overlaps || (reverse ? pos >= own.pos : pos <= own.pos)) continue;
    const distance = Math.abs(other - own.other);
    const closer = best && (reverse ? pos > best.pos : pos < best.pos);
    if (!best || closer || (pos === best.pos && distance < best.distance)) {
      best = { el, pos, distance };
    }
  }
  return best?.el ?? null;
}

/** Keys that scroll the page when nothing handles them: their axis and direction. */
const SCROLL_KEYS: Record<string, ["x" | "y", number]> = {
  ArrowUp: ["y", -1],
  ArrowDown: ["y", 1],
  ArrowLeft: ["x", -1],
  ArrowRight: ["x", 1],
  PageUp: ["y", -1],
  PageDown: ["y", 1],
  Home: ["y", -1],
  End: ["y", 1],
  " ": ["y", 1],
};

export interface FloatingSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the dialog is presented. Closing plays the close animation before unmounting. */
  open: boolean;
  /** CSS classes for the `dialog` node (besides `gtk-dialog` and the presentation's). */
  dialogClasses: string[];
  /**
   * AdwDialog:presentation-mode. `auto` uses a bottom sheet while the host is
   * at most 450px wide or 360px tall, and a floating sheet otherwise.
   */
  presentationMode?: AdwDialogPresentationMode;
  /** Style for the `sheet` node. */
  sheetStyle?: CSSProperties;
  /**
   * Clicking the dimmed area of a bottom sheet (released_cb() in
   * adw-bottom-sheet.c). A floating sheet's dimming only moves the window.
   */
  onDimmingClick?: () => void;
  /** Escape, while this is the topmost dialog or popover. */
  onEscape?: () => void;
  /** Called once the close animation finished and the dialog is gone. */
  onCloseAnimationDone?: () => void;
  /**
   * The widget to focus when presented, like a grab_focus() override. When it
   * returns null, the first widget in the Tab order gets it, or else the sheet.
   */
  initialFocus?: (sheet: HTMLElement) => HTMLElement | null;
  /** The host crossed the `narrow` (≤ 450px wide) or `short` (≤ 360px tall) breakpoint. */
  onBreakpointChange?: (narrow: boolean, short: boolean) => void;
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
 * Internal: the presentation shared by AdwDialog, AdwAlertDialog and
 * AdwAboutDialog, mirroring AdwFloatingSheet and AdwBottomSheet.
 *
 * Floating: opening fades the dimming and sheet in while the sheet scales
 * from 0.8 with a spring (damping 0.62, mass 1, stiffness 500); closing runs
 * it backwards, clamped. Bottom sheet: the sheet slides up from the bottom
 * edge with a spring (0.8, 1, 400) while the dimming fades in.
 *
 * Like AdwDialogHost, a presented dialog takes the keyboard: the page behind
 * it can't be focused or scrolled (gtk_widget_set_can_focus (bin, FALSE)).
 *
 * CSS nodes:
 *   dialog-host
 *     └── dialog[.floating|.bottom-sheet][.narrow][.short]
 *         ├── floating-sheet
 *         │   ├── dimming
 *         │   └── sheet.background
 *         │       └── widget
 *         └── bottom-sheet
 *             ├── dimming
 *             └── sheet.background[.flush-left][.flush-right]
 *                 ├── stack > widget > widget
 *                 └── outline
 *
 * @see upstream/libadwaita/src/adw-floating-sheet.c
 * @see upstream/libadwaita/src/adw-bottom-sheet.c
 * @see upstream/libadwaita/src/adw-dialog-host.c
 */
export const FloatingSheet = forwardRef<HTMLDivElement, FloatingSheetProps>(function FloatingSheet(
  {
    open,
    dialogClasses,
    presentationMode = "auto",
    sheetStyle,
    onDimmingClick,
    followsContentSize = false,
    onEscape,
    onCloseAnimationDone,
    initialFocus,
    onBreakpointChange,
    portal = false,
    children,
    className,
    style,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const windowElement = useWindowElement();
  const hostInWindow = portal === false && windowElement !== null;
  // The window's element is known after its first render, so a dialog open
  // from the start moves into it then: new elements, which the effects that
  // hold the dialog's elements (focus, wheel, animation, size) take up again
  // by depending on hostInWindow.
  // The host's size before the dialog is laid out: the window, or the viewport.
  const hostBreakpoint = (): Breakpoint => {
    if (typeof window === "undefined") return { narrow: false, short: false };
    if (hostInWindow) {
      const { width, height } = windowElement.getBoundingClientRect();
      return breakpointFor(width, height);
    }
    return breakpointFor(window.innerWidth, window.innerHeight);
  };
  const [mounted, setMounted] = useState(open);
  const [breakpoint, setBreakpoint] = useState(() =>
    open ? hostBreakpoint() : { narrow: false, short: false },
  );
  const [flush, setFlush] = useState({ left: false, right: false });
  const progress = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dimmingRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animation = useRef<SpringAnimationHandle | null>(null);
  const doneRef = useRef(onCloseAnimationDone);
  doneRef.current = onCloseAnimationDone;
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;
  const breakpointRef = useRef(onBreakpointChange);
  breakpointRef.current = onBreakpointChange;
  useImperativeHandle(ref, () => dialogRef.current as HTMLDivElement);
  // Only the topmost dialog closes, as the dialog on top has the focus in GTK.
  useEscapeLayer(open, sheetRef, () => onEscape?.());

  if (open && !mounted) {
    setMounted(true);
    setBreakpoint(hostBreakpoint());
  }

  // update_presentation()
  const bottomSheet =
    presentationMode === "bottom-sheet" ||
    (presentationMode === "auto" && (breakpoint.narrow || breakpoint.short));
  const bottomSheetRef = useRef(bottomSheet);
  bottomSheetRef.current = bottomSheet;

  // Like AdwDialogHost (and a dialog shadowed by another): presenting takes the
  // focus from whatever had it, which gets it back when the dialog closes
  // (last_focus). Read before the dialog's content can autofocus anything.
  const lastFocus = useRef<Element | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    lastFocus.current = document.activeElement;
  }
  wasOpen.current = open;
  // Read by the listeners below, which outlive the layout effect that hands
  // the focus back when closing.
  const openRef = useRef(open);
  openRef.current = open;

  // adw_dialog_grab_focus(): the dialog's own choice, else the first widget
  // (move_focus (TAB_FORWARD)), else the sheet (ensure_focus()).
  const focusInitial = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const target = initialFocusRef.current?.(sheet) ?? tabbables(sheet)[0] ?? sheet;
    target.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      // Unless its content took the focus (an autofocused widget).
      const sheet = sheetRef.current;
      if (sheet && !sheet.contains(document.activeElement)) focusInitial();
      return;
    }
    // Closing (not an effect cleanup, which also runs while still open).
    const last = lastFocus.current;
    lastFocus.current = null;
    if (last instanceof HTMLElement && last.isConnected && !last.closest("[inert]")) {
      last.focus({ preventScroll: true });
    }
  }, [open, focusInitial, hostInWindow]);

  // While presented, the page behind can't take the focus: Tab cycles through
  // the dialog's widgets (adw-dialog.c's tab bindings), and in a window the
  // rest of its content is inert, as AdwDialogHost makes its bin unfocusable
  // and untargetable.
  useEffect(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!open || !dialog || !sheet) return;
    const handleTab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
      if (!openRef.current || isCoveredByLayer(sheet)) return;
      const active = document.activeElement;
      const inside = !!active && dialog.contains(active);
      // A window's dialog only holds the keyboard within the window.
      if (hostInWindow && !inside) return;
      e.preventDefault();
      const list = tabbables(sheet);
      let next: HTMLElement | undefined;
      if (inside && active) {
        const order = (el: HTMLElement) => active.compareDocumentPosition(el);
        next = e.shiftKey
          ? list.findLast((el) => order(el) & Node.DOCUMENT_POSITION_PRECEDING)
          : list.find((el) => order(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      }
      // Wrapping around, or the sheet itself when nothing in it takes the focus.
      next ??= (e.shiftKey ? list.at(-1) : list[0]) ?? sheet;
      next.focus();
    };
    // Focus that lands behind the dialog anyway (from the browser's UI, or a
    // script) goes back into it.
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element | null;
      if (!openRef.current || !target || dialog.contains(target) || isCoveredByLayer(sheet)) return;
      if (target.closest?.(".gtk-popover, .gtk-dialog")) return;
      focusInitial();
    };
    document.addEventListener("keydown", handleTab, true);
    if (!hostInWindow) document.addEventListener("focusin", handleFocusIn);
    const inert: HTMLElement[] = [];
    if (hostInWindow) {
      const host = dialog.parentElement;
      for (const child of windowElement.children) {
        if (child === host || !(child instanceof HTMLElement) || child.inert) continue;
        child.inert = true;
        inert.push(child);
      }
    }
    return () => {
      document.removeEventListener("keydown", handleTab, true);
      document.removeEventListener("focusin", handleFocusIn);
      for (const child of inert) child.inert = false;
    };
  }, [open, hostInWindow, windowElement, focusInitial]);

  // Nothing behind the dialog scrolls either: the wheel only scrolls what's
  // inside it, without chaining from there to the page.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !dialog) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const target = e.target as Element;
      const scrolls =
        (e.deltaY !== 0 && canScroll(target, dialog, "y", e.deltaY)) ||
        (e.deltaX !== 0 && canScroll(target, dialog, "x", e.deltaX));
      if (!scrolls) e.preventDefault();
    };
    dialog.addEventListener("wheel", handleWheel, { passive: false });
    return () => dialog.removeEventListener("wheel", handleWheel);
  }, [mounted, hostInWindow]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    const sheet = sheetRef.current;
    const target = e.target as Element;
    if (e.defaultPrevented || !sheet || e.altKey || e.metaKey || isCoveredByLayer(sheet)) return;
    if (isEditable(target)) return;
    // adw-dialog.c's arrow bindings: move-focus in that direction.
    if (e.key.startsWith("Arrow") && !e.shiftKey && target !== sheet) {
      const next = directionalTarget(sheet, target, e.key);
      if (next) {
        e.preventDefault();
        next.focus();
        return;
      }
    }
    // Keys that would scroll the page behind, as nothing in the dialog scrolls.
    const scroll = SCROLL_KEYS[e.key];
    if (!scroll || e.ctrlKey) return;
    if (e.key === " " && target.matches("button, a[href], [role]")) return;
    const dir = e.key === " " && e.shiftKey ? -1 : scroll[1];
    if (!canScroll(target, sheet, scroll[0], dir)) e.preventDefault();
  };

  useLayoutEffect(() => {
    if (!mounted) return;
    const apply = (value: number) => {
      progress.current = value;
      const opacity = String(Math.min(1, Math.max(0, value)));
      if (dimmingRef.current) dimmingRef.current.style.opacity = opacity;
      const sheet = sheetRef.current;
      if (!sheet) return;
      // None at rest: any transform makes the sheet the containing block of
      // its position: fixed descendants, so popovers in the dialog would be
      // placed and clipped against the sheet instead of the window.
      if (bottomSheetRef.current) {
        sheet.style.opacity = "";
        sheet.style.transform =
          value >= 1 ? "none" : `translateY(${(1 - Math.max(0, value)) * 100}%)`;
      } else {
        sheet.style.opacity = opacity;
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
    const bottom = bottomSheetRef.current;
    animation.current = animateSpring({
      params: bottom ? BOTTOM_SHEET_SPRING : DIALOG_SPRING,
      epsilon: bottom ? BOTTOM_SHEET_SPRING_EPSILON : DIALOG_SPRING_EPSILON,
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
  }, [open, mounted, hostInWindow]);

  // Switching presentations keeps the progress: update_presentation() opens
  // the new sheet right away.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || animation.current) return;
    sheet.style.opacity = bottomSheet ? "" : String(Math.min(1, Math.max(0, progress.current)));
    sheet.style.transform = "none";
  }, [bottomSheet]);

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
  }, [mounted, followsContentSize, hostInWindow]);

  // The host's size: the breakpoints, and how close to its edges the sheet
  // gets.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const sheet = sheetRef.current;
    if (!mounted || !container || !sheet) return;
    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      const next = breakpointFor(width, height);
      setBreakpoint((prev) =>
        prev.narrow === next.narrow && prev.short === next.short ? prev : next,
      );
      if (bottomSheetRef.current) {
        container.style.padding = `${sheetPadding(height, 30)}px 0 0`;
        // flush-left / flush-right: the sheet, with its margins, reaches the edge.
        const cs = getComputedStyle(sheet);
        const left = sheet.offsetLeft - parseFloat(cs.marginLeft) <= 0;
        const right =
          sheet.offsetLeft + sheet.offsetWidth + parseFloat(cs.marginRight) >=
          container.clientWidth;
        setFlush((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
      } else {
        container.style.padding = `${sheetPadding(height, 20)}px ${sheetPadding(width, 30)}px`;
      }
    };
    update();
    // The border boxes don't change with the padding, so this can't loop.
    const observer = new ResizeObserver(update);
    observer.observe(container, { box: "border-box" });
    observer.observe(sheet, { box: "border-box" });
    return () => observer.disconnect();
  }, [mounted, bottomSheet, hostInWindow]);

  useLayoutEffect(() => {
    if (mounted) breakpointRef.current?.(breakpoint.narrow, breakpoint.short);
  }, [mounted, breakpoint]);

  if (!mounted) return null;

  const classes = ["gtk-dialog", ...dialogClasses, bottomSheet ? "bottom-sheet" : "floating"];
  if (breakpoint.narrow) classes.push("narrow");
  if (breakpoint.short) classes.push("short");
  if (className) classes.push(className);

  const sheetClasses = ["gtk-sheet", "background"];
  if (bottomSheet && flush.left) sheetClasses.push("flush-left");
  if (bottomSheet && flush.right) sheetClasses.push("flush-right");

  // The same elements in both presentations, so switching keeps the content.
  const content = (
    <div className="gtk-dialog-host" style={{ display: "contents" }}>
      <div
        ref={dialogRef}
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
        onKeyDown={handleKeyDown}
        {...rest}
      >
        <div
          ref={containerRef}
          className={bottomSheet ? "gtk-bottom-sheet" : "gtk-floating-sheet"}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: bottomSheet ? "flex-end" : "center",
            justifyContent: "center",
            // gtk_widget_set_overflow (self, GTK_OVERFLOW_HIDDEN) in adw_bottom_sheet_init()
            overflow: bottomSheet ? "hidden" : undefined,
          }}
        >
          <div
            ref={dimmingRef}
            className="gtk-dimming"
            style={{ position: "absolute", inset: 0, opacity: 0, touchAction: "none" }}
            onClick={bottomSheet ? onDimmingClick : undefined}
          />
          <div
            ref={sheetRef}
            className={sheetClasses.join(" ")}
            tabIndex={-1}
            style={{
              position: "relative",
              opacity: bottomSheet ? undefined : 0,
              transform: bottomSheet ? "translateY(100%)" : `scale(${MIN_SCALE})`,
              // gtk_widget_set_overflow (self->sheet_bin, GTK_OVERFLOW_HIDDEN) in
              // adw_floating_sheet_init(): clipped to its rounded corners.
              overflow: bottomSheet ? undefined : "clip",
              // Within the padding (see sheetPadding()), like the allocation.
              maxWidth: bottomSheet ? undefined : "100%",
              maxHeight: "100%",
              // A bottom sheet is at least 360px wide, if the host is.
              minWidth: bottomSheet ? `min(${BOTTOM_SHEET_MIN_NATURAL_WIDTH}px, 100%)` : undefined,
              ...sheetStyle,
            }}
          >
            <div className={bottomSheet ? "gtk-stack" : undefined} style={{ display: "contents" }}>
              <div
                className={bottomSheet ? "gtk-widget" : undefined}
                style={{ display: "contents" }}
              >
                {/* The dialog's AdwBreakpointBin */}
                <div className="gtk-widget" style={{ display: "contents" }}>
                  {children}
                </div>
              </div>
            </div>
            {bottomSheet && (
              <div
                className="gtk-outline"
                style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Portaled out of the provider, the dialog needs its scope (reset, font, theme).
  if (portal === true) {
    return createPortal(<GtkProviderBoundary>{content}</GtkProviderBoundary>, document.body);
  }
  if (portal) return createPortal(<GtkProviderBoundary>{content}</GtkProviderBoundary>, portal);
  if (hostInWindow) return createPortal(content, windowElement);
  return content;
});
