import React, {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkOrientation } from "../types.ts";

export interface GtkPanedProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /**
   * Separator position in pixels from the start: the start child's size,
   * clamped to what the children's minimum sizes allow. Default: unset,
   * computed from the children's minimum sizes.
   */
  position?: number;
  /** Whether a wide (thick) handle is shown. Default: false. */
  wideHandle?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Start child resizes with pane. Default: true. */
  resizeStartChild?: boolean;
  /** End child resizes with pane. Default: true. */
  resizeEndChild?: boolean;
  /** Start child can be smaller than its minimum. Default: true. */
  shrinkStartChild?: boolean;
  /** End child can be smaller than its minimum. Default: true. */
  shrinkEndChild?: boolean;
  /** First child (left/top). */
  startChild?: ReactNode;
  /** Second child (right/bottom). */
  endChild?: ReactNode;
  /** Callback when separator position changes. */
  onPositionChanged?: (position: number) => void;
}

/** Keyboard steps of gtk_paned_move_handle(). */
const SINGLE_STEP_SIZE = 1;
const PAGE_STEP_SIZE = 75;

interface Allocation {
  /** The start child's size (GtkPaned:position). */
  position: number;
  min: number;
  max: number;
  /** The paned's size along its orientation. */
  size: number;
  rtl: boolean;
  /** A child allocated less than its minimum size, which it gets anyway. */
  startOverflow: boolean;
  endOverflow: boolean;
}

const hasChild = (node: ReactNode) =>
  node !== undefined && node !== null && typeof node !== "boolean" && node !== "";

/** A child's minimum size, margins included, like gtk_widget_measure(). */
function measureMinimum(child: Element, horizontal: boolean): number {
  if (!(child instanceof HTMLElement)) return 0;
  const prop = horizontal ? "width" : "height";
  const saved = child.style.getPropertyValue(prop);
  const savedPriority = child.style.getPropertyPriority(prop);
  child.style.setProperty(prop, "min-content", "important");
  const rect = child.getBoundingClientRect();
  const cs = getComputedStyle(child);
  const size = horizontal
    ? rect.width + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight)
    : rect.height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
  child.style.setProperty(prop, saved, savedPriority);
  return Math.ceil(size);
}

/**
 * Whether the paned is sized by its contents, so that its size follows the
 * position. A GtkPaned's allocation never does, so only a change from outside
 * moves the handle in gtk_paned_compute_position().
 */
function sizeFollowsPosition(paned: HTMLElement, horizontal: boolean): boolean {
  const client = () => (horizontal ? paned.clientWidth : paned.clientHeight);
  const before = client();
  const saved = paned.style.getPropertyValue("--gtk-paned-position");
  paned.style.setProperty("--gtk-paned-position", saved === "0px" ? "100px" : "0px");
  const probe = client();
  paned.style.setProperty("--gtk-paned-position", saved);
  return probe !== before;
}

/**
 * GtkPaned — A container with two children separated by a draggable handle.
 *
 * CSS node:
 *   paned[.horizontal|.vertical]
 *     ├── <start-child>
 *     ├── separator[.wide]
 *     └── <end-child>
 *
 * @see https://docs.gtk.org/gtk4/class.Paned.html
 */
export const GtkPaned = forwardRef<HTMLDivElement, GtkPanedProps>(function GtkPaned(props, ref) {
  const {
    position: controlledPosition,
    wideHandle = false,
    orientation = "horizontal",
    resizeStartChild = true,
    resizeEndChild = true,
    shrinkStartChild = true,
    shrinkEndChild = true,
    startChild,
    endChild,
    onPositionChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onKeyDown,
    ...rest
  } = props;
  const panedRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => panedRef.current as HTMLDivElement);

  // allocate() also runs from a ResizeObserver and the drag handlers.
  const options = {
    position: controlledPosition,
    horizontal: orientation === "horizontal",
    resizeStartChild,
    resizeEndChild,
    shrinkStartChild,
    shrinkEndChild,
    onPositionChanged,
  };
  const latest = useRef(options);
  latest.current = options;
  // GtkPaned's start_child_size, position_set and last_allocation.
  const gtk = useRef({ position: 0, positionSet: false, lastAllocation: -1 });
  const appliedPosition = useRef<number | undefined>(undefined);
  const notified = useRef<number | null>(null);
  const emitted = useRef<number | null>(null);
  const allocation = useRef<Allocation | null>(null);
  const [layout, setLayout] = useState<Allocation | null>(null);

  const isHoriz = orientation === "horizontal";
  const twoChildren = hasChild(startChild) && hasChild(endChild);

  /** gtk_paned_size_allocate() with gtk_paned_compute_position(). */
  const allocate = useCallback(() => {
    const p = latest.current;
    const paned = panedRef.current;
    const handle = handleRef.current;
    const start = handle?.previousElementSibling;
    const end = handle?.nextElementSibling;
    if (!paned || !handle || !start || !end) return;
    const g = gtk.current;
    if (p.position !== appliedPosition.current) {
      // Like gtk_paned_set_position(); a negative position unsets it.
      appliedPosition.current = p.position;
      if (p.position !== undefined) {
        g.positionSet = p.position >= 0;
        if (g.positionSet) notified.current = g.position = Math.round(p.position);
      }
    }

    const horizontal = p.horizontal;
    const cs = getComputedStyle(paned);
    const size = horizontal
      ? paned.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      : paned.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    // Not rendered (display: none): GTK doesn't allocate unmapped widgets.
    if (!paned.getClientRects().length) return;
    const handleRect = handle.getBoundingClientRect();
    const handleSize = Math.round(horizontal ? handleRect.width : handleRect.height);
    const startReq = measureMinimum(start, horizontal);
    const endReq = measureMinimum(end, horizontal);
    const resizeStart = p.resizeStartChild;
    const resizeEnd = p.resizeEndChild;
    const alloc = Math.max(1, size - handleSize);

    const min = p.shrinkStartChild ? 0 : startReq;
    let max = alloc;
    if (!p.shrinkEndChild) max = Math.max(1, max - endReq);
    max = Math.max(min, max);

    let pos: number;
    if (!g.positionSet) {
      if (resizeStart && !resizeEnd) pos = Math.max(0, alloc - endReq);
      else if (!resizeStart && resizeEnd) pos = startReq;
      else if (startReq + endReq !== 0)
        pos = Math.floor(alloc * (startReq / (startReq + endReq)) + 0.5);
      else pos = Math.floor(alloc * 0.5 + 0.5);
    } else if (
      g.lastAllocation > 0 &&
      alloc !== g.lastAllocation &&
      !sizeFollowsPosition(paned, horizontal)
    ) {
      if (resizeStart && !resizeEnd) pos = g.position + alloc - g.lastAllocation;
      else if (!resizeStart && resizeEnd) pos = g.position;
      else pos = Math.floor(alloc * (g.position / g.lastAllocation) + 0.5);
    } else {
      pos = g.position;
    }
    pos = Math.min(Math.max(pos, min), max);
    g.position = pos;
    g.lastAllocation = alloc;

    const next: Allocation = {
      position: pos,
      min,
      max,
      size,
      rtl: horizontal && cs.direction === "rtl",
      startOverflow: startReq > pos,
      endOverflow: endReq > size - pos - handleSize,
    };
    const prev = allocation.current;
    allocation.current = next;
    if (!prev || (Object.keys(next) as (keyof Allocation)[]).some((k) => next[k] !== prev[k])) {
      setLayout(next);
    }
    if (pos !== notified.current) {
      notified.current = pos;
      p.onPositionChanged?.(pos);
    }
  }, []);

  useLayoutEffect(() => allocate());

  useLayoutEffect(() => {
    const paned = panedRef.current;
    if (!paned || !twoChildren) return;
    const observer = new ResizeObserver(() => allocate());
    observer.observe(paned);
    return () => observer.disconnect();
  }, [allocate, twoChildren]);

  /** A drag or key moved the handle: gtk_paned_set_position(), clamped. */
  const moveTo = useCallback(
    (position: number) => {
      const a = allocation.current;
      if (!a) return;
      const pos = Math.min(Math.max(Math.round(position), a.min), a.max);
      if (latest.current.position !== undefined) {
        // Controlled: the owner applies it.
        if (pos !== a.position && pos !== emitted.current) {
          emitted.current = pos;
          latest.current.onPositionChanged?.(pos);
        }
      } else if (pos !== a.position) {
        gtk.current.position = pos;
        gtk.current.positionSet = true;
        allocate();
      }
    },
    [allocate],
  );

  // Like GtkGestureDrag in update_drag(): the handle keeps its offset from
  // the pointer, and follows it the other way in RTL.
  const drag = useRef<{ pointerId: number; from: number; position: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const a = allocation.current;
    if (e.button !== 0 || !a) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const horizontal = latest.current.horizontal;
    emitted.current = null;
    drag.current = {
      pointerId: e.pointerId,
      from: horizontal ? e.clientX : e.clientY,
      position: a.position,
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const a = allocation.current;
      if (!d || !a || e.pointerId !== d.pointerId) return;
      const horizontal = latest.current.horizontal;
      const offset = (horizontal ? e.clientX : e.clientY) - d.from;
      moveTo(d.position + (a.rtl ? -offset : offset));
    },
    [moveTo],
  );

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  // cycle-handle-focus (F8) saves the focus and the position, which
  // accept-position gives back the focus to, and cancel-position both.
  const saved = useRef<{ focus: Element | null; position: number } | null>(null);

  const restoreFocus = useCallback(() => {
    const focus = saved.current?.focus;
    saved.current = null;
    if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
    else handleRef.current?.blur();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      const handle = handleRef.current;
      const a = allocation.current;
      if (e.defaultPrevented || !handle || !a || e.altKey || e.metaKey) return;
      emitted.current = null;

      if (e.target !== handle) {
        // From inside a child, F8 and Shift+F8 focus the handle.
        if (e.key !== "F8" || e.ctrlKey) return;
        saved.current = { focus: document.activeElement, position: a.position };
        handle.focus();
      } else {
        // gtk_paned_move_handle()
        const step = e.ctrlKey ? PAGE_STEP_SIZE : SINGLE_STEP_SIZE;
        let increment = 0;
        switch (e.key) {
          case "ArrowLeft":
          case "ArrowUp":
            increment = -step;
            break;
          case "ArrowRight":
          case "ArrowDown":
            increment = step;
            break;
          case "PageUp":
            increment = -PAGE_STEP_SIZE;
            break;
          case "PageDown":
            increment = PAGE_STEP_SIZE;
            break;
          case "Home":
            moveTo(a.min);
            break;
          case "End":
            moveTo(a.max);
            break;
          case "Enter":
          case " ":
          case "F8":
            restoreFocus();
            break;
          case "Escape": {
            const original = saved.current?.position;
            if (original !== undefined) moveTo(original);
            restoreFocus();
            break;
          }
          case "Tab":
            // Accept, then let Tab move on from the saved focus.
            restoreFocus();
            return;
          default:
            return;
        }
        if (increment) moveTo(a.position + (a.rtl ? -increment : increment));
      }
      e.preventDefault();
      e.stopPropagation();
    },
    [onKeyDown, moveTo, restoreFocus],
  );

  const classes = ["gtk-paned", orientation];
  if (className) classes.push(className);

  const separatorClasses = ["gtk-separator"];
  if (wideHandle) separatorClasses.push("wide");

  const position =
    layout?.position ??
    (controlledPosition !== undefined && controlledPosition >= 0 ? controlledPosition : undefined);
  const panedStyle = {
    "--gtk-paned-position": twoChildren && position !== undefined ? `${position}px` : undefined,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={panedRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      data-start-overflow={twoChildren && layout?.startOverflow ? "" : undefined}
      data-end-overflow={twoChildren && layout?.endOverflow ? "" : undefined}
      style={panedStyle}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {hasChild(startChild) && startChild}
      {twoChildren && (
        // GtkPanedHandle: focused only by F8, never by Tab or a click.
        <div
          ref={handleRef}
          className={separatorClasses.join(" ")}
          role="separator"
          aria-orientation={isHoriz ? "vertical" : "horizontal"}
          aria-valuemin={0}
          aria-valuemax={layout?.size}
          aria-valuenow={position}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      )}
      {hasChild(endChild) && endChild}
    </div>
  );
});
