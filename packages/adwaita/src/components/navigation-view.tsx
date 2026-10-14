import React, {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animateSpring, NAVIGATION_SPRING, type SpringAnimationHandle } from "../spring.ts";

export interface AdwNavigationPageProps {
  tag: string;
  title?: string;
  canPop?: boolean;
  children: ReactNode;
}

export interface NavigationContextValue {
  /** Push the page with `tag` onto the nearest navigation view. */
  push: (tag: string) => void;
  /** Pop the visible page. Returns false when there is nothing to pop. */
  pop: () => boolean;
  /** Whether a back button should be shown. */
  canPop: boolean;
}

export const NavContext = createContext<NavigationContextValue>({
  push: () => {},
  pop: () => false,
  canPop: false,
});

export function useNavigation() {
  return useContext(NavContext);
}

export interface AdwNavigationViewProps extends HTMLAttributes<HTMLDivElement> {
  pages: AdwNavigationPageProps[];
  initialPage?: string;
  /**
   * Controlled navigation stack (tags, root first). When set, the view shows
   * the last tag and reports navigation through `onStackChange`.
   */
  stack?: string[];
  onStackChange?: (stack: string[]) => void;
  animateTransitions?: boolean;
  popOnEscape?: boolean;
  onPushed?: (tag: string) => void;
  onPopped?: (tag: string) => void;
}

interface Transition {
  key: number;
  pop: boolean;
  showing: string;
  hiding: string;
}

const sameTags = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((tag, i) => b[i] === tag));

const isPrefix = (prefix: string[], of: string[]) =>
  prefix.length < of.length && prefix.every((tag, i) => of[i] === tag);

/**
 * AdwNavigationView — A stack-based navigation container.
 *
 * Mirrors upstream's transition: the page underneath stays still and dims
 * while the top page slides over it with a shadow on its leading edge,
 * driven by a critically damped spring (damping 1, mass 1, stiffness 1000).
 * Pages stay mounted while they are on the stack, so their state survives
 * navigating into a child page and back.
 *
 * CSS node:
 *   navigation-view
 *     ├── [pages]
 *     ├── dimming
 *     └── shadow.left|.right
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.NavigationView.html
 * @see upstream/libadwaita/src/adw-navigation-view.c
 */
export const AdwNavigationView = forwardRef<HTMLDivElement, AdwNavigationViewProps>(
  function AdwNavigationView(
    {
      pages,
      initialPage,
      stack: controlledStack,
      onStackChange,
      animateTransitions = true,
      popOnEscape = true,
      onPushed,
      onPopped,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const parentNav = useContext(NavContext);
    const [internalStack, setInternalStack] = useState<string[]>(() => [
      initialPage ?? pages[0]?.tag ?? "",
    ]);
    const stack = controlledStack ?? internalStack;
    const stackRef = useRef(stack);
    stackRef.current = stack;

    const setStack = useCallback(
      (next: string[]) => {
        if (controlledStack === undefined) setInternalStack(next);
        onStackChange?.(next);
      },
      [controlledStack, onStackChange],
    );

    const push = useCallback(
      (tag: string) => {
        const current = stackRef.current;
        if (current[current.length - 1] === tag) return;
        const existing = current.indexOf(tag);
        const next = existing >= 0 ? current.slice(0, existing + 1) : [...current, tag];
        setStack(next);
        onPushed?.(tag);
      },
      [setStack, onPushed],
    );

    const visibleTag = stack[stack.length - 1] ?? "";
    const visiblePage = pages.find((p) => p.tag === visibleTag);
    const canPopSelf = stack.length > 1 && visiblePage?.canPop !== false;

    const pop = useCallback((): boolean => {
      const current = stackRef.current;
      if (current.length <= 1) return false;
      const popped = current[current.length - 1]!;
      setStack(current.slice(0, -1));
      onPopped?.(popped);
      return true;
    }, [setStack, onPopped]);

    // --- transitions -------------------------------------------------------

    const [transition, setTransition] = useState<Transition | null>(null);
    const animationRef = useRef<SpringAnimationHandle | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const pageRefs = useRef(new Map<string, HTMLDivElement>());
    const dimmingRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);

    // Detect navigation while rendering (React's "adjust state when a prop
    // changes" pattern), so the page being popped is never unmounted for a
    // render before its transition starts — that would remount it and lose
    // its state.
    const [prevStack, setPrevStack] = useState(stack);
    if (!sameTags(prevStack, stack)) {
      setPrevStack(stack);
      const prevTop = prevStack[prevStack.length - 1];
      const nextTop = stack[stack.length - 1];
      if (prevTop && nextTop && prevTop !== nextTop) {
        setTransition(
          animateTransitions
            ? {
                key: (transition?.key ?? 0) + 1,
                pop: isPrefix(stack, prevStack),
                showing: nextTop,
                hiding: prevTop,
              }
            : null,
        );
      }
    }

    // Keep keyboard focus inside the view when the visible page changes (GTK
    // moves focus to the new page), so Escape/Alt+Left keep working instead
    // of reaching outer handlers.
    const focusedTopRef = useRef(stack[stack.length - 1]);
    useLayoutEffect(() => {
      const top = stack[stack.length - 1];
      if (focusedTopRef.current === top) return;
      focusedTopRef.current = top;
      const root = rootRef.current;
      const active = document.activeElement;
      if (
        root &&
        (!active ||
          active === document.body ||
          (root.contains(active) && active.closest("[inert]")))
      ) {
        root.focus({ preventScroll: true });
      }
    }, [stack]);

    // Drive the active transition, writing styles directly to avoid re-rendering
    // page contents on every frame.
    useLayoutEffect(() => {
      if (!transition) return;
      const root = rootRef.current;
      const moving = pageRefs.current.get(transition.pop ? transition.hiding : transition.showing);
      const staticPage = pageRefs.current.get(
        transition.pop ? transition.showing : transition.hiding,
      );
      const dimming = dimmingRef.current;
      const shadow = shadowRef.current;
      if (!root || !moving) return;
      const rtl = getComputedStyle(root).direction === "rtl";
      const width = root.clientWidth;
      const shadowSize = shadow?.offsetWidth || 56;

      const apply = (value: number) => {
        // Same convention as adw_navigation_view_size_allocate().
        const progress = transition.pop ? value : 1 - value;
        const offset = Math.round(progress * width);
        moving.style.transform = `translateX(${rtl ? -offset : offset}px)`;
        // Like adw_navigation_view_snapshot(): only the uncovered part of the
        // page underneath is drawn.
        if (staticPage) {
          const hidden = Math.max(0, width - offset);
          staticPage.style.clipPath = rtl ? `inset(0 0 0 ${hidden}px)` : `inset(0 ${hidden}px 0 0)`;
        }
        if (dimming) {
          dimming.style.width = `${Math.max(0, offset)}px`;
          dimming.style.opacity = String(1 - progress);
        }
        if (shadow) {
          const remaining = (1 - progress) * width;
          shadow.style.opacity = String(remaining < shadowSize ? remaining / shadowSize : 1);
          shadow.style.transform = `translateX(${rtl ? -(offset - shadowSize) : offset - shadowSize}px)`;
        }
      };

      const key = transition.key;
      animationRef.current = animateSpring({
        params: NAVIGATION_SPRING,
        from: 0,
        to: 1,
        clamp: transition.pop,
        onValue: apply,
        onDone: () => {
          animationRef.current = null;
          // The clip comes off in the cleanup below, in the same commit that
          // hides the page: pages have no background, so clearing it here
          // would show the page underneath through the new one for a frame.
          setTransition((t) => (t?.key === key ? null : t));
          if (document.activeElement === root) {
            pageRefs.current.get(transition.showing)?.focus({ preventScroll: true });
          }
        },
      });
      return () => {
        animationRef.current?.cancel();
        if (staticPage) staticPage.style.clipPath = "";
      };
    }, [transition]);

    useEffect(() => () => animationRef.current?.cancel(), []);

    // --- input -------------------------------------------------------------

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!canPopSelf) return;
        if ((popOnEscape && e.key === "Escape") || (e.altKey && e.key === "ArrowLeft")) {
          e.preventDefault();
          e.stopPropagation();
          pop();
        }
      },
      [popOnEscape, canPopSelf, pop],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        // Mouse "back" button.
        if (e.button === 3 && canPopSelf) {
          e.preventDefault();
          e.stopPropagation();
          pop();
        }
      },
      [canPopSelf, pop],
    );

    // At the root page, back buttons belong to an enclosing navigator (e.g. a
    // collapsed AdwNavigationSplitView), like upstream's header bar logic.
    const contextValue = useMemo<NavigationContextValue>(
      () => ({
        push,
        pop: canPopSelf ? pop : parentNav.pop,
        canPop: canPopSelf || parentNav.canPop,
      }),
      [push, pop, canPopSelf, parentNav],
    );

    // --- render ------------------------------------------------------------

    // Like AdwBackButton, a page's back button depends on whether that page
    // has one below it in this view (or else on the enclosing view), not on
    // the top of the stack, so the root page doesn't grow a back button while
    // a page slides over it. A page leaving the stack keeps what it had.
    const hadPrevious = useRef(new Map<string, boolean>());
    const pageContexts = useRef(new Map<string, NavigationContextValue>());
    const contextFor = (tag: string): NavigationContextValue => {
      const index = stack.indexOf(tag);
      const hasPrevious = index >= 0 ? index > 0 : (hadPrevious.current.get(tag) ?? false);
      const value: NavigationContextValue = {
        push,
        pop: hasPrevious ? pop : parentNav.pop,
        canPop: pageFor(tag)?.canPop !== false && (hasPrevious || parentNav.canPop),
      };
      const cached = pageContexts.current.get(tag);
      if (
        cached &&
        cached.push === value.push &&
        cached.pop === value.pop &&
        cached.canPop === value.canPop
      ) {
        return cached;
      }
      pageContexts.current.set(tag, value);
      return value;
    };

    const mounted = [...stack];
    if (transition && !mounted.includes(transition.hiding)) mounted.push(transition.hiding);

    // A page popped because its definition went away (e.g. the item it showed
    // was deleted) keeps its last definition until it has slid out.
    const lastPages = useRef(new Map<string, AdwNavigationPageProps>());
    const pageFor = (tag: string) => pages.find((p) => p.tag === tag) ?? lastPages.current.get(tag);
    useLayoutEffect(() => {
      const retained = new Map<string, AdwNavigationPageProps>();
      for (const tag of mounted) {
        const page = pageFor(tag);
        if (page) retained.set(tag, page);
      }
      lastPages.current = retained;
      const previous = new Map<string, boolean>();
      for (const tag of mounted) {
        const index = stack.indexOf(tag);
        previous.set(tag, index >= 0 ? index > 0 : (hadPrevious.current.get(tag) ?? false));
      }
      hadPrevious.current = previous;
      for (const tag of pageContexts.current.keys()) {
        if (!previous.has(tag)) pageContexts.current.delete(tag);
      }
    });

    const classes = ["gtk-navigation-view", "gtk-bin-layout"];
    if (className) classes.push(className);

    const setRef = (el: HTMLDivElement | null) => {
      rootRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <NavContext.Provider value={contextValue}>
        <div
          ref={setRef}
          className={classes.join(" ")}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          tabIndex={-1}
          // A single grid cell: pages overlay each other during transitions while
          // the view still measures as its largest page, like a GtkBin.
          style={{
            position: "relative",
            overflow: "hidden",
            outline: "none",
            display: "grid",
            gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
            ...style,
          }}
          {...rest}
        >
          {mounted.map((tag) => {
            const page = pageFor(tag);
            if (!page) return null;
            const isStatic = transition
              ? tag === (transition.pop ? transition.showing : transition.hiding)
              : false;
            const isMoving = transition
              ? tag === (transition.pop ? transition.hiding : transition.showing)
              : false;
            const visible = transition ? isStatic || isMoving : tag === visibleTag;
            return (
              <div
                key={tag}
                ref={(el) => {
                  if (el) pageRefs.current.set(tag, el);
                  else pageRefs.current.delete(tag);
                }}
                className="gtk-navigation-view-page gtk-bin-layout"
                tabIndex={-1}
                aria-hidden={visible && tag === visibleTag ? undefined : true}
                inert={tag !== visibleTag ? true : undefined}
                style={{
                  gridArea: "1 / 1",
                  position: "relative",
                  minWidth: 0,
                  minHeight: 0,
                  outline: "none",
                  display: visible ? undefined : "none",
                  zIndex: isMoving ? 2 : 0,
                  transform: isMoving ? undefined : "none",
                  willChange: isMoving ? "transform" : undefined,
                }}
              >
                <NavContext.Provider value={contextFor(tag)}>{page.children}</NavContext.Provider>
              </div>
            );
          })}
          {transition && (
            <>
              <div
                ref={dimmingRef}
                className="gtk-dimming right"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              <div
                ref={shadowRef}
                className="gtk-shadow right"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </div>
      </NavContext.Provider>
    );
  },
);
