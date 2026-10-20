import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkOrientation,
  type GtkSelectionMode,
} from "../types.ts";

export interface GtkFlowBoxChildProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /**
   * Whether the child is insensitive (GtkWidget:sensitive = false): it can't
   * be focused, selected or activated. Default: false.
   */
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * GtkFlowBoxChild — A single child in a GtkFlowBox.
 *
 * CSS node: flowboxchild
 *
 * @see https://docs.gtk.org/gtk4/class.FlowBoxChild.html
 */
export const GtkFlowBoxChild = forwardRef<HTMLDivElement, GtkFlowBoxChildProps>(
  function GtkFlowBoxChild(
    { disabled = false, children, halign, valign, hexpand, vexpand, className, ...rest },
    ref,
  ) {
    const classes = ["gtk-flowboxchild", "gtk-bin-layout"];
    if (className) classes.push(className);

    // A child takes focus (gtk_flow_box_child_init()), one Tab stop each,
    // unless it's insensitive.
    return (
      <div
        ref={ref}
        role="gridcell"
        tabIndex={disabled ? undefined : 0}
        className={classes.join(" ")}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export interface GtkFlowBoxProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** All children get equal size. Default: false. */
  homogeneous?: boolean;
  /** Spacing between columns. Default: 0. */
  columnSpacing?: number;
  /** Spacing between rows. Default: 0. */
  rowSpacing?: number;
  /** Minimum children per line. Default: 0 (auto). */
  minChildrenPerLine?: number;
  /** Maximum children per line. Default: 7. */
  maxChildrenPerLine?: number;
  /** Selection behavior. Default: "single". */
  selectionMode?: GtkSelectionMode;
  /** Activate on single click instead of double. Default: true. */
  activateOnSingleClick?: boolean;
  /** Flow direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /**
   * Whether the flow box is insensitive (GtkWidget:sensitive = false): none
   * of its children can be focused, selected or activated. Default: false.
   */
  disabled?: boolean;
  /** Callback on child activation. */
  onChildActivated?: (index: number) => void;
  /** Callback when the selection changes, with the indices of the selected children. */
  onSelectedChildrenChanged?: (indices: number[]) => void;
  /**
   * Controlled selection: indices of the selected children. When set, the
   * flow box shows exactly these children as selected and only reports changes.
   */
  selectedChildren?: number[];
  children?: ReactNode;
}

/** A minimum and natural size, like GtkRequestedSize. */
export interface GtkRequestedSize {
  minimum: number;
  natural: number;
}

export interface FlowBoxLineOptions {
  /** Spacing between the children of a line. */
  spacing: number;
  homogeneous: boolean;
  minChildrenPerLine: number;
  maxChildrenPerLine: number;
}

/** `lineLength` aligned columns, each as large as the largest child in it. */
function alignedColumns(items: GtkRequestedSize[], lineLength: number): GtkRequestedSize[] {
  const columns = Array.from({ length: lineLength }, () => ({ minimum: 0, natural: 0 }));
  items.forEach((item, i) => {
    const column = columns[i % lineLength]!;
    column.minimum = Math.max(column.minimum, item.minimum);
    column.natural = Math.max(column.natural, item.natural);
  });
  return columns;
}

/** The size of a line of aligned columns (gather_aligned_item_requests()). */
function alignedLineSize(
  items: GtkRequestedSize[],
  lineLength: number,
  spacing: number,
): GtkRequestedSize {
  const columns = alignedColumns(items, lineLength);
  const gaps = (lineLength - 1) * spacing;
  return {
    minimum: columns.reduce((sum, c) => sum + c.minimum, gaps),
    natural: columns.reduce((sum, c) => sum + c.natural, gaps),
  };
}

/**
 * The flow box's size along its orientation, from its children's sizes along
 * it (gtk_flow_box_measure() for no particular size in the other direction).
 */
export function flowBoxMeasure(
  items: GtkRequestedSize[],
  vertical: boolean,
  { spacing, homogeneous, minChildrenPerLine, maxChildrenPerLine }: FlowBoxLineOptions,
): GtkRequestedSize {
  const minItems = Math.max(1, minChildrenPerLine);
  const natItems = Math.max(minItems, maxChildrenPerLine);
  const minItem = Math.max(0, ...items.map((item) => item.minimum));
  const natItem = Math.max(0, ...items.map((item) => item.natural));
  if (homogeneous) {
    return {
      minimum: minItem * minItems + (minItems - 1) * spacing,
      natural: natItem * natItems + (natItems - 1) * spacing,
    };
  }
  // A vertical flow box only asks for its tallest child's height.
  if (vertical && minItems === 1) return { minimum: minItem, natural: natItem };
  return {
    minimum: alignedLineSize(items, minItems, spacing).minimum,
    natural: alignedLineSize(items, natItems, spacing).natural,
  };
}

/**
 * How many children gtk_flow_box_size_allocate() puts on each line of
 * `available` pixels: as many as fit at the largest child's natural size,
 * then, unless homogeneous, more while the aligned columns still fit
 * (fit_aligned_item_requests()). `items` are the children's sizes along the
 * flow box's orientation.
 */
export function flowBoxLineLength(
  items: GtkRequestedSize[],
  available: number,
  { spacing, homogeneous, minChildrenPerLine, maxChildrenPerLine }: FlowBoxLineOptions,
): number {
  const minItems = Math.max(1, minChildrenPerLine);
  const natItem = Math.max(0, ...items.map((item) => item.natural));
  if (natItem <= 0) return Math.min(minItems, maxChildrenPerLine);

  let lineLength = Math.floor(available / (natItem + spacing));
  if (lineLength * spacing + (lineLength + 1) * natItem <= available) lineLength++;
  lineLength = Math.min(Math.max(minItems, lineLength), maxChildrenPerLine);
  if (homogeneous) return lineLength;

  let lineSize = alignedLineSize(items, lineLength, spacing).natural;
  for (let tryLength = lineLength + 1; lineSize < available; tryLength++) {
    if (tryLength > items.length) {
      // Past the last child, each column added is empty: only its spacing.
      const room = spacing > 0 ? Math.floor((available - lineSize) / spacing) : Infinity;
      return Math.min(lineLength + room, maxChildrenPerLine);
    }
    lineSize = alignedLineSize(items, tryLength, spacing).natural;
    if (lineSize > available || tryLength > maxChildrenPerLine) break;
    lineLength = tryLength;
  }
  return lineLength;
}

/**
 * gtk_distribute_natural_allocation(): grows the sizes from their minimum
 * towards their natural size, the ones with the least to go first, and
 * returns the space left.
 */
function distributeNaturalAllocation(extra: number, sizes: GtkRequestedSize[]): number {
  const gap = (i: number) => Math.max(sizes[i]!.natural - sizes[i]!.minimum, 0);
  const spreading = sizes.map((_, i) => i).sort((a, b) => gap(b) - gap(a) || b - a);
  for (let i = sizes.length - 1; extra > 0 && i >= 0; i--) {
    const glue = Math.floor((extra + i) / (i + 1));
    const size = sizes[spreading[i]!]!;
    const grow = Math.min(glue, size.natural - size.minimum);
    size.minimum += grow;
    extra -= grow;
  }
  return extra;
}

/**
 * The sizes gtk_flow_box_size_allocate() gives the columns (rows when
 * vertical) of children in `available` pixels: one per child on a line.
 */
export function flowBoxTracks(
  items: GtkRequestedSize[],
  available: number,
  options: FlowBoxLineOptions,
): number[] {
  const { spacing, homogeneous } = options;
  const lineLength = flowBoxLineLength(items, available, options);
  const rest = available - (lineLength - 1) * spacing;
  let sizes: number[];
  let extra: number;
  if (homogeneous) {
    const size = Math.max(0, Math.floor(rest / lineLength));
    sizes = Array.from({ length: lineLength }, () => size);
    extra = rest - size * lineLength;
  } else {
    const columns = alignedColumns(items, lineLength);
    extra = rest - columns.reduce((sum, c) => sum + c.minimum, 0);
    extra = extra > 0 ? distributeNaturalAllocation(extra, columns) : 0;
    sizes = columns.map((c) => c.minimum);
  }
  extra = Math.max(0, extra);
  return shareExtra(sizes, extra);
}

/**
 * What's left is shared equally, the first ones getting a pixel more: the
 * flow box fills its allocation (GTK_ALIGN_FILL).
 */
function shareExtra(sizes: number[], extra: number): number[] {
  const n = sizes.length;
  return sizes.map((size, i) => size + Math.floor(extra / n) + (i < extra % n ? 1 : 0));
}

/**
 * The size each line of `lineLength` children asks for across the lines: its
 * largest child's, or the largest child's of all when homogeneous.
 */
export function flowBoxLineSizes(
  items: GtkRequestedSize[],
  lineLength: number,
  homogeneous: boolean,
): GtkRequestedSize[] {
  const largest = (line: GtkRequestedSize[]) => ({
    minimum: Math.max(0, ...line.map((item) => item.minimum)),
    natural: Math.max(0, ...line.map((item) => item.natural)),
  });
  const all = largest(items);
  return Array.from({ length: Math.ceil(items.length / lineLength) }, (_, i) =>
    homogeneous ? { ...all } : largest(items.slice(i * lineLength, (i + 1) * lineLength)),
  );
}

/**
 * The sizes gtk_flow_box_size_allocate() gives the lines in `available`
 * pixels across them. Homogeneous lines all get the same size.
 */
export function flowBoxLines(
  lines: GtkRequestedSize[],
  available: number,
  spacing: number,
  homogeneous: boolean,
): number[] {
  const rest = available - (lines.length - 1) * spacing;
  if (homogeneous) {
    const size = Math.max(0, Math.floor(rest / lines.length));
    return lines.map(() => size);
  }
  const sizes = lines.map((line) => ({ ...line }));
  const extra = rest - sizes.reduce((sum, line) => sum + line.minimum, 0);
  return shareExtra(
    sizes.map((line) => line.minimum),
    extra > 0 ? distributeNaturalAllocation(extra, sizes) : 0,
  );
}

/** The sizes of lines side by side, with spacing between them. */
function lineSum(lines: GtkRequestedSize[], spacing: number): GtkRequestedSize {
  const gaps = Math.max(0, lines.length - 1) * spacing;
  return {
    minimum: lines.reduce((sum, line) => sum + line.minimum, gaps),
    natural: lines.reduce((sum, line) => sum + line.natural, gaps),
  };
}

/** The selected children, and the one Shift extends the selection from (`selected_child`). */
export interface FlowBoxSelection {
  selected: Set<number>;
  anchor: number | null;
}

/**
 * gtk_flow_box_update_selection(): what clicking `index` in double-click mode
 * (Ctrl as `modify`, Shift as `extend`), or moving the keyboard focus to it,
 * selects.
 */
export function updateSelection(
  mode: GtkSelectionMode,
  { selected, anchor }: FlowBoxSelection,
  index: number,
  modify: boolean,
  extend: boolean,
): FlowBoxSelection {
  if (mode === "none") return { selected, anchor };
  if (mode === "browse") return { selected: new Set([index]), anchor: index };
  if (mode === "single") {
    const select = modify ? !selected.has(index) : true;
    return { selected: new Set(select ? [index] : []), anchor: select ? index : null };
  }
  if (extend) {
    if (anchor === null) return { selected: new Set([index]), anchor: index };
    const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
    return { selected: new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i)), anchor };
  }
  if (modify) {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return { selected: next, anchor };
  }
  return { selected: new Set([index]), anchor: index };
}

/**
 * gtk_flow_box_select_child_internal(): what activating `index` selects. It
 * only ever adds to the selection.
 */
export function selectChild(
  mode: GtkSelectionMode,
  { selected, anchor }: FlowBoxSelection,
  index: number,
): FlowBoxSelection {
  if (selected.has(index) || mode === "none") return { selected, anchor };
  const next = new Set(mode === "multiple" ? selected : []);
  next.add(index);
  return { selected: next, anchor: index };
}

/** gtk_flow_box_unselect_child_internal() */
function unselectChild(
  mode: GtkSelectionMode,
  { selected, anchor }: FlowBoxSelection,
  index: number,
): FlowBoxSelection {
  if (!selected.has(index) || mode === "none") return { selected, anchor };
  const next = new Set(mode === "multiple" ? selected : []);
  next.delete(index);
  return { selected: next, anchor };
}

/** Like gtk_flow_box_select_child(): nothing in "none" mode, one child in "single"/"browse". */
function shownSelection(mode: GtkSelectionMode, indices: Iterable<number>): Set<number> {
  const all = [...indices];
  if (mode === "none") return new Set();
  return new Set(mode === "multiple" ? all : all.slice(-1));
}

/** An element's size along one axis, without (`inner`) or with its padding, border and margin. */
function boxSize(cs: CSSStyleDeclaration, vertical: boolean, inner = false): number {
  const [size, a, b] = vertical ? [cs.height, "top", "bottom"] : [cs.width, "left", "right"];
  const px = (property: string) => parseFloat(cs.getPropertyValue(property)) || 0;
  const frame =
    px(`padding-${a}`) + px(`padding-${b}`) + px(`border-${a}-width`) + px(`border-${b}-width`);
  const border = parseFloat(size) + (cs.boxSizing === "border-box" ? 0 : frame);
  return inner ? border - frame : border + px(`margin-${a}`) + px(`margin-${b}`);
}

/**
 * The children's minimum and natural widths, like gtk_widget_measure(): their
 * min-content and max-content widths; and when `heights`, their height at
 * their natural width.
 */
function measureChildren(
  children: HTMLElement[],
  heights: boolean,
): { width: GtkRequestedSize; height: GtkRequestedSize }[] {
  const measured = children.map((el) => ({
    el,
    cs: getComputedStyle(el),
    style: [el.style.width, el.style.height] as const,
    width: { minimum: 0, natural: 0 },
    height: { minimum: 0, natural: 0 },
  }));
  for (const { el } of measured) {
    el.style.width = "max-content";
    // Not stretched to the line's height.
    if (heights) el.style.height = "max-content";
  }
  for (const { cs, width, height } of measured) {
    width.natural = boxSize(cs, false);
    if (heights) height.natural = height.minimum = boxSize(cs, true);
  }
  for (const { el } of measured) el.style.width = "min-content";
  for (const { cs, width } of measured) width.minimum = boxSize(cs, false);
  for (const { el, style } of measured) [el.style.width, el.style.height] = style;
  // GTK sizes are whole pixels, rounded up from text extents.
  const px = ({ minimum, natural }: GtkRequestedSize) => ({
    minimum: Math.ceil(minimum - 0.01),
    natural: Math.ceil(natural - 0.01),
  });
  return measured.map(({ width, height }) => ({ width: px(width), height: px(height) }));
}

/** The flow box's flowboxchild elements, in order. */
function flowBoxChildren(box: HTMLElement): HTMLElement[] {
  return [...box.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.classList.contains("gtk-flowboxchild"),
  );
}

/**
 * Widgets that take the clicks on them (GtkButton, GtkText…, which claim their
 * gesture's sequence): the flow box doesn't get those.
 */
const INTERACTIVE =
  'button, input, textarea, select, a[href], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/**
 * GtkFlowBox — A reflowing grid of children.
 *
 * CSS node: flowbox.horizontal|.vertical
 *
 * Children that aren't GtkFlowBoxChild elements are put in one, like
 * gtk_flow_box_insert(). Like gtk_flow_box_size_allocate(), children are laid
 * out in aligned columns (rows when vertical), as many per line as fit.
 *
 * @see https://docs.gtk.org/gtk4/class.FlowBox.html
 */
export const GtkFlowBox = forwardRef<HTMLDivElement, GtkFlowBoxProps>(function GtkFlowBox(
  {
    homogeneous = false,
    columnSpacing = 0,
    rowSpacing = 0,
    minChildrenPerLine = 0,
    maxChildrenPerLine = 7,
    selectionMode = "single",
    activateOnSingleClick = true,
    orientation = "horizontal",
    disabled = false,
    onChildActivated,
    onSelectedChildrenChanged,
    selectedChildren,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    onMouseDown,
    onClick,
    onKeyDown,
    onFocus,
    ...rest
  },
  ref,
) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [internalSelected, setInternalSelected] = useState<Set<number>>(() => new Set());
  const anchorRef = useRef<number | null>(null);
  // The child the button was pressed on (`active_child`).
  const pressedRef = useRef<number | null>(null);
  const pointerFocusRef = useRef(false);
  const movingFocusRef = useRef(false);
  const lineLengthRef = useRef(1);
  const allocatedRef = useRef(new Map<string, string>());

  const vertical = orientation === "vertical";
  const selected = shownSelection(selectionMode, selectedChildren ?? internalSelected);

  const classes = ["gtk-flowbox", orientation];
  if (className) classes.push(className);

  // Lays the children out like gtk_flow_box_size_allocate(): layout.css puts
  // them in a grid of --gtk-flowbox-tracks columns (rows when vertical), in a
  // flow box sized like its request (gtk_flow_box_measure()). A vertical flow
  // box's lines are columns of --gtk-flowbox-lines.
  const allocate = () => {
    const box = boxRef.current;
    if (!box) return;
    const set = (vars: Record<string, string>) => {
      for (const [name, value] of Object.entries(vars)) {
        if (allocatedRef.current.get(name) === value) continue;
        allocatedRef.current.set(name, value);
        box.style.setProperty(name, value);
      }
    };
    const visible = flowBoxChildren(box).filter((el) => el.getClientRects().length > 0);
    const options = {
      spacing: vertical ? rowSpacing : columnSpacing,
      homogeneous,
      minChildrenPerLine,
      maxChildrenPerLine: Math.max(1, maxChildrenPerLine),
    };
    const sizes = measureChildren(visible, vertical);
    const items = sizes.map((size) => (vertical ? size.height : size.width));
    const { minimum, natural } = flowBoxMeasure(items, vertical, options);
    // The request doesn't depend on how the children are laid out now: set it
    // first, then lay them out in the size the flow box gets.
    set({
      "--gtk-flowbox-minimum-size": `${minimum}px`,
      "--gtk-flowbox-natural-size": `${natural}px`,
    });
    box.setAttribute("data-measured", "");
    const available = Math.floor(boxSize(getComputedStyle(box), vertical, true));
    // Not rendered (display: none): the ResizeObserver calls again when it is.
    if (!Number.isFinite(available)) return;
    const tracks = flowBoxTracks(items, available, options);
    lineLengthRef.current = tracks.length;
    set({ "--gtk-flowbox-tracks": tracks.map((size) => `${size}px`).join(" ") });
    if (!vertical) return;
    const lines = flowBoxLineSizes(
      sizes.map((size) => size.width),
      tracks.length,
      homogeneous,
    );
    const across = lineSum(lines, columnSpacing);
    set({
      "--gtk-flowbox-lines-minimum-size": `${across.minimum}px`,
      "--gtk-flowbox-lines-natural-size": `${across.natural}px`,
    });
    const width = Math.floor(boxSize(getComputedStyle(box), false, true));
    const columns = flowBoxLines(lines, width, columnSpacing, homogeneous);
    set({ "--gtk-flowbox-lines": columns.map((size) => `${size}px`).join(" ") });
  };
  const allocateRef = useRef(allocate);
  allocateRef.current = allocate;

  // Children can change on any render, the flow box's size with CSS alone,
  // and the children's natural sizes with their content or fonts loading.
  useLayoutEffect(() => allocateRef.current());
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const reallocate = () => allocateRef.current();
    const resizes = new ResizeObserver(reallocate);
    resizes.observe(box);
    const mutations = new MutationObserver(reallocate);
    mutations.observe(box, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["class"],
    });
    document.fonts?.addEventListener("loadingdone", reallocate);
    return () => {
      resizes.disconnect();
      mutations.disconnect();
      document.fonts?.removeEventListener("loadingdone", reallocate);
    };
  }, []);

  const commit = (next: FlowBoxSelection) => {
    anchorRef.current = next.anchor;
    const shown = shownSelection(selectionMode, next.selected);
    if (shown.size === selected.size && [...shown].every((i) => selected.has(i))) return;
    if (!selectedChildren) setInternalSelected(shown);
    onSelectedChildrenChanged?.([...shown].sort((a, b) => a - b));
  };
  const current = (): FlowBoxSelection => ({ selected, anchor: anchorRef.current });

  // gtk_flow_box_update_cursor(): the child takes the focus.
  const focusChild = (el: HTMLElement) => {
    if (document.activeElement === el) return;
    movingFocusRef.current = true;
    try {
      el.focus();
    } finally {
      movingFocusRef.current = false;
    }
  };

  // gtk_flow_box_select_and_activate()
  const selectAndActivate = (index: number, el: HTMLElement) => {
    commit(selectChild(selectionMode, current(), index));
    focusChild(el);
    onChildActivated?.(index);
  };

  /** The sensitive child `target` is in, unless a widget in it takes the click. */
  const clickedChild = (box: HTMLElement, target: EventTarget): number | null => {
    let node = target instanceof Element ? target : null;
    while (node && node.parentElement !== box) {
      if (node.matches(INTERACTIVE)) return null;
      node = node.parentElement;
    }
    if (!(node instanceof HTMLElement) || !node.classList.contains("gtk-flowboxchild")) return null;
    if (disabled || node.hasAttribute("data-disabled")) return null;
    return flowBoxChildren(box).indexOf(node);
  };

  // GtkFlowBox's click gesture: a press on a child starts a click
  // (gtk_flow_box_click_gesture_pressed()), and in double-click mode the
  // second press activates it.
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(e);
    // The press focuses the child; the selection only changes on release.
    pointerFocusRef.current = true;
    setTimeout(() => {
      pointerFocusRef.current = false;
    });
    if (e.button !== 0) return;
    const index = clickedChild(e.currentTarget, e.target);
    pressedRef.current = index;
    if (index !== null && e.detail === 2 && !activateOnSingleClick) onChildActivated?.(index);
  };

  // gtk_flow_box_click_gesture_released(): releasing on the pressed child
  // selects and activates it in single-click mode; in double-click mode it
  // updates the selection, Ctrl (or Cmd) toggling and Shift extending it.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    const box = e.currentTarget;
    const index = clickedChild(box, e.target);
    const pressed = pressedRef.current;
    pressedRef.current = null;
    if (e.button !== 0 || index === null || index !== pressed) return;
    const el = flowBoxChildren(box)[index]!;
    if (activateOnSingleClick) {
      selectAndActivate(index, el);
      return;
    }
    // Touch modifies the selection the way Ctrl does.
    const touch = (e.nativeEvent as PointerEvent).pointerType === "touch";
    const modify = (e.ctrlKey || e.metaKey) !== touch;
    focusChild(el);
    commit(updateSelection(selectionMode, current(), index, modify, e.shiftKey));
  };

  // Keyboard focus moving onto a child selects it (gtk_flow_box_child_focus()),
  // and focus coming from outside goes to the selected child (gtk_flow_box_focus()).
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    if (movingFocusRef.current || pointerFocusRef.current || disabled) return;
    const box = e.currentTarget;
    const kids = flowBoxChildren(box);
    const index = kids.findIndex((el) => el.contains(e.target));
    if (index < 0) return;
    const from = e.relatedTarget;
    if (!(from instanceof Node && box.contains(from))) {
      const anchor = anchorRef.current;
      const target = anchor !== null && selected.has(anchor) ? anchor : Math.min(...selected);
      const el = kids[target];
      if (el && target !== index && !el.hasAttribute("data-disabled")) {
        // Shift+Tab goes into the child's own widgets first.
        const backward =
          from instanceof Node &&
          box.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_FOLLOWING;
        const inner = backward
          ? [...el.querySelectorAll<HTMLElement>(INTERACTIVE)].filter(
              (w) => !w.matches(":disabled"),
            )
          : [];
        if (inner.length > 0) {
          inner[inner.length - 1]!.focus();
          return;
        }
        focusChild(el);
        commit(updateSelection(selectionMode, current(), target, false, false));
        return;
      }
    }
    if (e.target === kids[index]) {
      commit(updateSelection(selectionMode, current(), index, false, false));
    }
  };

  // gtk_flow_box_move_cursor(): the arrows move one child or one line, Home
  // and End to the first and last child, PageUp and PageDown about 100px. The
  // child moved to gets selected unless Ctrl is held; Shift extends the selection.
  const moveCursor = (
    box: HTMLElement,
    index: number,
    key: "positions" | "lines" | "ends" | "pages",
    count: number,
    extend: boolean,
    modify: boolean,
  ) => {
    const kids = flowBoxChildren(box);
    const shown = (i: number) => kids[i]!.getClientRects().length > 0;
    const focusable = (i: number) => shown(i) && !kids[i]!.hasAttribute("data-disabled");
    const next = (from: number, dir: number) => {
      for (let i = from + dir; i >= 0 && i < kids.length; i += dir) if (focusable(i)) return i;
      return null;
    };
    // gtk_flow_box_get_above_focusable() / _get_below_focusable(): a line
    // away, or more when the child there is insensitive.
    const lineAway = (from: number, dir: number) => {
      for (let i = from; ; ) {
        for (let n = 0; n < lineLengthRef.current; ) {
          i += dir;
          if (i < 0 || i >= kids.length) return null;
          if (shown(i)) n++;
        }
        if (!kids[i]!.hasAttribute("data-disabled")) return i;
      }
    };
    // Children flow down first in a vertical flow box.
    let step = key;
    if (vertical && key === "positions") step = "lines";
    if (vertical && key === "lines") step = "positions";

    let target: number | null = index;
    if (step === "positions") {
      const dir = getComputedStyle(box).direction === "rtl" ? -count : count;
      target = next(index, dir);
    } else if (step === "lines") {
      target = lineAway(index, count);
    } else if (step === "ends") {
      target = count < 0 ? next(-1, 1) : next(kids.length, -1);
    } else {
      const position = (i: number) => {
        const r = kids[i]!.getBoundingClientRect();
        return vertical ? r.left : r.top;
      };
      const start = position(index);
      for (let i = 0, j = next(index, count); j !== null; i++, j = next(j, count)) {
        if (i % lineLengthRef.current === 0) {
          const offset = position(j) - start;
          if (count < 0 ? offset < -100 : offset > 100) break;
        }
        target = j;
      }
    }
    // Nowhere to go: the key does nothing (gtk_widget_keynav_failed()).
    if (target === null || target === index) return;
    focusChild(kids[target]!);
    if (!modify) commit(updateSelection(selectionMode, current(), target, false, extend));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || disabled || e.altKey) return;
    const box = e.currentTarget;
    const kids = flowBoxChildren(box);
    const el = e.target as HTMLElement;
    const index = kids.indexOf(el);
    if (index < 0) return;
    const modify = e.ctrlKey || e.metaKey;
    if (e.key === " " && modify && !e.shiftKey) {
      // toggle-cursor-child (gtk_flow_box_toggle_cursor_child())
      e.preventDefault();
      if ((selectionMode === "single" || selectionMode === "multiple") && selected.has(index)) {
        commit(unselectChild(selectionMode, current(), index));
      } else {
        selectAndActivate(index, el);
      }
    } else if ((e.key === " " || e.key === "Enter") && !modify && !e.shiftKey) {
      // The child's activate signal, bound to Space and Enter by GtkWindow.
      e.preventDefault();
      selectAndActivate(index, el);
    } else if (e.key.toLowerCase() === "a" && modify) {
      // select-all (multiple mode only) and unselect-all (not in browse mode)
      e.preventDefault();
      if (!e.shiftKey && selectionMode === "multiple") {
        const all = kids.flatMap((kid, i) => (kid.getClientRects().length > 0 ? [i] : []));
        commit({ selected: new Set(all), anchor: anchorRef.current });
      } else if (e.shiftKey && selectionMode !== "browse") {
        commit({ selected: new Set(), anchor: anchorRef.current });
      }
    } else {
      const move = MOVE_BINDINGS[e.key];
      if (!move) return;
      e.preventDefault();
      moveCursor(box, index, move[0], move[1], e.shiftKey, modify);
    }
  };

  const setRef = (el: HTMLDivElement | null) => {
    boxRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <div
      ref={setRef}
      role="grid"
      className={classes.join(" ")}
      aria-multiselectable={selectionMode === "multiple" || undefined}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-homogeneous={homogeneous || undefined}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={{
        rowGap: rowSpacing > 0 ? rowSpacing : undefined,
        columnGap: columnSpacing > 0 ? columnSpacing : undefined,
        ...style,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      {...rest}
    >
      {Children.toArray(children).map((child, index) => {
        const element =
          React.isValidElement(child) && child.type === GtkFlowBoxChild ? (
            (child as ReactElement<GtkFlowBoxChildProps>)
          ) : (
            <GtkFlowBoxChild key={React.isValidElement(child) ? child.key : index}>
              {child}
            </GtkFlowBoxChild>
          );
        return React.cloneElement(element, {
          "aria-selected": selected.has(index),
          disabled: disabled || element.props.disabled,
        });
      })}
    </div>
  );
});

/** gtk_flow_box_add_move_binding() calls: key → movement step and count. */
const MOVE_BINDINGS: Record<string, ["positions" | "lines" | "ends" | "pages", number]> = {
  ArrowLeft: ["positions", -1],
  ArrowRight: ["positions", 1],
  ArrowUp: ["lines", -1],
  ArrowDown: ["lines", 1],
  Home: ["ends", -1],
  End: ["ends", 1],
  PageUp: ["pages", -1],
  PageDown: ["pages", 1],
};
