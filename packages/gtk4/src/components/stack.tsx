import React, {
  Children,
  cloneElement,
  Fragment,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkOrientation,
  type GtkStackTransitionType,
} from "../types.ts";
import { GtkImage } from "./image.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkToggleButton } from "./toggle-button.tsx";

export interface GtkStackPageProps {
  /** Unique name for this page. */
  name: string;
  /** Human-readable title (for StackSwitcher). */
  title?: string;
  /** Icon name (for StackSwitcher). */
  iconName?: string;
  /** Whether this page needs attention. Default: false. */
  needsAttention?: boolean;
  /** Whether the page is shown at all: an invisible page is never the visible child. Default: true. */
  visible?: boolean;
  /**
   * The page's widget. While the page is hidden it gets `data-stack-hidden`,
   * `aria-hidden` and `inert`, so a component of your own must pass unknown
   * props on to its root element, as gtk-js widgets do. Anything else (text,
   * a fragment, several elements) is wrapped in a `<div>`.
   */
  children: ReactNode;
}

/**
 * GtkStackPage — Declares a page in a GtkStack. Not rendered directly.
 */
export function GtkStackPage(_props: GtkStackPageProps): ReactElement | null {
  return null; // Rendered by GtkStack
}

export interface GtkStackProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Name of the visible child. Default: the first visible page. */
  visibleChildName?: string;
  /** Transition type. Default: "none". */
  transitionType?: GtkStackTransitionType;
  /** Transition duration in ms. Default: 200. */
  transitionDuration?: number;
  /** Horizontal homogeneous. Default: true. */
  hhomogeneous?: boolean;
  /** Vertical homogeneous. Default: true. */
  vhomogeneous?: boolean;
  /** Callback when the visible page changes. */
  onVisibleChildChanged?: (name: string) => void;
  children?: ReactNode;
}

type StackPage = Omit<GtkStackPageProps, "children"> & { widget: ReactElement };

/** A transition from the page that was visible, as gtk_stack_start_transition() runs it. */
interface StackTransition {
  from: string;
  type: GtkStackTransitionType;
}

/**
 * The visible child: the named page, or else the one shown so far. Like
 * gtk_stack_set_visible_child_name(), an unknown name keeps the current page.
 * A stack without a visible child shows the first visible page added
 * (gtk_stack_add_page()), and hiding the visible page shows the first visible
 * one (update_child_visible()). Removing it leaves no visible child (null),
 * as stack_remove() does, until a page is added.
 */
function resolveVisible(
  pages: StackPage[],
  name?: string,
  shown?: string | null,
  seen: string[] = [],
): string | null | undefined {
  const visible = pages.filter((page) => page.visible !== false);
  const has = (n?: string | null) => n != null && visible.some((page) => page.name === n);
  if (has(name)) return name;
  if (has(shown)) return shown;
  if (shown === undefined || pages.some((page) => page.name === shown)) return visible[0]?.name;
  return visible.find((page) => !seen.includes(page.name))?.name ?? null;
}

/** get_simple_transition_type(): [new page first, new page last] in page order. */
const BY_PAGE_ORDER: Partial<
  Record<GtkStackTransitionType, [GtkStackTransitionType, GtkStackTransitionType]>
> = {
  "slide-left-right": ["slide-right", "slide-left"],
  "slide-up-down": ["slide-down", "slide-up"],
  "over-up-down": ["under-down", "over-up"],
  "over-down-up": ["under-up", "over-down"],
  "over-left-right": ["under-right", "over-left"],
  "over-right-left": ["under-left", "over-right"],
  "rotate-left-right": ["rotate-right", "rotate-left"],
};

/** Like gtk_stack_start_transition(): animations need GTK's enable-animations. */
function stackTransition(
  type: GtkStackTransitionType,
  duration: number,
  pages: StackPage[],
  from?: string,
  to?: string,
): StackTransition | null {
  const fromIndex = pages.findIndex((page) => page.name === from);
  const toIndex = pages.findIndex((page) => page.name === to);
  if (type === "none" || duration <= 0 || fromIndex < 0 || toIndex < 0) return null;
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }
  const byOrder = BY_PAGE_ORDER[type];
  return { from: from!, type: byOrder ? byOrder[toIndex < fromIndex ? 0 : 1] : type };
}

/** ease-out-cubic, as gtk_progress_tracker_get_ease_out_cubic(). */
const EASE_OUT_CUBIC = "cubic-bezier(0.215, 0.61, 0.355, 1)";

interface TransitionFrames {
  easing: string;
  entering?: Keyframe[];
  leaving?: Keyframe[];
}

/** The new and old pages' animations, as gtk_stack_snapshot() draws a transition. */
function transitionFrames(type: GtkStackTransitionType, w: number, h: number): TransitionFrames {
  const [kind, side] = type.split("-") as [string, "left" | "right" | "up" | "down"];
  // Where the new page comes from: get_bin_window_x() / get_bin_window_y().
  const offsets: Record<string, [number, number]> = {
    left: [w, 0],
    right: [-w, 0],
    up: [0, h],
    down: [0, -h],
  };
  const [x, y] = offsets[side] ?? [0, 0];
  const from = { transform: `translate(${x}px, ${y}px)` };
  const away = { transform: `translate(${-x}px, ${-y}px)` };
  const none = { transform: "none" };
  switch (kind) {
    case "crossfade": {
      // gtk_snapshot_push_cross_fade(): the pages' colors add up (in the
      // stack's isolated group), rather than one fading over the other.
      const blend = { mixBlendMode: "plus-lighter" };
      return {
        easing: "linear",
        entering: [
          { ...blend, opacity: 0 },
          { ...blend, opacity: 1 },
        ],
        leaving: [
          { ...blend, opacity: 1 },
          { ...blend, opacity: 0 },
        ],
      };
    }
    case "slide":
      return { easing: EASE_OUT_CUBIC, entering: [from, none], leaving: [none, away] };
    case "over":
      return {
        easing: EASE_OUT_CUBIC,
        entering: [
          { ...from, zIndex: 1 },
          { ...none, zIndex: 1 },
        ],
      };
    case "under": {
      // gtk_stack_snapshot_under(): the old page moves off over the new one,
      // which shows only where it's uncovered.
      const clip = {
        left: "0 0 0 100%",
        right: "0 100% 0 0",
        up: "100% 0 0 0",
        down: "0 0 100% 0",
      };
      return {
        easing: EASE_OUT_CUBIC,
        entering: [{ clipPath: `inset(${clip[side]})` }, { clipPath: "inset(0)" }],
        leaving: [
          { ...none, zIndex: 1 },
          { ...away, zIndex: 1 },
        ],
      };
    }
    default: {
      // gtk_stack_snapshot_cube(): the pages are two sides of a cube turning
      // about its vertical axis.
      const turn = (deg: number) => ({
        transform: `perspective(${2 * w}px) translateZ(${-w / 2}px) rotateY(${deg}deg) translateZ(${w / 2}px)`,
      });
      const sign = side === "left" ? 1 : -1;
      return {
        easing: "linear",
        entering: [turn(90 * sign), turn(0)],
        leaving: [turn(0), turn(-90 * sign)],
      };
    }
  }
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/** The first element Tab would focus in a page, like gtk_widget_child_focus(). */
function firstFocusable(page: Element): HTMLElement | undefined {
  return [page, ...page.querySelectorAll(FOCUSABLE)].find(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.matches(FOCUSABLE) &&
      el.tabIndex >= 0 &&
      !el.matches(":disabled") &&
      el.getClientRects().length > 0,
  );
}

/**
 * GtkStack — A container that shows one child at a time.
 *
 * CSS node: stack
 *
 * Children should be GtkStackPage components. Every page stays mounted, so
 * the state inside a hidden page is kept, as GTK keeps its widgets.
 *
 * @see https://docs.gtk.org/gtk4/class.Stack.html
 */
export const GtkStack = forwardRef<HTMLDivElement, GtkStackProps>(function GtkStack(
  {
    visibleChildName,
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
  const stackRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => stackRef.current as HTMLDivElement);

  // Extract page info from children. A page's widget is its child element,
  // which the stack renders itself (GTK has no node between them).
  const pages: StackPage[] = [];
  Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === GtkStackPage) {
      const { children: content, ...props } = child.props as GtkStackPageProps;
      const widget =
        isValidElement(content) && content.type !== Fragment ? content : <div>{content}</div>;
      pages.push({ ...props, widget });
    }
  });

  const names = pages.map((page) => page.name);
  const [seen, setSeen] = useState(names);
  const [shown, setShown] = useState(() => resolveVisible(pages, visibleChildName));
  const resolved = resolveVisible(pages, visibleChildName, shown, seen);
  const visibleName = resolved ?? undefined;
  if (names.length !== seen.length || names.some((name, i) => name !== seen[i])) setSeen(names);

  // Start a transition while rendering (React's "adjust state when a prop
  // changes"), so the old page is never hidden for a frame before it runs.
  const [transition, setTransition] = useState<StackTransition | null>(null);
  // The focus as set_visible_child() finds it, before the old page is hidden
  // (a browser may move the focus off a hidden element before effects run).
  const [switchFocus, setSwitchFocus] = useState<Element | null>(null);
  if (resolved !== shown) {
    setShown(resolved);
    setTransition(
      stackTransition(transitionType, transitionDuration, pages, shown ?? undefined, visibleName),
    );
    setSwitchFocus(typeof document === "undefined" ? null : document.activeElement);
  }

  // Like set_visible_child(): when the focus is inside the old page, it's
  // kept as that page's last focus, and the new page gets its own last focus
  // or its first focusable widget.
  const lastFocus = useRef(new WeakMap<Element, Element>());
  useLayoutEffect(() => {
    const stack = stackRef.current;
    const focus = switchFocus;
    if (!stack || !focus) return;
    setSwitchFocus(null);
    const active = document.activeElement;
    if (active !== focus && active !== document.body) return;
    let oldPage: Element | null = focus;
    while (oldPage && oldPage.parentElement !== stack) oldPage = oldPage.parentElement;
    // Only a focus inside the page counts, as gtk_widget_is_ancestor() checks.
    if (!oldPage || oldPage === focus || !oldPage.hasAttribute("data-stack-hidden")) return;
    lastFocus.current.set(oldPage, focus);
    const page = stack.querySelector(":scope > :not([data-stack-hidden], [hidden])");
    if (!page) return;
    const last = lastFocus.current.get(page);
    const target = last?.isConnected && page.contains(last) ? last : firstFocusable(page);
    (target as HTMLElement | undefined)?.focus();
  }, [switchFocus]);

  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!transition || !stack) return;
    // effective_transition_type(): left and right swap in RTL.
    const rtl = getComputedStyle(stack).direction === "rtl";
    const type = rtl
      ? (transition.type.replace(/left$|right$/, (s) =>
          s === "left" ? "right" : "left",
        ) as GtkStackTransitionType)
      : transition.type;
    const frames = transitionFrames(type, stack.clientWidth, stack.clientHeight);
    const options: KeyframeAnimationOptions = {
      duration: transitionDuration,
      easing: frames.easing,
      // Held until the old page is hidden, in the same commit.
      fill: "forwards",
    };
    const animations: Animation[] = [];
    for (const page of stack.children) {
      const keyframes = page.hasAttribute("data-stack-leaving")
        ? frames.leaving
        : page.matches("[data-stack-hidden], [hidden]")
          ? undefined
          : frames.entering;
      if (keyframes && typeof page.animate === "function") {
        animations.push(page.animate(keyframes, options));
      }
    }
    Promise.all(animations.map((animation) => animation.finished)).then(
      () => setTransition((t) => (t === transition ? null : t)),
      () => {}, // Cancelled by the next switch.
    );
    return () => {
      for (const animation of animations) animation.cancel();
    };
  }, [transition]);

  // GtkStack notifies visible-child-name whenever the visible page changes.
  const notifiedName = useRef(visibleName);
  useEffect(() => {
    if (notifiedName.current === visibleName) return;
    notifiedName.current = visibleName;
    if (visibleName !== undefined) onVisibleChildChanged?.(visibleName);
  }, [visibleName]);

  const classes = ["gtk-stack"];
  if (className) classes.push(className);

  return (
    <div
      ref={stackRef}
      role="group"
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-hhomogeneous={hhomogeneous ? undefined : "false"}
      data-vhomogeneous={vhomogeneous ? undefined : "false"}
      data-transition-running={transition ? "" : undefined}
      style={{ position: "relative", ...style }}
      {...rest}
    >
      {/* Every page keeps its element type and place, so React keeps its
          state; a hidden page is only marked (see layout.css), like
          gtk_widget_set_child_visible(). */}
      {pages.map(({ name, visible, widget }) => {
        let state: Record<string, unknown> | null = null;
        if (visible === false) state = { hidden: true };
        else if (name !== visibleName) {
          state = {
            "data-stack-hidden": "",
            "data-stack-leaving": name === transition?.from ? "" : undefined,
            "aria-hidden": true,
            inert: true,
          };
        }
        return cloneElement(widget as ReactElement<Record<string, unknown>>, {
          key: name,
          ...state,
        });
      })}
    </div>
  );
});

export interface GtkStackSwitcherProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** The associated GtkStack's pages. Pass the same children as GtkStack. */
  pages: Array<{
    name: string;
    title?: string;
    iconName?: string;
    needsAttention?: boolean;
    visible?: boolean;
  }>;
  /** Currently active page name. */
  activePageName?: string;
  /** Callback when the user switches to another tab. */
  onPageChanged?: (name: string) => void;
  /** The direction the tabs are laid out in (GtkOrientable). Default: "horizontal". */
  orientation?: GtkOrientation;
}

/**
 * GtkStackSwitcher — Tab bar for a GtkStack.
 *
 * CSS node:
 *   stackswitcher.linked
 *     └── button.toggle[.text-button|.image-button][.needs-attention]
 *           └── label | image
 *
 * @see https://docs.gtk.org/gtk4/class.StackSwitcher.html
 */
export const GtkStackSwitcher = forwardRef<HTMLDivElement, GtkStackSwitcherProps>(
  function GtkStackSwitcher(
    {
      pages,
      activePageName,
      onPageChanged,
      orientation = "horizontal",
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      ...rest
    },
    ref,
  ) {
    const classes = ["gtk-stackswitcher", orientation, "linked"];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {pages.map((page) => {
          // update_button(): only a visible page with a title or an icon has a tab.
          if (page.visible === false || (page.title == null && page.iconName == null)) return null;
          const isActive = page.name === activePageName;
          // rebuild_child(): an icon (the title is its tooltip), or else the title.
          // GtkButton makes it an .image-button or .text-button from that child.
          const btnClasses = page.needsAttention ? ["needs-attention"] : [];

          return (
            <GtkToggleButton
              key={page.name}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-pressed={undefined}
              aria-label={page.title}
              tooltipText={page.iconName != null ? page.title : undefined}
              className={btnClasses.join(" ") || undefined}
              // add_child(): the tabs expand and don't take the focus on click.
              hexpand
              vexpand
              onMouseDown={(e) => e.preventDefault()}
              active={isActive}
              // on_button_toggled(): the active tab can't be toggled off.
              onToggled={(active) => active && onPageChanged?.(page.name)}
            >
              {page.iconName != null ? (
                <GtkImage iconName={page.iconName} halign="center" />
              ) : (
                <GtkLabel label={page.title ?? ""} halign="center" />
              )}
            </GtkToggleButton>
          );
        })}
      </div>
    );
  },
);
