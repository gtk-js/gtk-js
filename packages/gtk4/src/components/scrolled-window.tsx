import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type UIEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkPolicyType } from "../types.ts";
import { GtkScrollbar } from "./scrollbar.tsx";
import { GtkTextView } from "./text-view.tsx";

export interface GtkScrolledWindowProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Horizontal scrollbar policy. Default: "automatic". */
  hscrollbarPolicy?: GtkPolicyType;
  /** Vertical scrollbar policy. Default: "automatic". */
  vscrollbarPolicy?: GtkPolicyType;
  /** Whether to draw a border frame. Default: false. */
  hasFrame?: boolean;
  /** Minimum content width. Default: -1. */
  minContentWidth?: number;
  /** Minimum content height. Default: -1. */
  minContentHeight?: number;
  /** Maximum content width, applied to the propagated natural width. Default: -1. */
  maxContentWidth?: number;
  /** Maximum content height, applied to the propagated natural height. Default: -1. */
  maxContentHeight?: number;
  /** Whether the child's natural width is the scrolled window's natural width. Default: false. */
  propagateNaturalWidth?: boolean;
  /** Whether the child's natural height is the scrolled window's natural height. Default: false. */
  propagateNaturalHeight?: boolean;
  /** Fires when the content scrolls; the event's target is the scrolling element. */
  onScroll?: (event: UIEvent<HTMLElement>) => void;
  children?: ReactNode;
}

/** Like INDICATOR_FADE_OUT_DELAY and INDICATOR_FADE_OUT_TIME. */
const INDICATOR_FADE_OUT_DELAY = 2000;
const INDICATOR_FADE_OUT_TIME = 500;
/** Like INDICATOR_CLOSE_DISTANCE and INDICATOR_FAR_DISTANCE. */
const INDICATOR_CLOSE_DISTANCE = 5;
const INDICATOR_FAR_DISTANCE = 10;

/** Where the scrolled window is scrolled to along one axis, as its adjustment. */
export interface ScrollAxis {
  /** Scroll position, 0 to 1. */
  value: number;
  /** Visible fraction of the content. */
  pageSize: number;
  /** Whether the content is longer than the view (the scrollbar is needed). */
  overflows: boolean;
  /** Whether content is hidden before / after the view: where GTK draws undershoots. */
  start: boolean;
  end: boolean;
}

/** Reads one axis of a scrolling element, like the adjustments GtkViewport configures. */
export function scrollAxis(
  position: number,
  contentLength: number,
  viewLength: number,
): ScrollAxis {
  const max = contentLength - viewLength;
  return {
    value: max > 0 ? Math.min(1, Math.max(0, position / max)) : 0,
    pageSize: contentLength > 0 ? Math.min(1, viewLength / contentLength) : 1,
    overflows: max >= 1,
    start: position > 0,
    // A fractional scroll position can stop just short of the end.
    end: position < max - 0.5,
  };
}

/**
 * How the child adds to the scrolled window's size along one axis, as
 * gtk_scrolled_window_measure(): its minimum and natural size with the
 * "never" policy (natural only when propagated), its natural size clamped to
 * the maximum when propagated, otherwise nothing. Either way it fills the
 * window: a percentage minimum is 0 while the window is measured.
 */
export function childSizing(
  policy: GtkPolicyType,
  propagate: boolean,
  maxContent: number,
): { size: string; min: string; max: string } {
  if (policy === "never") {
    return propagate
      ? { size: "auto", min: "min-content", max: "none" }
      : { size: "min-content", min: "100%", max: "none" };
  }
  if (propagate) {
    return { size: "auto", min: "100%", max: maxContent >= 0 ? `${maxContent}px` : "none" };
  }
  return { size: "0px", min: "100%", max: "none" };
}

export type ScrollType = "step" | "page" | "start" | "end";

/**
 * The scrolled window's key bindings (gtk_scrolled_window_class_init()):
 * Ctrl+arrows step, Page Up/Down page vertically and with Ctrl horizontally,
 * Home/End go to the vertical start/end and with Ctrl the horizontal ones.
 */
export function scrollBinding(
  key: string,
  ctrl: boolean,
): { scroll: ScrollType; forward: boolean; horizontal: boolean } | null {
  switch (key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      if (!ctrl) return null;
      return {
        scroll: "step",
        forward: key === "ArrowRight" || key === "ArrowDown",
        horizontal: key === "ArrowLeft" || key === "ArrowRight",
      };
    case "PageUp":
    case "PageDown":
      return { scroll: "page", forward: key === "PageDown", horizontal: ctrl };
    case "Home":
    case "End":
      return { scroll: key === "End" ? "end" : "start", forward: key === "End", horizontal: ctrl };
    default:
      return null;
  }
}

/**
 * Whether a child scrolls itself (GtkScrollable): a text view, or a viewport or
 * list view a component builds itself. gtk_scrolled_window_set_child() puts
 * any other child in a GtkViewport.
 */
function isScrollable(child: ReactNode): boolean {
  if (!isValidElement<{ className?: unknown }>(child)) return false;
  if (child.type === GtkTextView) return true;
  const { className } = child.props;
  if (typeof className !== "string") return false;
  const classes = className.split(/\s+/);
  return classes.includes("gtk-viewport") || classes.includes("gtk-listview");
}

/** The element that scrolls: the viewport or list view, or a text view's text. */
function findScroller(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    ":scope > :is(.gtk-viewport, .gtk-listview), :scope > .gtk-textview > .gtk-text",
  );
}

function isEditable(el: Element): boolean {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  );
}

/**
 * An overlay indicator's visibility and `.hovering` state, as GTK's Indicator:
 * it fades in on pointer motion or scrolling, and out once it has been shown
 * INDICATOR_FADE_OUT_DELAY without scrolling while the pointer isn't on it.
 */
function useIndicator() {
  const [shown, setShown] = useState(false);
  const [over, setOverState] = useState(false);
  const state = useRef({
    shown: false,
    over: false,
    lastScroll: 0,
    conceal: undefined as ReturnType<typeof setInterval> | undefined,
    overTimeout: undefined as ReturnType<typeof setTimeout> | undefined,
  }).current;

  // indicator_set_over()
  const setOver = useCallback(
    (value: boolean) => {
      clearTimeout(state.overTimeout);
      state.overTimeout = undefined;
      if (state.over === value) return;
      state.over = value;
      setOverState(value);
    },
    [state],
  );
  // enable_over_timeout_cb(): close to the indicator, after 30ms.
  const setOverSoon = useCallback(() => {
    clearTimeout(state.overTimeout);
    state.overTimeout = setTimeout(() => setOver(true), 30);
  }, [state, setOver]);

  // indicator_start_fade(1.0); a scroll (indicator_value_changed()) also
  // restarts the delay.
  const show = useCallback(
    (scrolled: boolean) => {
      if (scrolled || !state.shown) state.lastScroll = Date.now();
      if (!state.shown) {
        state.shown = true;
        setShown(true);
      }
      // maybe_hide_indicator()
      state.conceal ??= setInterval(() => {
        if (Date.now() - state.lastScroll < INDICATOR_FADE_OUT_DELAY || state.over) return;
        clearInterval(state.conceal);
        state.conceal = undefined;
        state.shown = false;
        setShown(false);
      }, INDICATOR_FADE_OUT_TIME);
    },
    [state],
  );

  useEffect(
    () => () => {
      clearInterval(state.conceal);
      clearTimeout(state.overTimeout);
    },
    [state],
  );

  return { shown, over, show, setOver, setOverSoon };
}

const noScroll: ScrollAxis = { value: 0, pageSize: 1, overflows: false, start: false, end: false };

/**
 * GtkScrolledWindow — A scrollable container.
 *
 * CSS node: scrolledwindow[.frame]
 *   ├── [child]                (a viewport, or a scrollable child such as a text view)
 *   ├── scrollbar.horizontal.bottom.overlay-indicator[.hovering]
 *   ├── scrollbar.vertical.right.overlay-indicator[.hovering]
 *   └── undershoot.top / .bottom / .left / .right   (while not scrolled to that edge)
 *
 * The child scrolls (the browser scrolls it, its own scrollbar hidden) and
 * the scrollbars are overlay indicators, as with GTK's default
 * overlay-scrolling: shown while the pointer moves over the window or it
 * scrolls, wider while the pointer is close to them. The theme draws a shade
 * along an undershoot, e.g. under the flat top bar of an AdwToolbarView.
 *
 * The forwarded ref is the scrolledwindow node; the scrolling element is its
 * viewport (or the text view's text).
 *
 * @see https://docs.gtk.org/gtk4/class.ScrolledWindow.html
 */
export const GtkScrolledWindow = forwardRef<HTMLDivElement, GtkScrolledWindowProps>(
  function GtkScrolledWindow(
    {
      hscrollbarPolicy = "automatic",
      vscrollbarPolicy = "automatic",
      hasFrame = false,
      minContentWidth = -1,
      minContentHeight = -1,
      maxContentWidth = -1,
      maxContentHeight = -1,
      propagateNaturalWidth = false,
      propagateNaturalHeight = false,
      children,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      style,
      onScroll,
      onKeyDown,
      onPointerMoveCapture,
      onPointerLeave,
      ...rest
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);
    const hbarRef = useRef<HTMLDivElement>(null);
    const vbarRef = useRef<HTMLDivElement>(null);
    const hindicator = useIndicator();
    const vindicator = useIndicator();

    const [axes, setAxes] = useState({ x: noScroll, y: noScroll });
    const position = useRef({ x: 0, y: 0 });
    const scroller = () => (rootRef.current ? findScroller(rootRef.current) : null);
    // Right to left, scrollLeft runs from 0 at the right edge down.
    const rtlOffset = (el: HTMLElement) =>
      getComputedStyle(el).direction === "rtl" ? el.scrollWidth - el.clientWidth : 0;

    /** Reads the scroller, like the adjustments' value-changed and changed signals. */
    const update = useCallback(() => {
      const el = rootRef.current && findScroller(rootRef.current);
      if (!el) return;
      const left = el.scrollLeft + rtlOffset(el);
      const x = scrollAxis(left, el.scrollWidth, el.clientWidth);
      const y = scrollAxis(el.scrollTop, el.scrollHeight, el.clientHeight);
      setAxes((prev) => {
        const same = (a: ScrollAxis, b: ScrollAxis) =>
          a.value === b.value &&
          a.pageSize === b.pageSize &&
          a.overflows === b.overflows &&
          a.start === b.start &&
          a.end === b.end;
        return same(prev.x, x) && same(prev.y, y) ? prev : { x, y };
      });
      return { left, top: el.scrollTop };
    }, []);

    // Content that grows or shrinks moves the edges too.
    useLayoutEffect(() => {
      const root = rootRef.current;
      const el = root && findScroller(root);
      if (!root || !el) return;
      const at = update();
      if (at) position.current = { x: at.left, y: at.top };
      const resizes = new ResizeObserver(() => update());
      const observe = () => {
        resizes.disconnect();
        resizes.observe(el);
        for (const child of el.children) resizes.observe(child);
      };
      observe();
      const mutations = new MutationObserver(() => {
        observe();
        update();
      });
      mutations.observe(el, { childList: true });
      return () => {
        resizes.disconnect();
        mutations.disconnect();
      };
    }, [update]);

    // Scroll events don't bubble; catch the scroller's on the way down.
    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
      const el = e.target as HTMLElement;
      if (el !== scroller()) return;
      const at = update();
      if (at) {
        // indicator_value_changed() on the adjustment that changed.
        if (at.left !== position.current.x) hindicator.show(true);
        if (at.top !== position.current.y) vindicator.show(true);
        position.current = { x: at.left, y: at.top };
      }
      onScroll?.(e as UIEvent<HTMLElement>);
    };

    const hNeeded =
      hscrollbarPolicy === "always" || (hscrollbarPolicy === "automatic" && axes.x.overflows);
    const vNeeded =
      vscrollbarPolicy === "always" || (vscrollbarPolicy === "automatic" && axes.y.overflows);

    // captured_motion(): motion over the window shows the indicators, and the
    // one the pointer is close to (or on) widens.
    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
      onPointerMoveCapture?.(e);
      if (hNeeded) hindicator.show(false);
      if (vNeeded) vindicator.show(false);
      const target = e.target as Node;
      const onH = hbarRef.current?.contains(target) ?? false;
      const onV = vbarRef.current?.contains(target) ?? false;
      if (!onH && !onV && (e.buttons & 7) !== 0) {
        hindicator.setOver(false);
        vindicator.setOver(false);
      } else if (e.pointerType === "pen") {
        hindicator.setOver(true);
        vindicator.setOver(true);
      } else {
        // check_update_scrollbar_proximity()
        const proximity = (
          bar: HTMLDivElement | null,
          indicator: ReturnType<typeof useIndicator>,
          on: boolean,
          onOther: boolean,
          vertical: boolean,
        ) => {
          if (!bar) return false;
          const r = bar.getBoundingClientRect();
          const d = indicator.over ? INDICATOR_FAR_DISTANCE : INDICATOR_CLOSE_DISTANCE;
          const close = vertical
            ? e.clientX >= r.left - d && e.clientX < r.right + d
            : e.clientY >= r.top - d && e.clientY < r.bottom + d;
          if (on) indicator.setOver(true);
          else if (close && !onOther) indicator.setOverSoon();
          else indicator.setOver(false);
          return close;
        };
        if (!proximity(vbarRef.current, vindicator, onV, onH, true)) {
          proximity(hbarRef.current, hindicator, onH, onV, false);
        } else {
          hindicator.setOver(false);
        }
      }
    };

    const handlePointerLeave = (e: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(e);
      hindicator.setOver(false);
      vindicator.setOver(false);
    };

    // gtk_scrolled_window_scroll_child()
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      const el = scroller();
      if (!el || e.defaultPrevented || e.altKey || e.metaKey || e.shiftKey) return;
      if (isEditable(e.target as Element)) return;
      const binding = scrollBinding(e.key, e.ctrlKey);
      if (!binding) {
        // Plain arrows and Space aren't bound in GTK: keep the browser from
        // scrolling a focused scrolled window with them.
        if (e.target === el && !e.ctrlKey && /^(Arrow| $)/.test(e.key)) e.preventDefault();
        return;
      }
      const { horizontal, forward, scroll } = binding;
      // may_hscroll() / may_vscroll()
      const policy = horizontal ? hscrollbarPolicy : vscrollbarPolicy;
      const needed = horizontal ? hNeeded : vNeeded;
      if (!needed && policy !== "external") return;
      e.preventDefault();
      const view = horizontal ? el.clientWidth : el.clientHeight;
      const max = (horizontal ? el.scrollWidth : el.scrollHeight) - view;
      const offset = horizontal ? rtlOffset(el) : 0;
      const current = horizontal ? el.scrollLeft + offset : el.scrollTop;
      // GtkViewport's step and page increments are 10% and 90% of the view.
      const increment = scroll === "step" ? view * 0.1 : view * 0.9;
      let next =
        scroll === "start"
          ? 0
          : scroll === "end"
            ? max
            : current + (forward ? increment : -increment);
      next = Math.min(max, Math.max(0, next));
      // gtk_adjustment_animate_to_value()
      el.scrollTo({
        [horizontal ? "left" : "top"]: horizontal ? next - offset : next,
        behavior: "smooth",
      });
    };

    const scrollTo = (horizontal: boolean, value: number) => {
      const el = scroller();
      if (!el) return;
      if (horizontal) el.scrollLeft = value * (el.scrollWidth - el.clientWidth) - rtlOffset(el);
      else el.scrollTop = value * (el.scrollHeight - el.clientHeight);
    };

    const classes = ["gtk-scrolledwindow"];
    if (hasFrame) classes.push("frame");
    if (className) classes.push(className);

    const x = childSizing(hscrollbarPolicy, propagateNaturalWidth, maxContentWidth);
    const y = childSizing(vscrollbarPolicy, propagateNaturalHeight, maxContentHeight);
    const cssStyle = {
      "--gtk-scrolled-overflow-x": hscrollbarPolicy === "never" ? "hidden" : "auto",
      "--gtk-scrolled-overflow-y": vscrollbarPolicy === "never" ? "hidden" : "auto",
      "--gtk-scrolled-child-width": x.size,
      "--gtk-scrolled-child-min-width": x.min,
      "--gtk-scrolled-child-max-width": x.max,
      "--gtk-scrolled-child-height": y.size,
      "--gtk-scrolled-child-min-height": y.min,
      "--gtk-scrolled-child-max-height": y.max,
      // min-content-width/-height bound the scrolled window's own size.
      minWidth: minContentWidth >= 0 && hscrollbarPolicy !== "never" ? minContentWidth : undefined,
      minHeight:
        minContentHeight >= 0 && vscrollbarPolicy !== "never" ? minContentHeight : undefined,
      ...style,
    } as CSSProperties;

    const indicatorStyle = (shown: boolean, needed: boolean): CSSProperties => ({
      opacity: shown ? 1 : 0,
      // Measured, but not drawn, while the content fits (automatic policy).
      visibility: needed ? undefined : "hidden",
    });

    return (
      <div
        ref={rootRef}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        style={cssStyle}
        onScrollCapture={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerMoveCapture={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        {...rest}
      >
        {Children.count(children) === 1 && isScrollable(children) ? (
          children
        ) : (
          <div className="gtk-viewport gtk-bin-layout">{children}</div>
        )}
        {(hscrollbarPolicy === "always" || hscrollbarPolicy === "automatic") && (
          <GtkScrollbar
            ref={hbarRef}
            orientation="horizontal"
            className={`bottom overlay-indicator${hindicator.over ? " hovering" : ""}`}
            value={axes.x.value}
            pageSize={axes.x.pageSize}
            onValueChanged={(v) => scrollTo(true, v)}
            style={indicatorStyle(hindicator.shown, hNeeded)}
          />
        )}
        {(vscrollbarPolicy === "always" || vscrollbarPolicy === "automatic") && (
          <GtkScrollbar
            ref={vbarRef}
            orientation="vertical"
            className={`right overlay-indicator${vindicator.over ? " hovering" : ""}`}
            value={axes.y.value}
            pageSize={axes.y.pageSize}
            onValueChanged={(v) => scrollTo(false, v)}
            style={indicatorStyle(vindicator.shown, vNeeded)}
          />
        )}
        {axes.y.start && <div className="gtk-undershoot top" />}
        {axes.y.end && <div className="gtk-undershoot bottom" />}
        {axes.x.start && <div className="gtk-undershoot left" />}
        {axes.x.end && <div className="gtk-undershoot right" />}
      </div>
    );
  },
);
