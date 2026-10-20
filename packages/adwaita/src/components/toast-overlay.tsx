import { tooltipAttrs, useIcon } from "@gtk-js/gtk4";
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
import { animationSlowdown, prefersReducedMotion } from "../spring.ts";
import type { AdwToastPriority } from "../types.ts";

export interface AdwToast {
  title: string;
  buttonLabel?: string;
  timeout?: number;
  priority?: AdwToastPriority;
  useMarkup?: boolean;
  onButtonClicked?: () => void;
  onDismissed?: () => void;
}

export interface AdwToastOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface AdwToastOverlayRef {
  addToast: (toast: AdwToast) => void;
}

// adw-toast-overlay.c
const SHOW_DURATION = 300;
const HIDE_DURATION = 300;
const REPLACE_DURATION = 500;
const SCALE_AMOUNT = 0.05;
const NATURAL_WIDTH = 450;

/** A toast being shown; `key` changes each time it's shown again after being postponed. */
interface Shown {
  key: number;
  toast: AdwToast;
  /** Shown while other toasts were still hiding (REPLACE_DURATION). */
  replacing: boolean;
}

interface OverlayState {
  current: Shown | null;
  hiding: Shown[];
  queue: AdwToast[];
}

let nextKey = 0;

function duration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms * animationSlowdown();
}

/**
 * AdwToastOverlay — A container that displays toast notifications.
 *
 * Like upstream, a toast slides up from the bottom edge (ADW_EASE, 300ms, or
 * 500ms when it replaces one), and a dismissed toast fades out (ease-out
 * cubic) while shrinking to 95% (300ms), staying on screen until then. Its
 * timeout restarts after the pointer leaves it, focus leaves it or a press
 * ends. A high-priority toast postpones the current one to the front of the
 * queue.
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
>(function AdwToastOverlay({ children, toastRef, className, style, ...rest }, ref) {
  const [state, setState] = useState<OverlayState>({ current: null, hiding: [], queue: [] });
  const show = (s: OverlayState, toast: AdwToast | undefined): Shown | null =>
    toast ? { key: ++nextKey, toast, replacing: s.hiding.length > 0 } : null;

  const addToast = useCallback((toast: AdwToast) => {
    setState((s) => {
      if (s.current?.toast === toast || s.queue.includes(toast)) return s;
      if (!s.current) return { ...s, current: show(s, toast) };
      if (toast.priority === "high") {
        // Postpone the current toast: it hides, and shows again next.
        const hiding = [...s.hiding, s.current];
        return {
          current: { key: ++nextKey, toast, replacing: true },
          hiding,
          queue: [s.current.toast, ...s.queue],
        };
      }
      return { ...s, queue: [...s.queue, toast] };
    });
  }, []);

  React.useImperativeHandle(toastRef, () => ({ addToast }), [addToast]);

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

  const hidden = useCallback((key: number) => {
    dismissed.current.delete(key);
    setState((s) => ({ ...s, hiding: s.hiding.filter((t) => t.key !== key) }));
  }, []);

  const classes = ["gtk-toastoverlay"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      style={{ position: "relative", ...style }}
      {...rest}
    >
      {children}
      {(state.current || state.hiding.length > 0) && (
        // Toasts share one cell at the bottom center, over the child.
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          {state.hiding.map((t) => (
            <ToastWidget key={t.key} shown={t} hiding onDismiss={dismiss} onHidden={hidden} />
          ))}
          {state.current && (
            <ToastWidget
              key={state.current.key}
              shown={state.current}
              hiding={false}
              onDismiss={dismiss}
              onHidden={hidden}
            />
          )}
        </div>
      )}
    </div>
  );
});

interface ToastWidgetProps {
  shown: Shown;
  hiding: boolean;
  onDismiss: (key: number, toast: AdwToast) => void;
  onHidden: (key: number) => void;
}

/** AdwToastWidget: the toast node, its animations and its timeout. */
function ToastWidget({ shown, hiding, onDismiss, onHidden }: ToastWidgetProps) {
  const { key, toast, replacing } = shown;
  const ref = useRef<HTMLDivElement>(null);
  const showAnimation = useRef<Animation | null>(null);
  const CloseIcon = useIcon("WindowClose");

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
  const inhibit = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimeout = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const startTimeout = useCallback(() => {
    const seconds = toast.timeout ?? 5;
    if (!timer.current && seconds > 0)
      timer.current = setTimeout(() => onDismiss(key, toast), seconds * 1000);
  }, [toast, key, onDismiss]);
  useEffect(() => {
    if (hiding) return;
    startTimeout();
    return endTimeout;
  }, [hiding, startTimeout, endTimeout]);
  const inhibitHide = () => {
    if (inhibit.current++ === 0) endTimeout();
  };
  const uninhibitHide = () => {
    if (inhibit.current > 0 && --inhibit.current === 0 && !hiding) startTimeout();
  };

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
      onPointerDown={inhibitHide}
      onPointerUp={uninhibitHide}
      style={{
        gridArea: "1 / 1",
        alignSelf: "end",
        justifySelf: "center",
        alignItems: "center",
        boxSizing: "border-box",
        // A toast with a button is at least NATURAL_WIDTH wide, its 12px side
        // margins included, as far as the overlay allows.
        minWidth: toast.buttonLabel ? `min(${NATURAL_WIDTH - 24}px, calc(100% - 24px))` : undefined,
        pointerEvents: hiding ? "none" : "auto",
      }}
    >
      <div className="gtk-widget" style={{ flex: 1, minWidth: 0, display: "flex" }}>
        <span
          className="gtk-label heading"
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {toast.title}
        </span>
      </div>
      {toast.buttonLabel && (
        <button
          type="button"
          className="gtk-button text-button gtk-bin-layout"
          tabIndex={hiding ? -1 : undefined}
          onClick={() => {
            toast.onButtonClicked?.();
            onDismiss(key, toast);
          }}
        >
          <span className="gtk-label">{toast.buttonLabel}</span>
        </button>
      )}
      <button
        type="button"
        className="gtk-button circular flat image-button gtk-bin-layout"
        {...tooltipAttrs("Dismiss")}
        tabIndex={hiding ? -1 : undefined}
        onClick={() => onDismiss(key, toast)}
      >
        <span className="gtk-image">{CloseIcon && <CloseIcon size={16} />}</span>
      </button>
    </div>
  );
}
