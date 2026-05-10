/**
 * AdwLeaflet — An adaptive container acting like a box or a stack.
 *
 * Displays children side-by-side (like GtkBox) when wide enough, or shows only
 * one child at a time (like GtkStack) when narrow. Transitions between fold
 * states and between children are animated.
 *
 * Deprecated in libadwaita 1.4 but still useful for layouts needing fold animations.
 *
 * CSS node: leaflet[.folded|.unfolded]
 *
 * Reference: upstream/libadwaita/src/adw-leaflet.c
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Leaflet.html
 */

import React, {
  Children,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// -- Public interfaces -------------------------------------------------------

export interface AdwLeafletProps extends HTMLAttributes<HTMLDivElement> {
  /** If false, the leaflet is always folded. Default: true. */
  canUnfold?: boolean;
  /** How children's size is measured for fold threshold. Default: "minimum". */
  foldThresholdPolicy?: "minimum" | "natural";
  /** When folded, give all children the same size. Default: true. */
  homogeneous?: boolean;

  /** Name of the visible child (only meaningful when folded). */
  visibleChildName?: string;
  /** Fires when fold state changes. */
  onFoldedChange?: (folded: boolean) => void;
  /** Fires when the visible child changes. */
  onVisibleChildChanged?: (name: string) => void;

  /** Transition type for child switches when folded. Default: "over". */
  transitionType?: "over" | "under" | "slide";
  /** Duration of fold/unfold animation in ms. Default: 250. */
  modeTransitionDuration?: number;
  /** Fires when a child transition starts/ends. */
  onChildTransitionRunning?: (running: boolean) => void;

  /** Allow back-button navigation to previous child. Default: false. */
  canNavigateBack?: boolean;
  /** Allow forward-button navigation to next child. Default: false. */
  canNavigateForward?: boolean;

  /** Layout direction. Default: "horizontal". */
  orientation?: "horizontal" | "vertical";

  children?: ReactNode;
}

export interface AdwLeafletPageProps {
  /** Identifier for this page. */
  name?: string;
  /** If false, this page is skipped during back/forward navigation. Default: true. */
  navigatable?: boolean;
  children: ReactNode;
}

// -- Navigation context -------------------------------------------------------

const LeafletContext = createContext<{
  navigate: (direction: "back" | "forward") => void;
  canGoBack: boolean;
  canGoForward: boolean;
}>({
  navigate: () => {},
  canGoBack: false,
  canGoForward: false,
});

export function useLeafletNavigation() {
  return useContext(LeafletContext);
}

// -- AdwLeafletPage -----------------------------------------------------------

/**
 * Wrapper component — provides name/navigatable metadata to AdwLeaflet.
 * The child is wrapped in a div that fills the page in both axes, matching
 * upstream GTK which allocates each Leaflet child the full container size.
 */
export function AdwLeafletPage({ children }: AdwLeafletPageProps) {
  return <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>{children}</div>;
}

// -- Transition helpers -------------------------------------------------------

const CHILD_TRANSITION = "transform 200ms ease-out";

type TransitionDirection = "forward" | "back";

interface ChildTransition {
  key: number;
  direction: TransitionDirection;
  phase: "starting" | "running";
  fromIndex: number;
  toIndex: number;
}

// -- Helpers ------------------------------------------------------------------

interface PageInfo {
  name: string | undefined;
  navigatable: boolean;
  /** Whether this page's content requests to expand (upstream: gtk_widget_compute_expand). */
  hexpand: boolean;
  element: ReactElement;
  index: number;
}

/**
 * Detect whether a page's content requests horizontal expand.
 * Checks for data-hexpand on the immediate child element inside AdwLeafletPage,
 * matching upstream's gtk_widget_compute_expand behavior.
 */
function detectHExpand(pageElement: ReactElement): boolean {
  const pageChildren = (pageElement.props as AdwLeafletPageProps).children;
  if (!React.isValidElement(pageChildren)) return false;
  const childProps = pageChildren.props as Record<string, unknown>;
  return childProps["data-hexpand"] === "true" || childProps["data-hexpand"] === true;
}

function collectPages(children: ReactNode): PageInfo[] {
  const pages: PageInfo[] = [];
  Children.forEach(children, (child, index) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as AdwLeafletPageProps;
    pages.push({
      name: props.name,
      navigatable: props.navigatable !== false,
      hexpand: detectHExpand(child),
      element: child,
      index,
    });
  });
  return pages;
}

/** Find the next navigatable child in the given direction. Returns -1 if none. */
function findAdjacentNavigatable(
  pages: PageInfo[],
  currentIndex: number,
  direction: "back" | "forward",
): number {
  const step = direction === "forward" ? 1 : -1;
  for (let i = currentIndex + step; i >= 0 && i < pages.length; i += step) {
    if (pages[i]?.navigatable) return i;
  }
  return -1;
}

// -- Ref merging helper -------------------------------------------------------

function mergeRefs(
  containerRef: React.MutableRefObject<HTMLDivElement | null>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  return (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };
}

// -- Main component -----------------------------------------------------------

export const AdwLeaflet = forwardRef<HTMLDivElement, AdwLeafletProps>(
  function AdwLeaflet(
    {
      canUnfold = true,
      foldThresholdPolicy = "minimum",
      homogeneous = true,
      visibleChildName,
      onFoldedChange,
      onVisibleChildChanged,
      transitionType = "over",
      modeTransitionDuration = 250,
      onChildTransitionRunning,
      canNavigateBack = false,
      canNavigateForward = false,
      orientation = "horizontal",
      children,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const childRefs = useRef<(HTMLDivElement | null)[]>([]);
    const pages = collectPages(children);
    const isHoriz = orientation === "horizontal";

    // ── Fold state ──────────────────────────────────────────────────────────
    //
    // Upstream determines fold in size_allocate: sum children's min (or nat)
    // sizes along the orientation axis. If container < sum AND there are >1
    // visible children → fold.  canUnfold=false → always folded.

    const [folded, setFolded] = useState(!canUnfold);
    const prevFoldedRef = useRef(folded);

    // Mode transition (fold ↔ unfold animation).
    // Upstream animates current_pos from 1→0 (folding) or 0→1 (unfolding),
    // recomputing every child's allocation each frame from current_pos and
    // the current container size.  We replicate this with a rAF loop that
    // drives explicit per-child widths — CSS transitions can't work here
    // because hexpand children's target sizes depend on the container width,
    // which may change during the animation (user still dragging).
    const [modeTransition, setModeTransition] = useState<{
      direction: "folding" | "unfolding";
      /** Per-child natural (unfolded) sizes for non-hexpand children. */
      childNaturalSizes: number[];
      /** 0 = fully folded, 1 = fully unfolded. */
      progress: number;
    } | null>(null);
    const modeTransitionFrameRef = useRef<number | null>(null);
    const modeTransitionStartRef = useRef(0);
    const modeTransitionStartPosRef = useRef(0);
    const modeTransitionActiveRef = useRef(false);

    // Cache the children's intrinsic size sum so fold detection doesn't
    // oscillate.  We measure inner content min/nat sizes when unfolded (all
    // children in the DOM) and reuse that value when folded.
    const childrenSizeRef = useRef(0);
    // Per-child rendered sizes when unfolded, for mode transition animation.
    const childNaturalSizesRef = useRef<number[]>([]);
    // Ref mirror of folded state for use inside ResizeObserver closure.
    const foldedRef = useRef(folded);
    foldedRef.current = folded;

    useEffect(() => {
      if (!canUnfold) {
        setFolded(true);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => {
        const containerSize = isHoriz ? container.clientWidth : container.clientHeight;

        // Re-measure children sizes only when unfolded and not in a mode
        // transition.  During transitions, children widths are animating and
        // would corrupt the cache.  When folded, non-visible children are
        // collapsed to 0 so measurements are invalid.
        if (!modeTransitionActiveRef.current && !foldedRef.current && pages.length > 1) {
          let allPresent = true;
          for (let idx = 0; idx < pages.length; idx++) {
            if (!childRefs.current[idx]) { allPresent = false; break; }
          }
          if (allPresent) {
            let size = 0;
            const naturalSizes: number[] = [];
            for (let idx = 0; idx < pages.length; idx++) {
              const childEl = childRefs.current[idx]!;
              const inner = childEl.firstElementChild as HTMLElement | null;
              if (!inner) {
                naturalSizes[idx] = 0;
                continue;
              }

              if (foldThresholdPolicy === "natural") {
                size += isHoriz ? inner.scrollWidth : inner.scrollHeight;
              } else {
                const computed = getComputedStyle(inner);
                const minProp = isHoriz ? computed.minWidth : computed.minHeight;
                const minVal = Number.parseFloat(minProp);
                if (minProp !== "auto" && !Number.isNaN(minVal) && minVal > 0) {
                  size += minVal;
                } else {
                  size += isHoriz ? inner.scrollWidth : inner.scrollHeight;
                }
              }

              naturalSizes[idx] = isHoriz ? childEl.offsetWidth : childEl.offsetHeight;
            }
            childrenSizeRef.current = size;
            childNaturalSizesRef.current = naturalSizes;
          }
        }

        // Use cached threshold — stable across fold/unfold state changes
        const threshold = childrenSizeRef.current;
        if (threshold > 0) {
          setFolded(containerSize < threshold);
        }
      });

      observer.observe(container);

      return () => observer.disconnect();
    }, [canUnfold, foldThresholdPolicy, isHoriz, pages.length]);

    // Fire onFoldedChange and trigger mode transition via rAF loop.
    // Unlike CSS transitions (which set a fixed target), the rAF loop reads
    // the current container size each frame so hexpand children's widths
    // always match the container — no stale targets, no end-of-animation jolt.
    useLayoutEffect(() => {
      const prev = prevFoldedRef.current;
      prevFoldedRef.current = folded;
      if (prev === folded) return;

      onFoldedChange?.(folded);

      // Skip animation if canUnfold is false (upstream: adw_animation_skip)
      // or if we have no cached child sizes to animate with.
      if (!canUnfold || childNaturalSizesRef.current.length === 0) return;

      const direction = folded ? "folding" : "unfolding";
      const childNaturalSizes = [...childNaturalSizesRef.current];

      // If already animating, capture current progress for smooth reversal.
      let startPos: number;
      if (modeTransitionActiveRef.current && modeTransition) {
        startPos = modeTransition.progress;
      } else {
        startPos = folded ? 1.0 : 0.0;
      }
      const targetPos = folded ? 0.0 : 1.0;

      if (modeTransitionFrameRef.current !== null) {
        cancelAnimationFrame(modeTransitionFrameRef.current);
      }

      modeTransitionActiveRef.current = true;

      // Set the initial transition state SYNCHRONOUSLY inside useLayoutEffect.
      // React 18 guarantees setState in useLayoutEffect triggers a synchronous
      // re-render before the browser paints, so the user never sees a flash of
      // the un-animated layout.  The rAF loop then drives subsequent frames.
      setModeTransition({ direction, childNaturalSizes, progress: startPos });

      const tick = (now: number) => {
        // Capture start time on the FIRST tick so elapsed begins at 0,
        // not ~16ms after the useLayoutEffect ran.
        if (modeTransitionStartRef.current === 0) {
          modeTransitionStartRef.current = now;
        }

        const elapsed = now - modeTransitionStartRef.current;
        const t = Math.min(elapsed / modeTransitionDuration, 1.0);
        // Ease-out cubic — smooth deceleration, matching upstream feel.
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        const progress = startPos + (targetPos - startPos) * eased;

        if (t < 1.0) {
          setModeTransition({ direction, childNaturalSizes, progress });
          modeTransitionFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Render one final frame at exact target progress so sizes match
          // the normal flex layout precisely, then clear on the next frame.
          setModeTransition({ direction, childNaturalSizes, progress: targetPos });
          modeTransitionFrameRef.current = requestAnimationFrame(() => {
            modeTransitionFrameRef.current = null;
            modeTransitionActiveRef.current = false;
            setModeTransition(null);
          });
        }
      };

      modeTransitionStartRef.current = 0; // reset — first tick will capture
      modeTransitionFrameRef.current = requestAnimationFrame(tick);

      return () => {
        if (modeTransitionFrameRef.current !== null) {
          cancelAnimationFrame(modeTransitionFrameRef.current);
          modeTransitionFrameRef.current = null;
        }
      };
    }, [folded, onFoldedChange, canUnfold, modeTransitionDuration]);

    // ── Visible child state ─────────────────────────────────────────────────

    const resolveVisibleIndex = useCallback((): number => {
      if (visibleChildName) {
        const idx = pages.findIndex((p) => p.name === visibleChildName);
        if (idx >= 0) return idx;
      }
      return 0;
    }, [visibleChildName, pages]);

    const [visibleIndex, setVisibleIndex] = useState(resolveVisibleIndex);
    const prevVisibleIndexRef = useRef(visibleIndex);

    // Sync visibleChildName prop → visibleIndex
    useEffect(() => {
      setVisibleIndex(resolveVisibleIndex());
    }, [resolveVisibleIndex]);

    // ── Child transitions ───────────────────────────────────────────────────

    const [childTransition, setChildTransition] = useState<ChildTransition | null>(null);
    const transitionKeyRef = useRef(0);
    const transitionFrameRef = useRef<number | null>(null);

    useLayoutEffect(() => {
      const prev = prevVisibleIndexRef.current;
      prevVisibleIndexRef.current = visibleIndex;

      if (prev === visibleIndex) return;
      if (!folded) return; // upstream: child transitions only when folded
      if (modeTransitionActiveRef.current) return; // suppress during mode transition (upstream: current_pos ≈ 0 check)

      onVisibleChildChanged?.(pages[visibleIndex]?.name ?? "");

      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current);
      }

      const key = ++transitionKeyRef.current;
      const direction: TransitionDirection = visibleIndex > prev ? "forward" : "back";

      setChildTransition({ key, direction, phase: "starting", fromIndex: prev, toIndex: visibleIndex });
      onChildTransitionRunning?.(true);

      transitionFrameRef.current = requestAnimationFrame(() => {
        setChildTransition((t) => (t?.key === key ? { ...t, phase: "running" } : t));
        transitionFrameRef.current = null;
      });

      return () => {
        if (transitionFrameRef.current !== null) {
          cancelAnimationFrame(transitionFrameRef.current);
          transitionFrameRef.current = null;
        }
      };
    }, [visibleIndex, folded, onVisibleChildChanged, onChildTransitionRunning, pages]);

    const handleChildTransitionEnd = useCallback(
      (event: React.TransitionEvent<HTMLDivElement>, key: number) => {
        if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
        setChildTransition((t) => {
          if (t?.key !== key) return t;
          onChildTransitionRunning?.(false);
          return null;
        });
      },
      [onChildTransitionRunning],
    );

    // ── Navigation ──────────────────────────────────────────────────────────

    const canGoBack = canNavigateBack && findAdjacentNavigatable(pages, visibleIndex, "back") >= 0;
    const canGoForward = canNavigateForward && findAdjacentNavigatable(pages, visibleIndex, "forward") >= 0;

    const navigate = useCallback(
      (direction: "back" | "forward") => {
        const target = findAdjacentNavigatable(pages, visibleIndex, direction);
        if (target < 0) return;
        setVisibleIndex(target);
      },
      [pages, visibleIndex],
    );

    // Mouse back/forward buttons (upstream: button 8 = back, 9 = forward)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleMouseUp = (e: MouseEvent) => {
        if (e.button === 3 && canNavigateBack) {
          // Browser maps X1 (button 8 in GTK) to button 3
          e.preventDefault();
          navigate("back");
        } else if (e.button === 4 && canNavigateForward) {
          // Browser maps X2 (button 9 in GTK) to button 4
          e.preventDefault();
          navigate("forward");
        }
      };

      container.addEventListener("mouseup", handleMouseUp);
      return () => container.removeEventListener("mouseup", handleMouseUp);
    }, [canNavigateBack, canNavigateForward, navigate]);

    // ── Render helpers ──────────────────────────────────────────────────────

    const classes = ["gtk-leaflet"];
    if (folded) classes.push("folded");
    else classes.push("unfolded");
    if (className) classes.push(className);

    const setChildRef = (index: number) => (el: HTMLDivElement | null) => {
      childRefs.current[index] = el;
    };

    // ── Child transition transform computation ─────────────────────────────
    //
    // Upstream (get_child_window_x / get_child_window_y):
    //   "over"  → the entering (new visible) child slides on top; leaving stays put
    //   "under" → the leaving (old visible) child slides away; entering stays put
    //   "slide" → both children slide in opposite directions

    function getChildTransform(
      role: "entering" | "leaving",
      transition: ChildTransition,
      type: "over" | "under" | "slide",
    ): string {
      const axis = isHoriz ? "X" : "Y";
      const isForward = transition.direction === "forward";

      if (type === "over") {
        if (role === "entering") {
          if (transition.phase === "starting") {
            return `translate${axis}(${isForward ? "100%" : "-100%"})`;
          }
          return `translate${axis}(0)`;
        }
        return `translate${axis}(0)`;
      }

      if (type === "under") {
        if (role === "leaving") {
          if (transition.phase === "starting") {
            return `translate${axis}(0)`;
          }
          return `translate${axis}(${isForward ? "-100%" : "100%"})`;
        }
        return `translate${axis}(0)`;
      }

      // "slide": both move
      if (role === "entering") {
        if (transition.phase === "starting") {
          return `translate${axis}(${isForward ? "100%" : "-100%"})`;
        }
        return `translate${axis}(0)`;
      }
      if (transition.phase === "starting") {
        return `translate${axis}(0)`;
      }
      return `translate${axis}(${isForward ? "-100%" : "100%"})`;
    }

    function getChildZIndex(
      role: "entering" | "leaving",
      type: "over" | "under" | "slide",
    ): number {
      // "over": entering child is on top
      if (type === "over") return role === "entering" ? 1 : 0;
      // "under": leaving child is on top (slides away to reveal entering)
      if (type === "under") return role === "leaving" ? 1 : 0;
      // "slide": same layer
      return 0;
    }

    function renderTransitioningChild(
      page: PageInfo,
      role: "entering" | "leaving",
      transition: ChildTransition,
    ) {
      const transform = getChildTransform(role, transition, transitionType);
      const zIndex = getChildZIndex(role, transitionType);
      const isRunning = transition.phase === "running";

      return (
        <div
          key={`${role}:${page.index}:${transition.key}`}
          ref={setChildRef(page.index)}
          className="gtk-leaflet-page"
          aria-hidden={role === "leaving" ? true : undefined}
          onTransitionEnd={
            role === "entering"
              ? (event) => handleChildTransitionEnd(event, transition.key)
              : undefined
          }
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            transform,
            transition: isRunning ? CHILD_TRANSITION : "none",
            willChange: "transform",
            zIndex,
          }}
        >
          {page.element}
        </div>
      );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    // Child transitions (folded, switching visible child): absolute positioning
    if (folded && childTransition && !modeTransition) {
      const visiblePage = pages[visibleIndex];

      return (
        <LeafletContext.Provider value={{ navigate, canGoBack, canGoForward }}>
          <div
            ref={mergeRefs(containerRef, ref)}
            className={classes.join(" ")}
            style={{
              position: "relative",
              overflow: "hidden",
              ...style,
            }}
            {...rest}
          >
            {pages[childTransition.fromIndex] && pages[childTransition.toIndex]
              ? [
                  renderTransitioningChild(
                    pages[childTransition.fromIndex]!,
                    "leaving",
                    childTransition,
                  ),
                  renderTransitioningChild(
                    pages[childTransition.toIndex]!,
                    "entering",
                    childTransition,
                  ),
                ]
              : visiblePage && (
                  <div
                    ref={setChildRef(visiblePage.index)}
                    className="gtk-leaflet-page"
                    style={{ position: "relative" }}
                  >
                    {visiblePage.element}
                  </div>
                )}
          </div>
        </LeafletContext.Provider>
      );
    }

    // Unified flex layout: unfolded, folded (no child transition), and mode transitions.
    // During mode transition, a rAF loop drives per-child widths each frame.
    return (
      <LeafletContext.Provider value={{ navigate, canGoBack, canGoForward }}>
        <div
          ref={mergeRefs(containerRef, ref)}
          className={classes.join(" ")}
          style={{
            display: "flex",
            flexDirection: isHoriz ? "row" : "column",
            ...style,
          }}
          {...rest}
        >
          {pages.map((page, i) => {
            const isVisibleChild = i === visibleIndex;
            const sizeProp = isHoriz ? "width" : "height";

            let pageStyle: React.CSSProperties;

            if (modeTransition) {
              // rAF-driven mode transition.  Upstream recomputes all children's
              // allocations each frame from current_pos and the current container
              // size.  We do the same: the visible child fills remaining space
              // via flex:1, non-visible children get explicit widths computed
              // from progress (0=folded, 1=unfolded) and current container size.
              //
              // For hexpand children, the target is derived from the CURRENT
              // container size each frame — not a stale cached value — so the
              // animation end-state always matches the normal flex layout.

              if (isVisibleChild) {
                pageStyle = {
                  display: "flex",
                  flexDirection: isHoriz ? "column" : "row",
                  flex: "1 1 0px",
                  minWidth: 0,
                  minHeight: 0,
                };
              } else {
                let targetSize: number;
                if (page.hexpand) {
                  // Compute from current container size — adapts if user is
                  // still resizing during animation.
                  const cSize = isHoriz
                    ? containerRef.current?.clientWidth ?? 0
                    : containerRef.current?.clientHeight ?? 0;
                  let fixedTotal = 0;
                  for (let j = 0; j < pages.length; j++) {
                    if (j !== visibleIndex && !pages[j]?.hexpand) {
                      fixedTotal += modeTransition.childNaturalSizes[j] ?? 0;
                    }
                  }
                  fixedTotal += modeTransition.childNaturalSizes[visibleIndex] ?? 0;
                  targetSize = Math.max(0, cSize - fixedTotal) * modeTransition.progress;
                } else {
                  const naturalSize = modeTransition.childNaturalSizes[i] ?? 0;
                  targetSize = naturalSize * modeTransition.progress;
                }

                pageStyle = {
                  display: "flex",
                  flexDirection: isHoriz ? "column" : "row",
                  flex: "0 0 auto",
                  [sizeProp]: targetSize,
                  minWidth: 0,
                  minHeight: 0,
                  overflow: "hidden",
                };
              }
            } else if (folded) {
              // Folded, no transition: visible child fills, others collapsed
              if (isVisibleChild) {
                pageStyle = {
                  display: "flex",
                  flexDirection: isHoriz ? "column" : "row",
                  flex: "1 1 0px",
                  minWidth: 0,
                  minHeight: 0,
                };
              } else {
                pageStyle = {
                  display: "flex",
                  flexDirection: isHoriz ? "column" : "row",
                  flex: "0 0 0px",
                  [sizeProp]: 0,
                  minWidth: 0,
                  minHeight: 0,
                  overflow: "hidden",
                };
              }
            } else {
              // Unfolded, no transition: normal flex layout
              pageStyle = {
                display: "flex",
                flexDirection: isHoriz ? "column" : "row",
                minWidth: 0,
                minHeight: 0,
                flex: homogeneous ? 1 : (page.hexpand ? "1 1 0" : "0 0 auto"),
              };
            }

            // Non-visible children during mode transition need an inner clip
            // wrapper that locks content at full natural width (upstream keeps
            // child allocation at get_page_size() and only clips visually).
            // The wrapper div is ALWAYS rendered to keep the DOM tree stable —
            // conditionally adding/removing it causes React to re-mount
            // children when the transition ends, producing a visual flash.
            // The wrapper div is always present for DOM stability (prevents
            // React re-mounting children).  When not clipping, display:contents
            // makes it layout-transparent so the flex chain is preserved —
            // without this, the bare div breaks AdwLeafletPage's flex:1.
            const needsClip = modeTransition != null && !isVisibleChild;
            const clipStyle: React.CSSProperties = needsClip
              ? { [sizeProp]: modeTransition!.childNaturalSizes[i] ?? 0, flexShrink: 0 }
              : { display: "contents" };

            return (
              <div
                key={page.name ?? i}
                ref={setChildRef(i)}
                className="gtk-leaflet-page"
                style={pageStyle}
              >
                <div style={clipStyle}>
                  {page.element}
                </div>
              </div>
            );
          })}
        </div>
      </LeafletContext.Provider>
    );
  },
);
