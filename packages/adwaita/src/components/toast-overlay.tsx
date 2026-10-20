import { GtkButton, GtkLabel, prefersReducedMotion } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ADW_EASE_CSS, adwEase, easeOutCubic, lerp } from "../easing.ts";
import { animationSlowdown } from "../spring.ts";
import type { AdwToastPriority } from "../types.ts";

export interface AdwToast {
  title: string;
  buttonLabel?: string;
  timeout?: number;
  priority?: AdwToastPriority;
  /** Not supported yet: the title is shown as plain text. */
  useMarkup?: boolean;
  onButtonClicked?: () => void;
  onDismissed?: () => void;
}

export interface AdwToastOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface AdwToastOverlayRef {
  /**
   * Shows a toast, or queues it. Adding the toast that's shown restarts its
   * timeout, and adding a queued one moves it to the front of the queue.
   */
  addToast: (toast: AdwToast) => void;
  /** Dismisses the shown toast and every queued one. */
  dismissAll: () => void;
}

// adw-toast-overlay.c
const SHOW_DURATION = 300;
const HIDE_DURATION = 300;
const REPLACE_DURATION = 500;
const SCALE_AMOUNT = 0.05;
const NATURAL_WIDTH = 450;

/** A toast being shown; `key` changes each time it's shown again after being postponed. */
export interface Shown {
  key: number;
  toast: AdwToast;
  /** Shown while other toasts were still hiding (REPLACE_DURATION). */
  replacing: boolean;
  /** How many times the toast was added again while shown, restarting its timeout. */
  resets: number;
}

export interface OverlayState {
  current: Shown | null;
  hiding: Shown[];
  queue: AdwToast[];
}

let nextKey = 0;

function duration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms * animationSlowdown();
}

function show(s: OverlayState, toast: AdwToast | undefined): Shown | null {
  return toast ? { key: ++nextKey, toast, replacing: s.hiding.length > 0, resets: 0 } : null;
}

/** The overlay's state once `toast` is added, like adw_toast_overlay_add_toast(). */
export function addToastTo(s: OverlayState, toast: AdwToast): OverlayState {
  // The shown toast restarts its timeout.
  if (s.current?.toast === toast)
    return { ...s, current: { ...s.current, resets: s.current.resets + 1 } };
  // A queued toast is bumped: to the front if it's high priority, otherwise
  // after the high-priority toasts at the front (bump_toast()).
  if (s.queue.includes(toast)) {
    const queue = s.queue.filter((t) => t !== toast);
    const at = toast.priority === "high" ? 0 : queue.findIndex((t) => t.priority !== "high");
    queue.splice(at === -1 ? queue.length : at, 0, toast);
    return { ...s, queue };
  }
  if (!s.current) return { ...s, current: show(s, toast) };
  if (toast.priority === "high") {
    // Postpone the current toast: it hides, and shows again next.
    return {
      current: { key: ++nextKey, toast, replacing: true, resets: 0 },
      hiding: [...s.hiding, s.current],
      queue: [s.current.toast, ...s.queue],
    };
  }
  return { ...s, queue: [...s.queue, toast] };
}

/**
 * AdwToastOverlay — A container that displays toast notifications.
 *
 * Like upstream, a toast slides up from the bottom edge (ADW_EASE, 300ms, or
 * 500ms when it replaces one), and a dismissed toast fades out (ease-out
 * cubic) while shrinking to 95% (300ms), staying on screen until then. Its
 * timeout restarts after the pointer leaves it, focus leaves it or a press
 * ends. A high-priority toast postpones the current one to the front of the
 * queue. Escape dismisses the shown toast.
 *
 * CSS node:
 *   toastoverlay
 *     ├── [child]
 *     └── toast[s]
 *         ├── widget > label.heading
 *         ├── [button]
 *         └── button.circular.flat
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ToastOverlay.html
 * @see upstream/libadwaita/src/adw-toast-overlay.c
 */
export const AdwToastOverlay = forwardRef<
  HTMLDivElement,
  AdwToastOverlayProps & { toastRef?: React.Ref<AdwToastOverlayRef> }
>(function AdwToastOverlay({ children, toastRef, className, style, onKeyDown, ...rest }, ref) {
  const [state, setState] = useState<OverlayState>({ current: null, hiding: [], queue: [] });
  const latest = useRef(state);
  latest.current = state;

  const addToast = useCallback((toast: AdwToast) => {
    setState((s) => addToastTo(s, toast));
  }, []);

  // A shown toast is dismissed once, whether by its timeout, its close button
  // or its action.
  const dismissed = useRef(new Set<number>());
  const dismiss = useCallback((key: number, toast: AdwToast) => {
    if (dismissed.current.has(key)) return;
    dismissed.current.add(key);
    setState((s) => {
      if (s.current?.key !== key) return s;
      const [next, ...queue] = s.queue;
      const hiding = [...s.hiding, s.current];
      return { current: show({ ...s, hiding }, next), hiding, queue };
    });
    toast.onDismissed?.();
  }, []);

  // Like adw_toast_overlay_dismiss_all(): the queued toasts, then the shown one.
  const dismissAll = useCallback(() => {
    const { current, queue } = latest.current;
    latest.current = { ...latest.current, queue: [] };
    setState((s) => ({ ...s, queue: s.queue.filter((t) => !queue.includes(t)) }));
    for (const toast of queue) toast.onDismissed?.();
    if (current) dismiss(current.key, current.toast);
  }, [dismiss]);

  React.useImperativeHandle(toastRef, () => ({ addToast, dismissAll }), [addToast, dismissAll]);

  const hidden = useCallback((key: number) => {
    dismissed.current.delete(key);
    setState((s) => ({ ...s, hiding: s.hiding.filter((t) => t.key !== key) }));
  }, []);

  const classes = ["gtk-toastoverlay", "gtk-bin-layout"];
  if (className) classes.push(className);

  // The child and the toasts share one cell, so the toasts count toward the
  // overlay's size like adw_toast_overlay_measure(), and the overlay clips
  // them (GTK_OVERFLOW_HIDDEN).
  return (
    <div
      ref={ref}
      role="group"
      className={classes.join(" ")}
      style={{ overflow: "clip", ...style }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        // The Escape binding, dismiss_cb().
        const plain = !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
        if (e.key !== "Escape" || !plain || e.defaultPrevented || !state.current) return;
        e.preventDefault();
        e.stopPropagation();
        dismiss(state.current.key, state.current.toast);
      }}
      {...rest}
    >
      {children}
      {/* One list, so a toast keeps its widget when it starts hiding. */}
      {[...state.hiding, ...(state.current ? [state.current] : [])].map((t) => (
        <ToastWidget
          key={t.key}
          shown={t}
          hiding={t !== state.current}
          onDismiss={dismiss}
          onHidden={hidden}
        />
      ))}
    </div>
  );
});

export interface ToastWidgetProps {
  shown: Shown;
  hiding: boolean;
  onDismiss: (key: number, toast: AdwToast) => void;
  onHidden: (key: number) => void;
}

/** AdwToastWidget: the toast node, its animations and its timeout. */
export function ToastWidget({ shown, hiding, onDismiss, onHidden }: ToastWidgetProps) {
  const { key, toast, replacing, resets } = shown;
  const ref = useRef<HTMLDivElement>(null);
  const showAnimation = useRef<Animation | null>(null);

  // Slide up by its full height, margins included, like allocate_toast().
  useLayoutEffect(() => {
    const el = ref.current;
    const ms = duration(replacing ? REPLACE_DURATION : SHOW_DURATION);
    if (!el || !ms || typeof el.animate !== "function") return;
    const css = getComputedStyle(el);
    const height = el.offsetHeight + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
    showAnimation.current = el.animate(
      [{ transform: `translateY(${height}px)` }, { transform: "none" }],
      { duration: ms, easing: ADW_EASE_CSS },
    );
  }, [replacing]);

  // allocate_toast() centers the toast with integer division, so it starts on
  // a whole pixel: move it left by the fraction CSS centering leaves.
  useLayoutEffect(() => {
    const el = ref.current;
    const overlay = el?.parentElement;
    if (!el || !overlay || typeof ResizeObserver !== "function") return;
    let overlayWidth = 0;
    let toastWidth = 0;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === overlay) overlayWidth = entry.contentRect.width;
        else toastWidth = entry.borderBoxSize[0]?.inlineSize ?? 0;
      }
      const css = getComputedStyle(el);
      const margins = parseFloat(css.marginLeft) + parseFloat(css.marginRight);
      const x = (overlayWidth - toastWidth - margins) / 2;
      el.style.translate = x > Math.floor(x) ? `${Math.floor(x) - x}px` : "";
    });
    observer.observe(overlay);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fade out with ease-out cubic on top of the timed animation's own ease,
  // shrinking around the toast's center, like hide_value_cb() and
  // allocate_toast().
  useLayoutEffect(() => {
    if (!hiding) return;
    const el = ref.current;
    const ms = duration(HIDE_DURATION);
    if (!el || !ms || typeof el.animate !== "function") {
      onHidden(key);
      return;
    }
    showAnimation.current?.finish();
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 30; i++) {
      const value = 1 - adwEase(i / 30);
      frames.push({
        opacity: easeOutCubic(value),
        transform: `scale(${lerp(1 - SCALE_AMOUNT, 1, value)})`,
      });
    }
    const animation = el.animate(frames, { duration: ms, fill: "forwards" });
    animation.onfinish = () => onHidden(key);
    return () => animation.cancel();
  }, [hiding, key, onHidden]);

  // The timeout runs while the toast isn't hovered, focused or pressed
  // (inhibit_hide() / uninhibit_hide()), and restarts in full afterwards.
  // Adding the toast again restarts it too (adw_toast_widget_reset_timeout()).
  const inhibit = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHiding = useRef(hiding);
  isHiding.current = hiding;
  const endTimeout = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const startTimeout = useCallback(() => {
    const seconds = toast.timeout ?? 5;
    if (!timer.current && !isHiding.current && seconds > 0)
      timer.current = setTimeout(() => onDismiss(key, toast), seconds * 1000);
  }, [toast, key, onDismiss]);
  useEffect(() => {
    if (hiding) return;
    startTimeout();
    return endTimeout;
  }, [hiding, startTimeout, endTimeout]);
  const lastResets = useRef(resets);
  useEffect(() => {
    if (resets === lastResets.current) return;
    lastResets.current = resets;
    endTimeout();
    startTimeout();
  }, [resets, startTimeout, endTimeout]);
  const inhibitHide = () => {
    if (inhibit.current++ === 0) endTimeout();
  };
  const uninhibitHide = () => {
    if (inhibit.current > 0 && --inhibit.current === 0) startTimeout();
  };

  // A press lasts until its pointer is released or cancelled, wherever that
  // happens, like the GtkGestureClick's pressed and released signals.
  const endPress = useRef<(() => void) | null>(null);
  useEffect(() => () => endPress.current?.(), []);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (endPress.current) return;
    const view = e.currentTarget.ownerDocument.defaultView;
    if (!view) return;
    const { pointerId } = e;
    const released = (event: Event) => {
      if ((event as PointerEvent).pointerId === pointerId) endPress.current?.();
    };
    endPress.current = () => {
      view.removeEventListener("pointerup", released, true);
      view.removeEventListener("pointercancel", released, true);
      endPress.current = null;
      uninhibitHide();
    };
    view.addEventListener("pointerup", released, true);
    view.addEventListener("pointercancel", released, true);
    inhibitHide();
  };

  // The action button turns insensitive once clicked, like action_clicked_cb().
  const [activated, setActivated] = useState(false);
  // Both buttons have focus-on-click=FALSE.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      ref={ref}
      role="alert"
      className="gtk-toast gtk-box-layout horizontal"
      onMouseEnter={inhibitHide}
      onMouseLeave={uninhibitHide}
      onFocus={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) inhibitHide();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) uninhibitHide();
      }}
      onPointerDown={onPointerDown}
      style={{
        alignSelf: "end",
        justifySelf: "center",
        alignItems: "center",
        boxSizing: "border-box",
        // As wide as the overlay allows, its 12px side margins included
        // (allocate_toast()); a toast with a button is at least NATURAL_WIDTH.
        // Its title ellipsizes, so it doesn't widen the overlay's cell.
        maxWidth: "calc(100% - 24px)",
        minWidth: toast.buttonLabel ? `min(${NATURAL_WIDTH - 24}px, calc(100% - 24px))` : 0,
        pointerEvents: hiding ? "none" : "auto",
        zIndex: 100,
      }}
    >
      <div className="gtk-widget" style={{ flex: 1, minWidth: 0, display: "flex" }}>
        <GtkLabel label={toast.title} ellipsize="end" xalign={0} className="heading" />
      </div>
      {toast.buttonLabel && (
        <GtkButton
          type="button"
          label={toast.buttonLabel}
          useUnderline
          canShrink
          valign="center"
          disabled={activated}
          tabIndex={hiding ? -1 : undefined}
          onMouseDown={keepFocus}
          onClicked={() => {
            setActivated(true);
            toast.onButtonClicked?.();
            onDismiss(key, toast);
          }}
        />
      )}
      <GtkButton
        type="button"
        iconName="WindowClose"
        hasFrame={false}
        className="circular"
        valign="center"
        tooltipText="Dismiss"
        tabIndex={hiding ? -1 : undefined}
        onMouseDown={keepFocus}
        onClicked={() => onDismiss(key, toast)}
      />
    </div>
  );
}
