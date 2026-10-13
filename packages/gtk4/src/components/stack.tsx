import React, {
  Children,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkStackTransitionType } from "../types.ts";

export interface GtkStackPageProps {
  /** Unique name for this page. */
  name: string;
  /** Human-readable title (for StackSwitcher). */
  title?: string;
  /** Icon name (for StackSwitcher). */
  iconName?: string;
  /** Whether this page needs attention. Default: false. */
  needsAttention?: boolean;
  children: ReactNode;
}

/**
 * GtkStackPage — Declares a page in a GtkStack. Not rendered directly.
 */
export function GtkStackPage(_props: GtkStackPageProps): ReactElement | null {
  return null; // Rendered by GtkStack
}

export interface GtkStackProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Name of the visible child. */
  visibleChildName?: string;
  /** Transition type. Default: "none". */
  transitionType?: GtkStackTransitionType;
  /** Transition duration in ms. Default: 200. */
  transitionDuration?: number;
  /** Horizontal homogeneous. Default: true. */
  hhomogeneous?: boolean;
  /** Vertical homogeneous. Default: true. */
  vhomogeneous?: boolean;
  /** Callback when visible page changes. */
  onVisibleChildChanged?: (name: string) => void;
  children?: ReactNode;
}

/**
 * GtkStack — A container that shows one child at a time.
 *
 * CSS node: stack
 *
 * Children should be GtkStackPage components.
 *
 * @see https://docs.gtk.org/gtk4/class.Stack.html
 */
export const GtkStack = forwardRef<HTMLDivElement, GtkStackProps>(function GtkStack(
  {
    visibleChildName: controlledVisible,
    transitionType = "none",
    transitionDuration = 200,
    hhomogeneous = true,
    vhomogeneous = true,
    onVisibleChildChanged,
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
  // Extract page info from children
  const pages: Array<GtkStackPageProps & { element: ReactNode }> = [];
  Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === GtkStackPage) {
      const props = child.props as GtkStackPageProps;
      pages.push({ ...props, element: props.children });
    }
  });

  const firstName = pages[0]?.name ?? "";
  const isControlled = controlledVisible !== undefined;
  const [internalVisible, _setInternalVisible] = useState(firstName);
  const visibleName = isControlled ? controlledVisible : internalVisible;

  const classes = ["gtk-stack"];
  if (className) classes.push(className);

  const transitionStyle: React.CSSProperties =
    transitionType !== "none" ? { transition: `opacity ${transitionDuration}ms ease` } : {};

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={{ position: "relative", ...transitionStyle, ...style }}
      {...rest}
    >
      {pages.map((page) => {
        if (page.name === visibleName) return <Fragment key={page.name}>{page.element}</Fragment>;
        if (!hhomogeneous && !vhomogeneous) return null;
        // A homogeneous stack is as large as its largest page: hidden pages
        // stay laid out in the same cell, invisibly, along homogeneous axes.
        return (
          <div
            key={page.name}
            aria-hidden
            style={{
              visibility: "hidden",
              ...(hhomogeneous ? null : { width: 0 }),
              ...(vhomogeneous ? null : { height: 0 }),
              overflow: hhomogeneous && vhomogeneous ? undefined : "hidden",
            }}
          >
            {page.element}
          </div>
        );
      })}
    </div>
  );
});

export interface GtkStackSwitcherProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The associated GtkStack's pages. Pass the same children as GtkStack. */
  pages: Array<{ name: string; title?: string; iconName?: string; needsAttention?: boolean }>;
  /** Currently active page name. */
  activePageName?: string;
  /** Callback when user clicks a tab. */
  onPageChanged?: (name: string) => void;
}

/**
 * GtkStackSwitcher — Tab bar for a GtkStack.
 *
 * CSS node: stackswitcher
 *
 * @see https://docs.gtk.org/gtk4/class.StackSwitcher.html
 */
export const GtkStackSwitcher = forwardRef<HTMLDivElement, GtkStackSwitcherProps>(
  function GtkStackSwitcher(
    { pages, activePageName, onPageChanged, halign, valign, hexpand, vexpand, className, ...rest },
    ref,
  ) {
    const classes = ["gtk-stackswitcher", "gtk-box-layout", "horizontal", "linked"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="tablist"
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {pages.map((page) => {
          const isActive = page.name === activePageName;
          const btnClasses = ["gtk-button", "toggle"];
          if (page.title && !page.iconName) btnClasses.push("text-button");
          if (page.iconName && !page.title) btnClasses.push("image-button");
          if (page.needsAttention) btnClasses.push("needs-attention");

          return (
            <button
              key={page.name}
              role="tab"
              aria-selected={isActive}
              data-checked={isActive || undefined}
              className={btnClasses.join(" ")}
              onClick={() => onPageChanged?.(page.name)}
            >
              {page.iconName && <span className="gtk-image" />}
              {page.title && <span className="gtk-label">{page.title}</span>}
            </button>
          );
        })}
      </div>
    );
  },
);
