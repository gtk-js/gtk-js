/**
 * GtkCenterLayout's allocation, for the center layouts CSS can't place.
 *
 * Grid tracks lay out most center layouts (layout.css), but two cases depend
 * on sizes a track can't follow (gtk_center_layout_distribute()): an expanding
 * center child gets size - 2 × (max(start, end) + spacing), and with
 * shrink-center-last FALSE the side children grow to their natural size before
 * the center child does, each clamped by the other's minimum, so they can
 * overlap. Only those layouts are measured here: their children's minimum and
 * natural sizes are read with min-content and max-content tracks, GTK's
 * allocation is worked out from them, and the layout gets it as grid tracks and
 * lines in custom properties that layout.css applies.
 *
 * It runs before paint: from a layout effect after each render, when a child's
 * computed expand changes (expand.ts), and from a ResizeObserver when the
 * layout or a child changes size. It writes only when the allocation changes,
 * so its own writes don't make the observer loop.
 */

import { type RefObject, useLayoutEffect } from "react";

/** Dispatched at a center layout when a child's computed expand changes. */
export const CENTER_EXPAND_CHANGE = "gtk-center-expand-change";

const SLOTS = ["start", "center", "end"] as const;

interface Child {
  min: number;
  nat: number;
  expand: boolean;
}

interface Allocation {
  pos: number;
  size: number;
}

const clamp = (x: number, low: number, high: number) => (x > high ? high : x < low ? low : x);

/**
 * gtk_center_layout_distribute() and the positions of
 * gtk_center_layout_allocate(), along the layout's orientation.
 */
export function allocateCenter(
  size: number,
  spacing: number,
  children: readonly (Child | null)[],
  shrinkCenterLast: boolean,
): (Allocation | null)[] {
  const [start, center, end] = children;
  const neededSpacing = (children.filter(Boolean).length - 1) * spacing;
  const startMin = start?.min ?? 0;
  const endMin = end?.min ?? 0;
  let centerSize = 0;
  let startSize = 0;
  let endSize = 0;

  if (center) {
    const natural = shrinkCenterLast
      ? center.nat
      : clamp(size - neededSpacing - ((start?.nat ?? 0) + (end?.nat ?? 0)), center.min, center.nat);
    centerSize = clamp(size - neededSpacing - (startMin + endMin), center.min, natural);
  }
  if (start) startSize = clamp(size - neededSpacing - (centerSize + endMin), start.min, start.nat);
  if (end) endSize = clamp(size - neededSpacing - (centerSize + startMin), end.min, end.nat);

  if (center) {
    let centerPos = size / 2 - centerSize / 2;
    if (startSize > 0 && startSize + spacing > centerPos) centerPos = startSize + spacing;
    else if (endSize > 0 && size - endSize - spacing < centerPos + centerSize)
      centerPos = size - centerSize - endSize - spacing;
    else if (center.expand) {
      centerSize = size - 2 * (Math.max(startSize, endSize) + spacing);
      centerPos = size / 2 - centerSize / 2 + spacing;
    }
    if (start?.expand) startSize = centerPos - spacing;
    if (end?.expand) endSize = size - (centerPos + centerSize) - spacing;
  } else {
    const avail = size - neededSpacing - (startSize + endSize);
    if (start?.expand && end?.expand) {
      startSize += avail / 2;
      endSize += avail / 2;
    } else if (start?.expand) startSize += avail;
    else if (end?.expand) endSize += avail;
  }

  // gtk_center_layout_allocate(): the center child pushed in from the sides.
  let centerPos = size / 2 - centerSize / 2;
  if (startSize > 0 && startSize + spacing > centerPos) centerPos = startSize + spacing;
  else if (endSize > 0 && size - endSize - spacing < centerPos + centerSize)
    centerPos = size - centerSize - endSize - spacing;

  return [
    start ? { pos: 0, size: startSize } : null,
    center ? { pos: centerPos, size: centerSize } : null,
    end ? { pos: size - endSize, size: endSize } : null,
  ];
}

/**
 * The layout's grid lines at the children's edges, as tracks, and each child's
 * lines. The tracks reproduce the allocation at the current size, and still
 * make the layout's min-content GTK's minimum and its max-content GTK's natural
 * size (gtk_center_layout_measure_orientation()), so a layout sized by its
 * content keeps following it. Until the allocation catches up with a new size,
 * the room comes and goes from the space between children first, then from the
 * widest children, so the others keep their size.
 */
export function centerTracks(
  allocations: readonly (Allocation | null)[],
  minimum: number,
  natural: number,
): { tracks: string; lines: string[] } {
  // In the browser's layout units, so a size read back is the size written.
  const round = (x: number) => Math.round(Math.max(0, x) * 64) / 64;
  const edges = new Set([0]);
  for (const a of allocations) if (a) edges.add(round(a.pos)).add(round(a.pos + a.size));
  const lines = [...edges].sort((a, b) => a - b);
  const size = lines[lines.length - 1]!;
  const tracks = lines.slice(1).map((line, i) => {
    const from = lines[i]!;
    const covered = allocations.some((a) => a && a.pos < line && a.pos + a.size > from);
    return { width: line - from, low: line - from, high: line - from, covered };
  });
  const order = [...tracks].sort((a, b) => +a.covered - +b.covered || b.width - a.width);
  let slack = size - minimum;
  for (const track of order) {
    const take = Math.min(track.width, slack);
    track.low -= take;
    slack -= take;
  }
  order[0]!.low -= slack; // A minimum above the size: tracks at their minimum.
  order[0]!.high += Math.max(0, natural - size);
  const line = (x: number) => lines.indexOf(round(x)) + 1;
  return {
    tracks: tracks.map((t) => `minmax(${round(t.low)}px, ${round(t.high)}px)`).join(" "),
    lines: allocations.map((a) => (a ? `${line(a.pos)} / ${line(a.pos + a.size)}` : "-1")),
  };
}

/** The layout's start, center and end children: its slots, or its own children in order. */
function layoutChildren(box: HTMLElement): (HTMLElement | null)[] {
  const elements = [...box.children].filter((child) => !child.hasAttribute("hidden"));
  let next = 0;
  return SLOTS.map((slot) => {
    const element =
      elements.find((child) => child.classList.contains(`gtk-center-layout-${slot}`)) ??
      (box.hasAttribute(`data-${slot}`) ? elements[next++] : undefined);
    return element instanceof HTMLElement && box.hasAttribute(`data-${slot}`) ? element : null;
  });
}

interface Layout {
  observed: HTMLElement[];
  written?: string;
}

const layouts = new Map<HTMLElement, Layout>();
let observer: ResizeObserver | null = null;

function expandAttribute(box: HTMLElement) {
  return box.classList.contains("vertical") ? "data-computed-vexpand" : "data-computed-hexpand";
}

/** Whether GTK's allocation differs from what the CSS tracks can do. */
function needsAllocation(box: HTMLElement): boolean {
  if (box.dataset.shrinkCenterLast === "false") return true;
  const center = layoutChildren(box)[1];
  return !!center?.hasAttribute(expandAttribute(box));
}

/** Track sizes, read from the grid's resolved template. */
function readTracks(style: CSSStyleDeclaration, vertical: boolean): number[] {
  const template = vertical ? style.gridTemplateRows : style.gridTemplateColumns;
  return template.split(" ").map(parseFloat);
}

/**
 * Measures the layouts' children and writes their allocations. Reads and
 * writes are batched: the current sizes, then the minimum sizes, then the
 * natural sizes, then every write.
 */
function allocate(boxes: Iterable<HTMLElement>): void {
  const jobs = [...boxes].flatMap((box) => {
    const layout = layouts.get(box);
    if (!layout || !box.isConnected) return [];
    const vertical = box.classList.contains("vertical");
    const style = getComputedStyle(box);
    const size = parseFloat(vertical ? style.height : style.width);
    if (Number.isNaN(size)) return [];
    const spacing = parseFloat(
      style.getPropertyValue(vertical ? "--gtk-border-spacing-y" : "--gtk-border-spacing-x"),
    );
    const children = layoutChildren(box);
    return [{ box, vertical, style, size, spacing: spacing || 0, children, layout }];
  });
  if (!jobs.length) return;

  for (const job of jobs) job.box.setAttribute("data-measuring", "min");
  const mins = jobs.map((job) => readTracks(job.style, job.vertical));
  for (const job of jobs) job.box.setAttribute("data-measuring", "max");
  const nats = jobs.map((job) => readTracks(job.style, job.vertical));
  for (const job of jobs) job.box.removeAttribute("data-measuring");

  jobs.forEach((job, i) => {
    const measured = job.children.map(
      (element, slot): Child | null =>
        element && {
          // The children sit in tracks 1, 3 and 5 while measuring.
          min: mins[i]![slot * 2] ?? 0,
          nat: nats[i]![slot * 2] ?? 0,
          expand: element.hasAttribute(expandAttribute(job.box)),
        },
    );
    const present = measured.filter((child): child is Child => !!child);
    const spacing = (present.length - 1) * job.spacing;
    const minimum = present.reduce((sum, child) => sum + child.min, 0) + spacing;
    const [start, center, end] = measured;
    const natural =
      (center?.nat ?? 0) + 2 * Math.max(start?.nat ?? 0, end?.nat ?? 0) + Math.max(0, spacing);
    const allocations = allocateCenter(
      job.size,
      job.spacing,
      measured,
      job.box.dataset.shrinkCenterLast !== "false",
    );
    const { tracks, lines } = centerTracks(allocations, minimum, natural);
    const written = [tracks, ...lines].join(";");
    if (written === job.layout.written) return;
    job.layout.written = written;
    job.box.style.setProperty("--gtk-center-tracks", tracks);
    SLOTS.forEach((slot, s) => job.box.style.setProperty(`--gtk-center-${slot}`, lines[s]!));
    job.box.setAttribute("data-allocated", "");
  });
}

function onResize(entries: ResizeObserverEntry[]): void {
  const boxes = new Set<HTMLElement>();
  for (const { target } of entries) {
    // A layout, a layout's child, or both (a nested layout).
    for (const box of [target, target.parentElement]) {
      if (box instanceof HTMLElement && layouts.has(box)) boxes.add(box);
    }
  }
  allocate(boxes);
}

function release(box: HTMLElement): void {
  const layout = layouts.get(box);
  if (!layout) return;
  for (const element of [box, ...layout.observed]) observer?.unobserve(element);
  layouts.delete(box);
  box.removeAttribute("data-allocated");
  box.style.removeProperty("--gtk-center-tracks");
  for (const slot of SLOTS) box.style.removeProperty(`--gtk-center-${slot}`);
  if (!layouts.size) {
    observer?.disconnect();
    observer = null;
  }
}

/** Starts, updates or stops allocating the layout in JS, as it needs. */
function update(box: HTMLElement): void {
  if (!needsAllocation(box)) {
    release(box);
    return;
  }
  observer ??= new ResizeObserver(onResize);
  let layout = layouts.get(box);
  if (!layout) {
    layout = { observed: [] };
    layouts.set(box, layout);
    observer.observe(box);
  }
  // The children too: one that changes size changes the allocation.
  const children = layoutChildren(box).filter((child): child is HTMLElement => !!child);
  for (const element of layout.observed)
    if (!children.includes(element)) observer.unobserve(element);
  for (const element of children) if (!layout.observed.includes(element)) observer.observe(element);
  layout.observed = children;
  allocate([box]);
}

/**
 * Allocates a center layout like GtkCenterLayout when CSS can't: when its
 * center child expands, or with shrink-center-last FALSE
 * (`data-shrink-center-last="false"`). Other layouts are left to layout.css.
 */
export function useCenterLayout(ref: RefObject<HTMLElement | null>): void {
  // After every render: the children may have changed.
  useLayoutEffect(() => {
    if (ref.current) update(ref.current);
  });
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const onExpandChange = () => update(box);
    box.addEventListener(CENTER_EXPAND_CHANGE, onExpandChange);
    return () => {
      box.removeEventListener(CENTER_EXPAND_CHANGE, onExpandChange);
      release(box);
    };
  }, [ref]);
}
