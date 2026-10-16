import {
  Children,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  type UIEvent,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkPolicyType } from "../types.ts";
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
  /** Maximum content width. Default: -1. */
  maxContentWidth?: number;
  /** Maximum content height. Default: -1. */
  maxContentHeight?: number;
  children?: ReactNode;
}

const policyToOverflow: Record<GtkPolicyType, string> = {
  always: "scroll",
  automatic: "auto",
  never: "hidden",
  external: "hidden",
};

/**
 * The vertical edges a scrolled window isn't scrolled to, where GTK draws its
 * undershoot nodes (gtk_scrolled_window_snapshot_undershoot()).
 */
export function undershootEdges(el: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): { top: boolean; bottom: boolean } {
  return {
    top: el.scrollTop > 0,
    // A fractional scroll position can stop just short of the end.
    bottom: el.scrollTop < el.scrollHeight - el.clientHeight - 0.5,
  };
}

/**
 * Whether a child scrolls itself (GtkScrollable): a text view, or a viewport a
 * component builds itself. gtk_scrolled_window_set_child() puts any other
 * child in a GtkViewport.
 */
function isScrollable(child: ReactNode): boolean {
  if (!isValidElement<{ className?: unknown }>(child)) return false;
  if (child.type === GtkTextView) return true;
  const { className } = child.props;
  return typeof className === "string" && className.split(/\s+/).includes("gtk-viewport");
}

/**
 * GtkScrolledWindow — A scrollable container.
 *
 * CSS node: scrolledwindow[.frame]
 *   ├── [child]
 *   └── undershoot.top / undershoot.bottom   (while not scrolled to that edge)
 *
 * Uses native browser scrolling via CSS overflow. The theme draws a shade
 * along an undershoot, e.g. under the flat top bar of an AdwToolbarView.
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
      children,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      style,
      onScroll,
      ...rest
    },
    ref,
  ) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => scrollerRef.current as HTMLDivElement);

    const [undershoot, setUndershoot] = useState({ top: false, bottom: false });
    const updateUndershoot = useCallback(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = undershootEdges(el);
      setUndershoot((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
    }, []);
    // Content that grows or shrinks moves the edges too.
    useLayoutEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      updateUndershoot();
      const resizes = new ResizeObserver(updateUndershoot);
      const observe = () => {
        resizes.disconnect();
        resizes.observe(el);
        for (const child of el.children) resizes.observe(child);
      };
      observe();
      const children = new MutationObserver(() => {
        observe();
        updateUndershoot();
      });
      children.observe(el, { childList: true });
      return () => {
        resizes.disconnect();
        children.disconnect();
      };
    }, [updateUndershoot]);
    const handleScroll = useCallback(
      (e: UIEvent<HTMLDivElement>) => {
        updateUndershoot();
        onScroll?.(e);
      },
      [updateUndershoot, onScroll],
    );

    const classes = ["gtk-scrolledwindow"];
    if (hasFrame) classes.push("frame");
    if (className) classes.push(className);

    const cssStyle: React.CSSProperties = {
      overflowX: policyToOverflow[hscrollbarPolicy] as React.CSSProperties["overflowX"],
      overflowY: policyToOverflow[vscrollbarPolicy] as React.CSSProperties["overflowY"],
      minWidth: minContentWidth >= 0 ? minContentWidth : undefined,
      minHeight: minContentHeight >= 0 ? minContentHeight : undefined,
      maxWidth: maxContentWidth >= 0 ? maxContentWidth : undefined,
      maxHeight: maxContentHeight >= 0 ? maxContentHeight : undefined,
      ...style,
    };

    return (
      <div
        ref={scrollerRef}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        style={cssStyle}
        onScroll={handleScroll}
        {...rest}
      >
        {undershoot.top && <div className="gtk-undershoot top" />}
        {Children.count(children) === 1 && !isScrollable(children) ? (
          <div className="gtk-viewport gtk-bin-layout">{children}</div>
        ) : (
          children
        )}
        {undershoot.bottom && <div className="gtk-undershoot bottom" />}
      </div>
    );
  },
);
