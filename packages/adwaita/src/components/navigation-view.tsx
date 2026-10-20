import { FOCUSABLE, isCoveredByLayer } from "@gtk-js/gtk4";
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
import { SwipeController } from "../swipe-tracker.ts";
import { HeaderBarTitleContext } from "./header-bar-title.ts";

export interface AdwNavigationPageProps {
  tag: string;
  title?: string;
  canPop?: boolean;
  children: ReactNode;
}

/** A page a back button's menu returns to. */
export interface NavigationHistoryEntry {
  title: string;
  /** Pop to the page; `onShown` runs once it is shown. */
  popTo: (onShown?: () => void) => void;
}

export interface NavigationContextValue {
  /** Push the page with `tag` onto the nearest navigation view. */
  push: (tag: string) => void;
  /** Pop the visible page. Returns false when there is nothing to pop. */
  pop: () => boolean;
  /** Whether a back button should be shown. */
  canPop: boolean;
  /** Title of the page a back button returns to: its tooltip (AdwBackButton). */
  previousTitle?: string;
  /**
   * The pages a back button's menu offers, nearest first: this view's pages
   * below the visible one, then the enclosing views'
   * (adw_back_button_gather_navigation_history()).
   */
  history?: () => NavigationHistoryEntry[];
}

const NO_VIEW: NavigationContextValue = {
  push: () => {},
  pop: () => false,
  canPop: false,
};

export const NavContext = createContext<NavigationContextValue>(NO_VIEW);

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
  /** Following a swipe, which drives the progress (update_swipe_cb()). */
  gesture?: boolean;
  /** Finishing a swipe from its progress and velocity (end_swipe_cb()). */
  swipe?: { from: number; velocity: number; cancel: boolean };
}

const sameTags = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((tag, i) => b[i] === tag));

const isPrefix = (prefix: string[], of: string[]) =>
  prefix.length < of.length && prefix.every((tag, i) => of[i] === tag);

/** The first widget in `page` that Tab would focus, like gtk_widget_child_focus(). */
function firstFocusable(page: HTMLElement): HTMLElement | undefined {
  for (const el of page.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.tabIndex < 0 || (el as HTMLButtonElement).disabled || el.closest("[inert]")) continue;
    if (el.getClientRects().length > 0) return el;
  }
  return undefined;
}

/**
 * AdwNavigationView — A stack-based navigation container.
 *
 * Mirrors upstream's transition: the page underneath stays still and dims
 * while the top page slides over it with a shadow on its leading edge,
 * driven by a critically damped spring (damping 1, mass 1, stiffness 1000).
 * Touchscreen swipes and touchpad scrolling pop pages interactively. Pages
 * stay mounted once shown, like pages added with adw_navigation_view_add(),
 * so their state survives navigating away and back.
 *
 * CSS node:
 *   navigation-view
 *     ├── navigation-view-page…
 *     ├── dimming.left|.right
 *     ├── shadow.left|.right
 *     └── widget (the shield, during transitions)
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
    const parentNavRef = useRef(parentNav);
    parentNavRef.current = parentNav;
    const pagesRef = useRef(pages);
    pagesRef.current = pages;
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
        // Like navigation_push_cb(): a tag this view doesn't have is the
        // enclosing view's.
        if (!pagesRef.current.some((p) => p.tag === tag)) {
          if (parentNavRef.current === NO_VIEW)
            console.error(`No page with the tag '${tag}' found in AdwNavigationView`);
          else parentNavRef.current.push(tag);
          return;
        }
        const current = stackRef.current;
        if (current.includes(tag)) {
          // push_to_stack()
          console.error(`Page with the tag '${tag}' is already in navigation stack`);
          return;
        }
        setStack([...current, tag]);
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
    const popRef = useRef(pop);
    popRef.current = pop;

    // What to run once the page a popTo() went to is shown.
    const shownCallbacks = useRef<(() => void)[]>([]);
    const flushShown = useCallback(() => {
      const callbacks = shownCallbacks.current;
      shownCallbacks.current = [];
      for (const callback of callbacks) callback();
    }, []);

    const popTo = useCallback(
      (tag: string, onShown?: () => void) => {
        const current = stackRef.current;
        const index = current.indexOf(tag);
        if (index < 0 || index === current.length - 1) {
          onShown?.();
          return;
        }
        if (onShown) shownCallbacks.current.push(onShown);
        setStack(current.slice(0, index + 1));
        // pop_from_stack(): "popped" for each page, the top one first.
        for (const popped of current.slice(index + 1).reverse()) onPopped?.(popped);
      },
      [setStack, onPopped],
    );

    // Like traverse_view(): the pages below the visible one, down to the root
    // or to a page that can't pop, then the enclosing views'. Popping to an
    // enclosing view's page takes this view back to its root once that page
    // is shown (pop_pages_hidden()).
    const history = useCallback((): NavigationHistoryEntry[] => {
      const current = stackRef.current;
      const entries: NavigationHistoryEntry[] = [];
      for (let i = current.length - 2; i >= 0; i--) {
        const tag = current[i]!;
        const page = pagesRef.current.find((p) => p.tag === tag);
        entries.push({ title: page?.title || "Back", popTo: (onShown) => popTo(tag, onShown) });
        if (page?.canPop === false) return entries;
      }
      const root = current[0] ?? "";
      for (const entry of parentNavRef.current.history?.() ?? []) {
        entries.push({
          title: entry.title,
          popTo: (onShown) =>
            entry.popTo(() => {
              popTo(root);
              onShown?.();
            }),
        });
      }
      return entries;
    }, [popTo]);

    // --- transitions -------------------------------------------------------

    const [transition, setTransition] = useState<Transition | null>(null);
    const transitionRef = useRef(transition);
    transitionRef.current = transition;
    const animationRef = useRef<SpringAnimationHandle | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const pageRefs = useRef(new Map<string, HTMLDivElement>());
    const dimmingRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const shieldRef = useRef<HTMLDivElement | null>(null);
    // A swipe's progress, and what draws it while the swipe lasts.
    const swipeProgress = useRef(0);
    const applySwipe = useRef<((value: number) => void) | null>(null);

    // Pages that have been shown, which stay mounted while they're in `pages`.
    const [shown, setShown] = useState(() => new Set(stack));

    // Detect navigation while rendering (React's "adjust state when a prop
    // changes" pattern), so the page being popped is never unmounted for a
    // render before its transition starts — that would remount it and lose
    // its state.
    const [prevStack, setPrevStack] = useState(stack);
    if (!sameTags(prevStack, stack)) {
      setPrevStack(stack);
      const known = (tag: string) => pages.some((p) => p.tag === tag);
      setShown(new Set([...shown, ...stack].filter(known)));
      const prevTop = prevStack[prevStack.length - 1];
      const nextTop = stack[stack.length - 1];
      // A swipe that ended in this pop animates it already.
      const swiped =
        transition?.swipe && transition.showing === nextTop && transition.hiding === prevTop;
      if (prevTop && nextTop && prevTop !== nextTop && !swiped) {
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

    // Like switch_page(): when the focus was in the page going away, it moves
    // to the new page's last focused widget, or else its first focusable one.
    // Otherwise it's kept in the view, so Escape/Alt+Left keep working instead
    // of reaching outer handlers.
    const lastFocus = useRef(new Map<string, Element>());
    const focusedTopRef = useRef(visibleTag);
    useLayoutEffect(() => {
      const prevTop = focusedTopRef.current;
      if (prevTop === visibleTag) return;
      focusedTopRef.current = visibleTag;
      const root = rootRef.current;
      const active = document.activeElement;
      const prevPage = pageRefs.current.get(prevTop);
      const page = pageRefs.current.get(visibleTag);
      if (page && active && prevPage?.contains(active)) {
        lastFocus.current.set(prevTop, active);
        const last = lastFocus.current.get(visibleTag);
        if (last instanceof HTMLElement && page.contains(last)) last.focus({ preventScroll: true });
        if (document.activeElement !== last)
          (firstFocusable(page) ?? page).focus({ preventScroll: true });
      } else if (
        root &&
        (!active ||
          active === document.body ||
          (root.contains(active) && active.closest("[inert]")))
      ) {
        root.focus({ preventScroll: true });
      }
      if (!transitionRef.current) flushShown();
    }, [visibleTag, flushShown]);

    // Drive the active transition, writing styles directly to avoid re-rendering
    // page contents on every frame.
    useLayoutEffect(() => {
      if (!transition) return;
      const key = transition.key;
      const root = rootRef.current;
      const moving = pageRefs.current.get(transition.pop ? transition.hiding : transition.showing);
      const staticPage = pageRefs.current.get(
        transition.pop ? transition.showing : transition.hiding,
      );
      const dimming = dimmingRef.current;
      const shadow = shadowRef.current;
      const shield = shieldRef.current;
      if (!root || !moving) {
        // No such page (e.g. a controlled stack naming an unknown tag).
        setTransition((t) => (t?.key === key ? null : t));
        return;
      }
      const rtl = getComputedStyle(root).direction === "rtl";
      const width = root.clientWidth;
      const shadowSize = shadow?.offsetWidth || 56;
      // The shadow helper's direction classes (set_style_classes()).
      for (const el of [dimming, shadow]) {
        el?.classList.toggle("left", rtl);
        el?.classList.toggle("right", !rtl);
      }
      // The shield moves with the page sliding out of a pop, so the page
      // coming in takes input (adw_navigation_view_size_allocate()).
      const moveShield = !transition.gesture && transition.pop !== !!transition.swipe?.cancel;

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
        // adw_shadow_helper_size_allocate(): the dimming covers the uncovered
        // part, and the shadow lies along its edge by the moving page, fading
        // out as the part gets narrower than the shadow.
        const uncovered = Math.max(0, offset);
        const x = rtl ? width - offset : 0;
        if (dimming) {
          dimming.style.left = `${x}px`;
          dimming.style.width = `${uncovered}px`;
          dimming.style.opacity = String(1 - progress);
        }
        if (shadow) {
          const remaining = (1 - progress) * uncovered;
          shadow.style.opacity = String(remaining < shadowSize ? remaining / shadowSize : 1);
          shadow.style.transform = `translateX(${rtl ? x : uncovered - shadowSize}px)`;
        }
        if (shield) shield.style.transform = moveShield ? moving.style.transform : "";
      };

      if (transition.gesture) {
        applySwipe.current = apply;
        apply(swipeProgress.current);
        return () => {
          applySwipe.current = null;
          if (staticPage) staticPage.style.clipPath = "";
        };
      }

      const cancel = transition.swipe?.cancel ?? false;
      animationRef.current = animateSpring({
        params: NAVIGATION_SPRING,
        from: transition.swipe?.from ?? 0,
        to: cancel ? 0 : 1,
        initialVelocity: transition.swipe?.velocity ?? 0,
        clamp: cancel ? !transition.pop : transition.pop,
        onValue: apply,
        onDone: () => {
          animationRef.current = null;
          // The clip comes off in the cleanup below, in the same commit that
          // hides the page: pages have no background, so clearing it here
          // would show the page underneath through the new one for a frame.
          setTransition((t) => (t?.key === key ? null : t));
          if (cancel) return;
          if (document.activeElement === root) {
            pageRefs.current.get(transition.showing)?.focus({ preventScroll: true });
          }
          flushShown();
        },
      });
      return () => {
        animationRef.current?.cancel();
        if (staticPage) staticPage.style.clipPath = "";
      };
    }, [transition, flushShown]);

    useEffect(() => () => animationRef.current?.cancel(), []);

    // --- input -------------------------------------------------------------

    // pop_shortcut_cb(): a page that can't pop still consumes the shortcut,
    // so it doesn't reach an enclosing view. Returns whether it's consumed.
    const popShortcut = useCallback((): boolean => {
      if (!visiblePage) return false;
      if (visiblePage.canPop === false) return true;
      return pop();
    }, [visiblePage, pop]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Keys from a dialog or popover over the view (React events bubble out
        // of portals, and a dialog doesn't take the focus from the page) are
        // theirs: in GTK they never reach the view.
        if (e.defaultPrevented || isCoveredByLayer(e.currentTarget)) return;
        // The bindings of adw_navigation_view_class_init(), which match the
        // modifiers exactly. In RTL, back and forward swap.
        const view = e.currentTarget;
        const rtl = () => getComputedStyle(view).direction === "rtl";
        const modifiers = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
        const altOnly = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
        let back: boolean;
        if (e.key === "Escape" && !modifiers) back = popOnEscape;
        else if (e.key === "BrowserBack" && !modifiers) back = !rtl();
        else if (e.key === "BrowserForward" && !modifiers) back = rtl();
        else if (e.key === "ArrowLeft" && altOnly) back = !rtl();
        else if (e.key === "ArrowRight" && altOnly) back = rtl();
        else return;
        // Going forward needs AdwNavigationView::get-next-page: the key
        // propagates, as when there's no next page.
        if (back && popShortcut()) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      [popOnEscape, popShortcut],
    );

    // back_forward_button_pressed_cb(): the back mouse button pops on press.
    const claimedButton = useRef(false);
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 3 && e.button !== 4) return;
        claimedButton.current = false;
        if (isCoveredByLayer(e.currentTarget)) return;
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
        const back = (e.button === 3) !== rtl;
        if (!back || !visiblePage) return;
        if (visiblePage.canPop !== false && !pop()) return;
        claimedButton.current = true;
        e.preventDefault();
        e.stopPropagation();
      },
      [visiblePage, pop],
    );
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
      // Keep the browser from going back in its history too.
      if ((e.button === 3 || e.button === 4) && claimedButton.current) {
        claimedButton.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    }, []);

    // Touchscreen swipes and touchpad scrolling pop interactively, animated
    // whatever animateTransitions says (prepare_cb() … end_swipe_cb()).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      let back = false;
      // The page the swipe moves, while it follows the swipe.
      let swiped: string | null = null;
      const tracker: SwipeController = new SwipeController(root, {
        getDistance: () => root.clientWidth,
        // adw_navigation_view_get_snap_points()
        getSnapPoints: () => {
          const t = transitionRef.current;
          if (t) return t.pop && swiped ? [-1, 0] : [0];
          return stackRef.current.length > 1 ? [-1, 0] : [0];
        },
        getProgress: () => 0,
        getCancelProgress: () => 0,
        isReversed: () => getComputedStyle(root).direction === "rtl",
        prepare: () => {
          back = stackRef.current.length > 0;
        },
        beginSwipe: () => {
          if (!back) return;
          back = false;
          const current = stackRef.current;
          const hiding = current[current.length - 1];
          const showing = current[current.length - 2];
          const page = pagesRef.current.find((p) => p.tag === hiding);
          if (!hiding || !showing || page?.canPop === false) return;
          animationRef.current?.skip();
          swiped = hiding;
          swipeProgress.current = 0;
          tracker.upperOvershoot = true;
          setTransition((t) => ({
            key: (t?.key ?? 0) + 1,
            pop: true,
            showing,
            hiding,
            gesture: true,
          }));
        },
        updateSwipe: (progress) => {
          if (!swiped) return;
          swipeProgress.current = -progress;
          applySwipe.current?.(-progress);
        },
        endSwipe: (velocity, to) => {
          back = false;
          const page = swiped;
          swiped = null;
          tracker.upperOvershoot = false;
          // Unless the page went away some other way meanwhile.
          const current = stackRef.current;
          if (!page || current[current.length - 1] !== page) return;
          const pops = Math.abs(to) > 0.5;
          const swipe = { from: swipeProgress.current, velocity: -velocity, cancel: !pops };
          setTransition((t) => (t?.gesture ? { ...t, gesture: false, swipe } : t));
          if (pops) popRef.current();
        },
      });
      return tracker.attach();
    }, []);

    // At the root page, back buttons belong to an enclosing navigator (e.g. a
    // collapsed AdwNavigationSplitView), like upstream's header bar logic.
    const previousTitle = canPopSelf
      ? pages.find((p) => p.tag === stack[stack.length - 2])?.title
      : parentNav.previousTitle;
    const contextValue = useMemo<NavigationContextValue>(
      () => ({
        push,
        pop: canPopSelf ? pop : parentNav.pop,
        canPop: canPopSelf || parentNav.canPop,
        previousTitle,
        history,
      }),
      [push, pop, canPopSelf, parentNav, previousTitle, history],
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
      const cached = pageContexts.current.get(tag);
      const value: NavigationContextValue = {
        push,
        pop: hasPrevious ? pop : parentNav.pop,
        canPop: pageFor(tag)?.canPop !== false && (hasPrevious || parentNav.canPop),
        previousTitle:
          index > 0
            ? pageFor(stack[index - 1] ?? "")?.title
            : index < 0 && hasPrevious
              ? cached?.previousTitle
              : parentNav.previousTitle,
        history,
      };
      if (
        cached &&
        cached.push === value.push &&
        cached.pop === value.pop &&
        cached.canPop === value.canPop &&
        cached.previousTitle === value.previousTitle &&
        cached.history === value.history
      ) {
        return cached;
      }
      pageContexts.current.set(tag, value);
      return value;
    };

    // The stack, the page sliding out, and the other pages shown before that
    // are still in `pages`, in `pages` order so navigating never moves a
    // page's DOM node (which would drop its focus).
    const mountedSet = new Set(stack);
    if (transition) mountedSet.add(transition.hiding);
    for (const tag of shown) if (pages.some((p) => p.tag === tag)) mountedSet.add(tag);
    const mounted = pages.map((p) => p.tag).filter((tag) => mountedSet.has(tag));
    for (const tag of mountedSet) if (!mounted.includes(tag)) mounted.push(tag);

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
          role="group"
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
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
            // Horizontal touch drags are the swipe tracker's while there's a
            // page to go back to, not the browser's (history navigation).
            touchAction: stack.length > 1 ? "pan-y pinch-zoom" : undefined,
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
                role="group"
                aria-label={page.title || undefined}
                tabIndex={-1}
                aria-hidden={visible && tag === visibleTag ? undefined : true}
                inert={tag !== visibleTag ? true : undefined}
                style={{
                  gridArea: "1 / 1",
                  // The page gets the whole view, and its child the whole
                  // page (adw_navigation_view_size_allocate()): content
                  // taller than the view scrolls in it, not past the page.
                  gridTemplate: "minmax(0, 1fr) / minmax(0, 1fr)",
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
                <NavContext.Provider value={contextFor(tag)}>
                  <HeaderBarTitleContext.Provider value={page.title ?? ""}>
                    {page.children}
                  </HeaderBarTitleContext.Provider>
                </NavContext.Provider>
              </div>
            );
          })}
          {transition && (
            <>
              <div
                ref={dimmingRef}
                className="gtk-dimming"
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
                className="gtk-shadow"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />
              {/* The shield takes the input meant for the pages that are
                  going or staying away: it's above everything but a page
                  being pushed (switch_page(), begin_swipe_cb()). */}
              <div
                ref={shieldRef}
                className="gtk-widget"
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: transition.pop || transition.gesture ? 3 : 1,
                }}
              />
            </>
          )}
        </div>
      </NavContext.Provider>
    );
  },
);
