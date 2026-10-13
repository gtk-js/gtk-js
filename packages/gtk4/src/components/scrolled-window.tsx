import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { alignAttrs, type GtkAlignProps, type GtkPolicyType } from "../types.ts";

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
 * GtkScrolledWindow — A scrollable container.
 *
 * CSS node: scrolledwindow[.frame]
 *
 * Uses native browser scrolling via CSS overflow.
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
      ...rest
    },
    ref,
  ) {
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
        ref={ref}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        style={cssStyle}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
