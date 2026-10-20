import { type RefObject, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { GtkBox } from "./components/box.tsx";
import { GtkLabel } from "./components/label.tsx";

/** gtktooltip.c: how long the pointer rests on a widget before its tooltip shows. */
export const HOVER_TIMEOUT = 500;
/** While browsing (a tooltip was shown recently), the next one shows this soon. */
export const BROWSE_TIMEOUT = 60;
/** Browsing ends this long after the last tooltip hid. */
export const BROWSE_DISABLE_TIMEOUT = 500;
/** GtkSettings:gtk-cursor-theme-size on GNOME, which places pointer-anchored tooltips. */
const CURSOR_SIZE = 24;

const TOOLTIP_ATTRIBUTE = "data-gtk-tooltip";

/**
 * Props that give a widget a tooltip (GtkWidget:tooltip-text), which is also
 * its accessible description, as gtk_widget_set_tooltip_text() sets it.
 */
export function tooltipAttrs(text: string | undefined) {
  return text ? { [TOOLTIP_ATTRIBUTE]: text, "aria-description": text } : {};
}

/** The innermost widget with a tooltip at a point, like gtk_tooltip_run_requery(). */
function tooltipWidget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  const widget = target.closest(`[${TOOLTIP_ATTRIBUTE}]`);
  return widget?.closest("[data-gtk-provider]") ? widget : null;
}

export interface ShownTooltip {
  widget: Element;
  text: string;
  /** Where the pointer was when the tooltip showed. */
  pointer: { x: number; y: number };
}

/**
 * GtkTooltip: one per display, following the pointer from widget to widget.
 * The pointer has to rest for HOVER_TIMEOUT before a tooltip shows; every
 * motion restarts the wait (gtk_tooltip_start_delay()). Once one has shown,
 * moving to the next widget shows its tooltip after BROWSE_TIMEOUT, until
 * BROWSE_DISABLE_TIMEOUT has passed with none shown.
 */
export class TooltipTracker {
  private shown: ShownTooltip | null = null;
  private target: Element | null = null;
  private pointer = { x: 0, y: 0 };
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private browseTimeout: ReturnType<typeof setTimeout> | undefined;
  private browseMode = false;
  private readonly listeners = new Set<() => void>();

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getShown = () => this.shown;

  /** The pointer moved to (x, y), over `widget` or no widget with a tooltip. */
  motion(widget: Element | null, x: number, y: number): void {
    this.pointer = { x, y };
    if (!widget) {
      this.hide();
      return;
    }
    this.target = widget;
    if (this.shown) {
      // Over another widget now: this tooltip goes, and the next motion starts
      // the (browse mode) wait for the new one.
      if (widget !== this.shown.widget) this.hide();
      return;
    }
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.show(), this.browseMode ? BROWSE_TIMEOUT : HOVER_TIMEOUT);
  }

  /** A button or key press, scrolling, a drag or the pointer leaving: no tooltip. */
  hide(): void {
    clearTimeout(this.timeout);
    this.timeout = undefined;
    if (!this.shown) return;
    this.shown = null;
    this.browseTimeout ??= setTimeout(() => {
      this.browseMode = false;
      this.browseTimeout = undefined;
    }, BROWSE_DISABLE_TIMEOUT);
    this.notify();
  }

  private show(): void {
    this.timeout = undefined;
    const widget = this.target;
    const text = widget?.isConnected ? widget.getAttribute(TOOLTIP_ATTRIBUTE) : null;
    if (!widget || !text) return;
    this.shown = { widget, text, pointer: this.pointer };
    this.browseMode = true;
    clearTimeout(this.browseTimeout);
    this.browseTimeout = undefined;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

export const tooltipTracker = new TooltipTracker();

let installed = 0;
let removeListeners: (() => void) | undefined;

/** Feed the document's pointer and key events to the tracker, once for every provider. */
export function trackTooltips(): () => void {
  if (installed++ === 0) {
    const onMove = (e: PointerEvent) => {
      // GTK shows no tooltips for touch (tooltips_enabled()).
      if (e.pointerType === "touch") return;
      tooltipTracker.motion(tooltipWidget(e.target), e.clientX, e.clientY);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.relatedTarget === null) tooltipTracker.hide();
    };
    const hide = () => tooltipTracker.hide();
    const events: [EventTarget, string, EventListener][] = [
      [document, "pointermove", onMove as EventListener],
      [document, "pointerout", onLeave as EventListener],
      [document, "pointerdown", hide],
      [document, "keydown", hide],
      [document, "wheel", hide],
      [document, "dragstart", hide],
      [window, "blur", hide],
    ];
    for (const [target, type, listener] of events) target.addEventListener(type, listener, true);
    removeListeners = () => {
      for (const [target, type, listener] of events)
        target.removeEventListener(type, listener, true);
    };
  }
  return () => {
    if (--installed === 0) {
      tooltipTracker.hide();
      removeListeners?.();
    }
  };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where a tooltip goes, like gtk_tooltip_position(): centered below the widget,
 * moved toward the pointer when it's more than 32px off the widget's center,
 * or below the pointer itself when the widget is too tall. It flips above when
 * there's no room below (GDK_ANCHOR_FLIP_Y) and slides to stay in view
 * (GDK_ANCHOR_SLIDE_X).
 */
export function tooltipPosition(
  widget: Rect,
  pointer: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const padding = Math.max(4, CURSOR_SIZE - 32);
  let anchor: Rect = {
    x: Math.floor(widget.x) - padding,
    y: Math.floor(widget.y) - padding,
    width: Math.ceil(widget.width) + padding * 2,
    height: Math.ceil(widget.height) + padding * 2,
  };
  let dx = 0;
  const px = Math.round(pointer.x);
  const py = Math.round(pointer.y);
  // Max 48x48 icon + default padding
  if (anchor.height > 48 + 8) {
    anchor = { x: px - 4, y: py - 4, width: CURSOR_SIZE, height: CURSOR_SIZE };
  } else {
    const distance = px - (anchor.x + Math.trunc(anchor.width / 2));
    if (distance > 32) dx = distance - 32;
    else if (distance < -32) dx = distance + 32;
  }

  let x = anchor.x + Math.trunc(anchor.width / 2) + dx - Math.trunc(size.width / 2);
  let y = anchor.y + anchor.height;
  if (y + size.height > viewport.height && anchor.y - size.height >= 0) y = anchor.y - size.height;
  x = Math.max(0, Math.min(x, viewport.width - size.width));
  return { x, y };
}

/**
 * The tooltip of a widget inside this provider, a GtkTooltipWindow.
 *
 * CSS node:
 *   tooltip.background
 *     └── box
 *         └── label
 */
export function GtkTooltipLayer({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const shown = useSyncExternalStore(tooltipTracker.subscribe, tooltipTracker.getShown, () => null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mine = shown && rootRef.current?.contains(shown.widget) ? shown : null;

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!mine || !el) return;
    // A wrapped GtkLabel is as wide as its widest line, where CSS keeps the
    // whole max-width-chars width.
    const label = el.querySelector<HTMLElement>(".gtk-label");
    if (label) {
      label.style.width = "";
      const range = document.createRange();
      range.selectNodeContents(label);
      const lines = Array.from(range.getClientRects(), (line) => line.width);
      if (lines.length > 1) label.style.width = `${Math.ceil(Math.max(...lines))}px`;
    }
    const { x, y } = tooltipPosition(
      mine.widget.getBoundingClientRect(),
      mine.pointer,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [mine]);

  if (!mine) return null;
  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="gtk-tooltip background gtk-bin-layout"
      // A popup surface that takes no input; the layout effect places it before it's painted.
      style={{ position: "fixed", left: 0, top: 0, zIndex: 2000, pointerEvents: "none" }}
    >
      <GtkBox>
        <GtkLabel label={mine.text} wrap maxWidthChars={50} hexpand />
      </GtkBox>
    </div>
  );
}
